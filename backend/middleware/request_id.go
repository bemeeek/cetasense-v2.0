package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// key type untuk context agar tidak bentrok
type ctxKey string

// ReqIDKey adalah key untuk menyimpan request ID di context
const ReqIDKey ctxKey = "reqID"

// RequestID middleware menghasilkan UUID baru untuk setiap request,
// menyimpannya di Context, dan men‐set header X-Request-Id.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// generate new request ID
		reqID := uuid.NewString()

		// inject ke context
		ctx := context.WithValue(r.Context(), ReqIDKey, reqID)
		r = r.WithContext(ctx)

		// expose X-Request-Id header
		w.Header().Set("X-Request-Id", reqID)

		// lanjut ke handler selanjutnya
		next.ServeHTTP(w, r)
	})
}
