package middleware

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"

	"cetasense-v2.0/internal/metrics"
)

// ttfbWriter wraps http.ResponseWriter to capture the time to first byte (TTFB)
// and status code of the response.
type ttfbWriter struct {
	http.ResponseWriter
	once   sync.Once
	start  time.Time
	reqID  string
	method string
	route  string
	status int
	ttfbMs float64
}

// WriteHeader captures the status code and records TTFB when the first header is written.
func (w *ttfbWriter) WriteHeader(code int) {
	w.status = code
	w.once.Do(func() {
		// calculate TTFB in milliseconds with decimal precision
		dur := time.Since(w.start)
		w.ttfbMs = float64(dur.Nanoseconds()) / 1e6

		// expose Server-Timing header for browser Resource Timing API
		w.Header().Add("Access-Control-Expose-Headers", "Server-Timing, X-Request-Id")
		w.Header().Set("Server-Timing", fmt.Sprintf("app;dur=%.2f", w.ttfbMs))

		// optional console log for first-byte event
		log.Printf("%s - first_byte - %s %s - reqID=%s - status=%d - ttfb=%.2fms",
			metrics.Now(), w.method, w.route, w.reqID, w.status, w.ttfbMs,
		)
	})
	w.ResponseWriter.WriteHeader(code)
}

// Write ensures WriteHeader is called if handler writes body without explicit header.
func (w *ttfbWriter) Write(b []byte) (int, error) {
	// if WriteHeader hasn't been called yet, default to 200 OK
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}

// TTFB is middleware that wraps the response to measure server-side TTFB and TTLB.
func TTFB(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.Header.Get("Accept"), "text/event-stream") ||
			strings.HasPrefix(r.URL.Path, "/api/localize/stream/") {
			next.ServeHTTP(w, r)
			return
		}
		start := time.Now()
		reqID, _ := r.Context().Value(ReqIDKey).(string)

		// determine route template or fallback to path
		path, err := mux.CurrentRoute(r).GetPathTemplate()
		if err != nil || path == "" {
			path = r.URL.Path
		}

		// wrap writer to capture TTFB
		tw := &ttfbWriter{
			ResponseWriter: w,
			start:          start,
			reqID:          reqID,
			method:         r.Method,
			route:          path,
		}

		// proceed with next handler
		next.ServeHTTP(tw, r)

		// calculate TTLB (total time to last byte)
		dur := time.Since(start)
		ttlbMs := float64(dur.Nanoseconds()) / 1e6

		// log final metrics: timestamp, reqID, method, route, status, ttfb_ms, ttlb_ms
		metrics.Logger.Printf("%s,%s,%s,%s,%d,%.2f,%.2f",
			metrics.Now(), reqID, tw.method, tw.route,
			tw.status, tw.ttfbMs, ttlbMs,
		)
	})
}
