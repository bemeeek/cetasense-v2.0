package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterFilterRoutes(r *mux.Router, h *handlers.FilterHandler) {
	r.HandleFunc("/api/filter", h.CreateFilter).Methods("POST")
	r.HandleFunc("/api/filter/{id}", h.GetFilterByID).Methods("GET")
	r.HandleFunc("/api/filter", h.GetAllFilter).Methods("GET")
	r.HandleFunc("/api/filter/{id}", h.UpdateFilter).Methods("PUT")
}
