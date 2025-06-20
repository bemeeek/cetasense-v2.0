package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/mux"
)

func LocalizationHandler(rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		vars := mux.Vars(r)
		JobID := vars["job_id"]
		if JobID == "" {
			http.Error(w, "Job ID is required", http.StatusBadRequest)
			return
		}
		channelName := "lok_notify:" + JobID
		if channelName == "	" {
			http.Error(w, "Channel name is required", http.StatusBadRequest)
			return
		}
		fmt.Println("Listening to channel:", channelName)

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		sub := rdb.Subscribe(ctx, channelName)
		if _, err := sub.Receive(ctx); err != nil {
			http.Error(w, "Failed to subscribe to channel: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer sub.Close()

		go func() {
			<-r.Context().Done()
			fmt.Println("Client disconnected, stopping subscription")
			// Hentikan subscription jika client terputus
			cancel()
		}()

		ch := sub.Channel()
		for msg := range ch {
			payload := msg.Payload
			if payload == "" {
				fmt.Println("Received empty message, skipping")
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", payload)
			if fl, ok := w.(http.Flusher); ok {
				fl.Flush()
			}
			fmt.Println("Received message:", payload)
			// jika sudah done, stop
			if strings.Contains(payload, `"status":"done"`) {
				return
			}
			// jika sudah error, stop
			if strings.Contains(payload, `"status":"error"`) {
				fmt.Println("Received error message, stopping subscription")
				return
			}
		}
	}
}
