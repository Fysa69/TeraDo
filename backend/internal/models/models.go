package models

import "time"

// User represents an account in the system. PasswordHash is never serialized to JSON.
type User struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

// Task represents a unit of work that can be assigned between users.
type Task struct {
	ID          int64      `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	DueDate     *time.Time `json:"due_date"`
	Completed   bool       `json:"completed"`
	CreatedBy   int64      `json:"created_by"`
	CreatedByName string   `json:"created_by_name,omitempty"`
	AssignedTo  *int64     `json:"assigned_to"`
	AssignedToName *string `json:"assigned_to_name,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}
