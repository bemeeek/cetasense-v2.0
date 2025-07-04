package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterDataRoutes(r *mux.Router, h *handlers.DataHandler) {
	r.HandleFunc("/api/data", h.CreateData).Methods("POST")
	r.HandleFunc("/api/data", h.GetAllData).Methods("GET")
}

func RegisterPlotRoutes(r *mux.Router, h *handlers.PlotHandler) {
	r.HandleFunc("/api/plots", h.ListCSV).Methods("GET")
	r.HandleFunc("/api/plots/{id}", h.GetPlots).Methods("GET")
}
