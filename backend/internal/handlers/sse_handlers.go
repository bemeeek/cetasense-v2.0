package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

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
		vars := mux.Vars(r)
		jobID := vars["job_id"]
		if jobID == "" {
			http.Error(w, "job_id is required", http.StatusBadRequest)
			return
		}
		channel := fmt.Sprintf("lok_notify:%s", jobID)

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}

		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		sub := rdb.Subscribe(ctx, channel)
		defer sub.Close()
		if _, err := sub.Receive(ctx); err != nil {
			log.Printf("❌ failed to subscribe %s: %v", channel, err)
			http.Error(w, "failed to subscribe", http.StatusInternalServerError)
			return
		}

		// send “connected” event
		connected := SSEMessage{
			JobID:     jobID,
			Status:    "connected",
			Timestamp: time.Now().Format(time.RFC3339),
		}
		if d, err := json.Marshal(connected); err == nil {
			fmt.Fprintf(w, "data: %s\n\n", d)
			flusher.Flush()
		}

		// kirim cached status bila ada
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
		}

		// Menerima pesan dari Redis
		ch := sub.Channel()
		for {
			select {
			case m, ok := <-ch:
				if !ok {
					return
				}
				// Parsing payload JSON untuk mendapatkan status dan job_id
				var messageData map[string]interface{}
				json.Unmarshal([]byte(m.Payload), &messageData)

				status := messageData["status"].(string)
				jobID := messageData["job_id"].(string) // Asumsi job_id ada di setiap pesan

				// Cek untuk membedakan pesan berdasarkan job_id atau status
				if status == "running" {
					log.Printf("Received 'running' message for job %s", jobID)
					// Gabungkan metrics untuk "running" menjadi satu
				}

				if status == "done" {
					log.Printf("Received 'done' message for job %s", jobID)
				}

				// Kirim pesan ke klien
				fmt.Fprintf(w, "data: %s\n\n", m.Payload)
				flusher.Flush()

				// Jika status "done", kita catat metrik untuk "done"
				if status == "done" {
					// Hitung total waktu pemrosesan sekali (hanya untuk 'done'), dari awal penerimaan
					return
				}
			case <-ctx.Done():
				return
			}
		}

	}
}
