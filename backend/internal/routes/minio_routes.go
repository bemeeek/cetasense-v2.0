package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterMinioRoutes(r *mux.Router, h *handlers.MinioHandler) {
	r.HandleFunc("/api/minio/upload", h.Upload).Methods("POST")
}
