package middleware

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"cetasense-v2.0/cache"
)

func CacheMiddleware(c *cache.Client, ttl time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// skip SSE / non-GET
			if strings.HasPrefix(r.Header.Get("Accept"), "text/event-stream") ||
				r.Method != http.MethodGet {
				next.ServeHTTP(w, r)
				return
			}

			key := fmt.Sprintf("cache:%s:%s", r.Method, r.URL.RequestURI())
			if blob, err := c.Get(r.Context(), key); err == nil && len(blob) > 0 {
				// cache hit: kita tahu ini JSON, tapi jika header Content-Type
				// asli tersimpan di cache, boleh restore juga.
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(blob)
				return
			}

			// cache miss: tangkap response
			buf := &bytes.Buffer{}
			rw := &captureWriter{
				header: make(http.Header),
				buf:    buf,
				code:   http.StatusOK,
			}

			next.ServeHTTP(rw, r)

			// restore header & status
			for k, vv := range rw.header {
				for _, v := range vv {
					w.Header().Add(k, v)
				}
			}
			w.Header().Set("X-Cache", "MISS")
			w.WriteHeader(rw.code)

			// kirim ke client & simpan
			body := buf.Bytes()
			w.Write(body)
			c.Set(context.Background(), key, body, ttl)
		})
	}
}

// captureWriter: ganti ResponseWriter asli
type captureWriter struct {
	header http.Header
	buf    *bytes.Buffer
	code   int
}

func (c *captureWriter) Header() http.Header {
	return c.header
}

func (c *captureWriter) WriteHeader(status int) {
	c.code = status
}

func (c *captureWriter) Write(b []byte) (int, error) {
	c.buf.Write(b)
	return len(b), nil
}
