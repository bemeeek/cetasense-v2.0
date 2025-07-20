package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"cetasense-v2.0/internal/metrics"
	"cetasense-v2.0/middleware"
	"github.com/go-redis/redis/v8"
	"github.com/gorilla/mux"
)

type SSEMessage struct {
	JobID     string   `json:"job_id"`
	Status    string   `json:"status"`
	Timestamp string   `json:"timestamp"`
	HasilX    *float64 `json:"hasil_x,omitempty"`
	HasilY    *float64 `json:"hasil_y,omitempty"`
	Error     *string  `json:"error,omitempty"`
}

func LocalizationHandler(rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Context().Value(middleware.ReqIDKey).(string)
		t0 := time.Now()
		vars := mux.Vars(r)
		jobID := vars["job_id"]
		if jobID == "" {
			http.Error(w, "job_id is required", http.StatusBadRequest)
			return
		}
		channel := fmt.Sprintf("lok_notify:%s", jobID)
		metrics.Step(reqID, "SSE_LOCALIZATION_START", float64(time.Since(t0).Nanoseconds())/1e6)

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		t0 = time.Now()
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}
		metrics.Step(reqID, "SSE_LOCALIZATION_HEADERS", float64(time.Since(t0).Nanoseconds())/1e6)

		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		t0 = time.Now()
		sub := rdb.Subscribe(ctx, channel)
		defer sub.Close()
		if _, err := sub.Receive(ctx); err != nil {
			log.Printf("❌ failed to subscribe %s: %v", channel, err)
			http.Error(w, "failed to subscribe", http.StatusInternalServerError)
			return
		}
		metrics.Step(reqID, "SSE_LOCALIZATION_SUBSCRIBE", float64(time.Since(t0).Nanoseconds())/1e6)

		t0 = time.Now()
		// send “connected” event
		connected := SSEMessage{
			JobID:     jobID,
			Status:    "connected",
			Timestamp: time.Now().Format(time.RFC3339),
		}
		metrics.Step(reqID, "SSE_LOCALIZATION_CONNECTED", float64(time.Since(t0).Nanoseconds())/1e6)
		if d, err := json.Marshal(connected); err == nil {
			fmt.Fprintf(w, "data: %s\n\n", d)
			flusher.Flush()
		}
		metrics.Step(reqID, "SSE_LOCALIZATION_CONNECTED_DONE", float64(time.Since(t0).Nanoseconds())/1e6)

		// kirim cached status bila ada
		t0 = time.Now()
		cacheKey := fmt.Sprintf("lok_status:%s", jobID)
		if cached, err := rdb.HGetAll(ctx, cacheKey).Result(); err == nil && len(cached) > 0 {
			msg := SSEMessage{JobID: jobID, Status: cached["status"], Timestamp: cached["updated_at"]}
			if v, ok := cached["hasil_x"]; ok {
				var x float64
				fmt.Sscanf(v, "%f", &x)
				msg.HasilX = &x
			}
			if v, ok := cached["hasil_y"]; ok {
				var y float64
				fmt.Sscanf(v, "%f", &y)
				msg.HasilY = &y
			}
			if d, err := json.Marshal(msg); err == nil {
				fmt.Fprintf(w, "data: %s\n\n", d)
				flusher.Flush()
				if msg.Status == "done" || msg.Status == "failed" {
					return
				}
			}
			metrics.Step(reqID, "SSE_LOCALIZATION_CACHE", float64(time.Since(t0).Nanoseconds())/1e6)
		}

		ch := sub.Channel()
		t0 = time.Now()
		for {
			select {
			case m, ok := <-ch:
				if !ok {
					return
				}
				// Waktu ketika message diterima dari Redis
				redisReceiveTime := time.Now()
				metrics.Step(reqID, "SSE_REDIS_MESSAGE_RECEIVED", float64(time.Since(t0).Nanoseconds())/1e6)

				// Parsing message untuk mendapatkan info
				var messageData map[string]interface{}
				json.Unmarshal([]byte(m.Payload), &messageData)

				// Waktu mulai send ke client
				clientSendStart := time.Now()
				fmt.Fprintf(w, "data: %s\n\n", m.Payload)
				flusher.Flush()

				// Log waktu send ke client
				clientSendTime := float64(time.Since(clientSendStart).Nanoseconds()) / 1e6
				metrics.Step(reqID, "SSE_CLIENT_SEND", clientSendTime)

				// Log total processing time (Redis receive + Client send)
				totalProcessTime := float64(time.Since(redisReceiveTime).Nanoseconds()) / 1e6
				metrics.Step(reqID, "SSE_TOTAL_MESSAGE_PROCESS", totalProcessTime)

				// Log dengan job_id jika ada
				if jobID, ok := messageData["job_id"].(string); ok {
					log.Printf("SSE message processed for job %s in %.2fms", jobID, totalProcessTime)
				}

				if strings.Contains(m.Payload, `"status":"done"`) || strings.Contains(m.Payload, `"status":"failed"`) {
					return
				}
			case <-ctx.Done():
				metrics.Step(reqID, "SSE_LOCALIZATION_DONE", float64(time.Since(t0).Nanoseconds())/1e6)
				return
			}
		}
	}
}
