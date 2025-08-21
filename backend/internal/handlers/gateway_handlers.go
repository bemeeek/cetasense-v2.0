package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"cetasense-v2.0/config"
	"cetasense-v2.0/internal/rabbit"
	"cetasense-v2.0/middleware"
	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

type LocalizeRequest struct {
	IDData    string `json:"id_data"`
	IDMetode  string `json:"id_metode"`
	IDRuangan string `json:"id_ruangan"`
}

type LocalizeResponse struct {
	IDData    string `json:"id_data"`
	IDMetode  string `json:"id_metode"`
	IDRuangan string `json:"id_ruangan"`
}

func NewLocalizeHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req LocalizeRequest
		reqID := r.Context().Value(middleware.ReqIDKey).(string)
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}
		jobID := uuid.New().String()
		conn, ch, err := rabbit.NewChannel(cfg)
		if err != nil {
			http.Error(w, "Failed to connect to RabbitMQ: "+err.Error(), http.StatusInternalServerError)
			return
		}
		fmt.Println("Connected to RabbitMQ for localization job")
		defer func() {
			if err := conn.Close(); err != nil {
				fmt.Println("Failed to close RabbitMQ connection:", err)
			}
			if err := ch.Close(); err != nil {
				fmt.Println("Failed to close RabbitMQ channel:", err)
			}
		}()

		body, _ := json.Marshal(map[string]interface{}{
			"req_id":     reqID,
			"job_id":     jobID,
			"id_data":    req.IDData,
			"id_metode":  req.IDMetode,
			"id_ruangan": req.IDRuangan,
		})

		err = ch.PublishWithContext(r.Context(), "", "lok_requests", false, false,
			amqp.Publishing{
				ContentType: "application/json",
				Body:        body,
			})
		fmt.Println("Published message to RabbitMQ for localization job:", string(body))
		if err != nil {
			http.Error(w, "Failed to publish message to RabbitMQ: "+err.Error(), http.StatusInternalServerError)
			return
		}
		jsonResponse := map[string]string{
			"message": "Localization job started successfully",
			"job_id":  jobID,
			"status":  "queued",
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(jsonResponse); err != nil {
			http.Error(w, "Failed to encode response: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}
}
