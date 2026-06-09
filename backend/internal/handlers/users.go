package handlers

import (
	"database/sql"
	"net/http"

	"github.com/nisa/teradodo/backend/internal/models"
)

// UserHandler serves user-listing endpoints used for task assignment.
type UserHandler struct {
	DB *sql.DB
}

// List returns all users (id, name, email) for populating assignment dropdowns.
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`SELECT id, name, email, created_at FROM users ORDER BY name ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read users")
			return
		}
		users = append(users, u)
	}

	writeJSON(w, http.StatusOK, users)
}
