package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/nisa/teradodo/backend/internal/auth"
)

type contextKey string

// UserIDKey is the context key under which the authenticated user's ID is stored.
const UserIDKey contextKey = "userID"

// Auth verifies the Bearer JWT on incoming requests and attaches the user ID to the
// request context. Requests without a valid token are rejected with 401.
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				http.Error(w, `{"error":"missing or invalid authorization header"}`, http.StatusUnauthorized)
				return
			}

			claims, err := auth.ParseToken(secret, strings.TrimSpace(parts[1]))
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext extracts the authenticated user ID set by Auth.
func UserIDFromContext(ctx context.Context) (int64, bool) {
	id, ok := ctx.Value(UserIDKey).(int64)
	return id, ok
}
