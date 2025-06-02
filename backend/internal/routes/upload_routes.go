package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterUploadRoutes(r *mux.Router, h *handlers.UploadHandler) {
	r.HandleFunc("/api/upload", h.HandleUpload).Methods("POST")
}
