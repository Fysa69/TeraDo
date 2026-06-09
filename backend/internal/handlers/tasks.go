package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/nisa/teradodo/backend/internal/middleware"
	"github.com/nisa/teradodo/backend/internal/models"
)

// TaskHandler serves CRUD endpoints for tasks. Visibility is restricted to a user's
// own workspace: tasks they created or tasks assigned to them.
type TaskHandler struct {
	DB *sql.DB
}

const dateLayout = "2006-01-02"

type taskRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	DueDate     *string `json:"due_date"`
	AssignedTo  *int64  `json:"assigned_to"`
	Completed   *bool   `json:"completed"`
}

const taskSelect = `
	SELECT
		t.id, t.title, t.description, t.due_date, t.completed,
		t.created_by, creator.name,
		t.assigned_to, assignee.name,
		t.created_at
	FROM tasks t
	JOIN users creator ON creator.id = t.created_by
	LEFT JOIN users assignee ON assignee.id = t.assigned_to
`

func scanTask(row interface{ Scan(...interface{}) error }) (models.Task, error) {
	var t models.Task
	var assignedToName sql.NullString
	err := row.Scan(
		&t.ID, &t.Title, &t.Description, &t.DueDate, &t.Completed,
		&t.CreatedBy, &t.CreatedByName,
		&t.AssignedTo, &assignedToName,
		&t.CreatedAt,
	)
	if assignedToName.Valid {
		name := assignedToName.String
		t.AssignedToName = &name
	}
	return t, err
}

// List returns tasks visible to the authenticated user (created by or assigned to them),
// optionally filtered by status (today/upcoming/completed), assignee, and a title search term.
func (h *TaskHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	query := taskSelect + ` WHERE (t.created_by = $1 OR t.assigned_to = $1)`
	args := []interface{}{userID}

	switch r.URL.Query().Get("filter") {
	case "today":
		query += ` AND t.completed = FALSE AND t.due_date::date = CURRENT_DATE`
	case "upcoming":
		query += ` AND t.completed = FALSE AND t.due_date::date > CURRENT_DATE`
	case "completed":
		query += ` AND t.completed = TRUE`
	}

	if assignedTo := r.URL.Query().Get("assigned_to"); assignedTo != "" {
		id, err := strconv.ParseInt(assignedTo, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "assigned_to must be a number")
			return
		}
		args = append(args, id)
		query += ` AND t.assigned_to = $` + strconv.Itoa(len(args))
	}

	if search := strings.TrimSpace(r.URL.Query().Get("search")); search != "" {
		args = append(args, "%"+search+"%")
		query += ` AND t.title ILIKE $` + strconv.Itoa(len(args))
	}

	query += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tasks")
		return
	}
	defer rows.Close()

	tasks := []models.Task{}
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read tasks")
			return
		}
		tasks = append(tasks, task)
	}

	writeJSON(w, http.StatusOK, tasks)
}

// Create adds a new task owned by the authenticated user, optionally assigned to another user.
func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	var req taskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	dueDate, err := parseOptionalDate(req.DueDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "due_date must be in YYYY-MM-DD format")
		return
	}

	if req.AssignedTo != nil {
		if exists, err := h.userExists(*req.AssignedTo); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to validate assignee")
			return
		} else if !exists {
			writeError(w, http.StatusBadRequest, "assigned_to must reference an existing user")
			return
		}
	}

	var id int64
	err = h.DB.QueryRow(
		`INSERT INTO tasks (title, description, due_date, created_by, assigned_to)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		req.Title, req.Description, dueDate, userID, req.AssignedTo,
	).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create task")
		return
	}

	h.respondWithTask(w, id)
}

// Update applies a partial update to a task. Only the creator or the assignee may modify it.
func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	taskID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid task id")
		return
	}

	existing, err := h.loadAuthorizedTask(taskID, userID)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "task not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load task")
		return
	}

	var req taskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	title := existing.Title
	if strings.TrimSpace(req.Title) != "" {
		title = strings.TrimSpace(req.Title)
	}

	description := existing.Description
	if req.Description != "" {
		description = req.Description
	}

	dueDate := existing.DueDate
	if req.DueDate != nil {
		parsed, err := parseOptionalDate(req.DueDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, "due_date must be in YYYY-MM-DD format")
			return
		}
		dueDate = parsed
	}

	completed := existing.Completed
	if req.Completed != nil {
		completed = *req.Completed
	}

	assignedTo := existing.AssignedTo
	if req.AssignedTo != nil {
		if *req.AssignedTo == 0 {
			assignedTo = nil
		} else {
			if exists, err := h.userExists(*req.AssignedTo); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to validate assignee")
				return
			} else if !exists {
				writeError(w, http.StatusBadRequest, "assigned_to must reference an existing user")
				return
			}
			assignedTo = req.AssignedTo
		}
	}

	_, err = h.DB.Exec(
		`UPDATE tasks SET title = $1, description = $2, due_date = $3, completed = $4, assigned_to = $5
		 WHERE id = $6`,
		title, description, dueDate, completed, assignedTo, taskID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update task")
		return
	}

	h.respondWithTask(w, taskID)
}

// Delete removes a task. Only its creator may delete it.
func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.UserIDFromContext(r.Context())

	taskID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid task id")
		return
	}

	result, err := h.DB.Exec(`DELETE FROM tasks WHERE id = $1 AND created_by = $2`, taskID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete task")
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// loadAuthorizedTask fetches a task only if the user created it or is assigned to it.
func (h *TaskHandler) loadAuthorizedTask(taskID, userID int64) (models.Task, error) {
	row := h.DB.QueryRow(taskSelect+` WHERE t.id = $1 AND (t.created_by = $2 OR t.assigned_to = $2)`, taskID, userID)
	return scanTask(row)
}

func (h *TaskHandler) respondWithTask(w http.ResponseWriter, taskID int64) {
	row := h.DB.QueryRow(taskSelect+` WHERE t.id = $1`, taskID)
	task, err := scanTask(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load task")
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func (h *TaskHandler) userExists(id int64) (bool, error) {
	var exists bool
	err := h.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, id).Scan(&exists)
	return exists, err
}

func parseOptionalDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse(dateLayout, strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
