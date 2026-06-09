package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// Connect opens a connection pool to PostgreSQL and waits for it to become reachable.
// Local Docker setups commonly start the API before Postgres finishes initializing,
// so we retry briefly instead of failing on the first attempt.
func Connect(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	var pingErr error
	for attempt := 0; attempt < 10; attempt++ {
		if pingErr = db.Ping(); pingErr == nil {
			return db, nil
		}
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("database not reachable: %w", pingErr)
}
