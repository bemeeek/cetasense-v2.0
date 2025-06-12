package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterDataRoutes(r *mux.Router, h *handlers.DataHandler) {
	r.HandleFunc("/api/data", h.CreateData).Methods("POST")
	r.HandleFunc("/api/data", h.GetAllData).Methods("GET")
}

func RegisterHeatmapRoutes(r *mux.Router, h *handlers.HeatmapHandler) {
	r.HandleFunc("/api/heatmap", h.ListCSV).Methods("GET")
	r.HandleFunc("/api/heatmap/{id}", h.GetHeatmap).Methods("GET")
}
