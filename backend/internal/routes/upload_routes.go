package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

// RegisterUploadRoutes sets up the route for CSV uploads
func RegisterUploadRoutes(r *mux.Router, uploadHandler *handlers.UploadHandler) {
	// Endpoint to upload a CSV file
	r.HandleFunc("/api/upload", uploadHandler.HandleUpload).Methods("POST")
	r.HandleFunc("/api/uploads", uploadHandler.GetAllUploads).Methods("GET")
	r.HandleFunc("/api/uploads/{id}", uploadHandler.DeleteUpload).Methods("DELETE")
	r.HandleFunc("/api/uploads/{id}", uploadHandler.UpdateName).Methods("PUT")
}
