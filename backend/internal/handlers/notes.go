package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/nisa/teradodo/backend/internal/middleware"
	"github.com/nisa/teradodo/backend/internal/models"
)

// NoteHandler serves CRUD endpoints for notes. Each user can only access their own notes.
type NoteHandler struct {
	DB *sql.DB
}

type noteRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// Create inserts a new note owned by the authenticated user.
func (h *NoteHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var req noteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	var note models.Note
	err := h.DB.QueryRow(
		`INSERT INTO notes (title, content, created_by)
		 VALUES ($1, $2, $3)
		 RETURNING id, title, content, created_by, created_at, updated_at`,
		strings.TrimSpace(req.Title), req.Content, userID,
	).Scan(&note.ID, &note.Title, &note.Content, &note.CreatedBy, &note.CreatedAt, &note.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create note")
		return
	}

	writeJSON(w, http.StatusCreated, note)
}

// List returns all notes belonging to the authenticated user, newest first.
func (h *NoteHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	rows, err := h.DB.Query(
		`SELECT id, title, content, created_by, created_at, updated_at
		 FROM notes WHERE created_by = $1 ORDER BY updated_at DESC`,
		userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch notes")
		return
	}
	defer rows.Close()

	notes := []models.Note{}
	for rows.Next() {
		var n models.Note
		if err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.CreatedBy, &n.CreatedAt, &n.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read notes")
			return
		}
		notes = append(notes, n)
	}

	writeJSON(w, http.StatusOK, notes)
}

// Delete removes a note by ID. Only its owner may delete it.
func (h *NoteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	noteID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid note id")
		return
	}

	result, err := h.DB.Exec(`DELETE FROM notes WHERE id = $1 AND created_by = $2`, noteID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete note")
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "note not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
