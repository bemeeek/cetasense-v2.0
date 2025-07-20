package middleware

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"cetasense-v2.0/cache"
	"github.com/go-redis/redis/v8"
)

// CacheMiddleware handles GET request caching using Redis.
func CacheMiddleware(c *cache.Client, ttl time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Bypass Server-Sent Events
			if strings.HasPrefix(r.Header.Get("Accept"), "text/event-stream") {
				next.ServeHTTP(w, r)
				return
			}
			// Only cache GET requests
			if r.Method != http.MethodGet {
				next.ServeHTTP(w, r)

				// Invalidate cache for write operations under /api/
				const pattern = "cache:GET:/api/*"
				if keys, err := c.Keys(r.Context(), pattern); err == nil {
					for _, key := range keys {
						if err := c.Del(r.Context(), key); err != nil {
							log.Printf("[Cache] DEL error for %s: %v", key, err)
						}
					}
				} else {
					log.Printf("[Cache] KEYS error for pattern %s: %v", pattern, err)
				}
				return
			}

			// Generate cache key
			key := fmt.Sprintf("cache:GET:%s", r.URL.RequestURI())
			log.Printf("[Cache] ▶ GET %s", key)

			// Attempt to retrieve from Redis
			blob, err := c.Get(r.Context(), key)
			if err != nil {
				if err != redis.Nil {
					log.Printf("[Cache] GET error for %s: %v", key, err)
				}
			}
			if err == nil && len(blob) > 0 {
				log.Printf("[Cache] HIT %s (len=%d)", key, len(blob))
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Cache", "HIT")
				w.Write(blob)
				return
			}

			// Cache MISS: capture handler response
			log.Printf("[Cache] MISS %s", key)
			buf := &bytes.Buffer{}
			rw := &captureWriter{
				header: make(http.Header),
				buf:    buf,
				code:   http.StatusOK,
			}
			next.ServeHTTP(rw, r)

			// Restore headers from handler
			for k, vv := range rw.header {
				for _, v := range vv {
					w.Header().Add(k, v)
				}
			}
			// Mark as MISS
			w.Header().Set("X-Cache", "MISS")
			w.WriteHeader(rw.code)

			// Write body and cache it
			body := buf.Bytes()
			if _, err := w.Write(body); err != nil {
				log.Printf("[Cache] Response write error for %s: %v", key, err)
			}

			// Store in Redis
			log.Printf("[Cache] Storing %s (status=%d, bytes=%d)", key, rw.code, len(body))
			if err := c.Set(context.Background(), key, body, ttl); err != nil {
				log.Printf("[Cache] SET error for %s: %v", key, err)
			}
		})
	}
}

// TimingMiddleware exposes timing headers for TTFB
func TimingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Timing-Allow-Origin", "*")
		w.Header().Add("Access-Control-Expose-Headers", "X-Request-Id, Timing-Allow-Origin")
		next.ServeHTTP(w, r)
	})
}

// captureWriter wraps http.ResponseWriter to capture output
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
	return c.buf.Write(b)
}
