package middleware

import (
	"log"
	"net/http"
	"strings"
	"time"

	"cetasense-v2.0/internal/metrics"
	"github.com/gorilla/mux"
)

func Now() string {
	return time.Now().Format("2006-01-02 15:04:05.000")
}

func LogEvent(reqID, event, detail string) {
	log.Printf("%s - %s - %s - reqID=%s",
		Now(), event, detail, reqID,
	)
}

// LoggingMiddleware mencatat START & END ke console & metrics.csv
func LoggingJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.Header.Get("Accept"), "text/event-stream") ||
			strings.HasPrefix(r.URL.Path, "/api/localize/stream/") {
			next.ServeHTTP(w, r)
			return
		}
		// 1) Ambil reqID (dari RequestID middleware)
		reqID, _ := r.Context().Value(ReqIDKey).(string)

		// 2) Tentukan method & route (coba template dulu, fallback ke Path)
		method := r.Method
		route, err := mux.CurrentRoute(r).GetPathTemplate()
		if err != nil || route == "" {
			route = r.URL.Path
		}

		// --- START event (tidak ada durasi) ---
		metrics.LogMetricJSON(reqID, "START", method, route, 0, 0.0, 0.0)

		// wrap writer utk status code
		lrw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// measure TTLB
		start := time.Now()
		next.ServeHTTP(lrw, r)
		dur := time.Since(start)
		ttlbMs := float64(dur.Nanoseconds()) / 1e6

		// --- END event (TTLB + status) ---
		metrics.LogMetricJSON(
			reqID,
			"END",
			method,
			route,
			lrw.statusCode,
			0.0, // TTFB sudah di‐log terpisah
			ttlbMs,
		)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
