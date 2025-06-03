package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterBatchRoutes(r *mux.Router, h *handlers.BatchHandler) {
	r.HandleFunc("/api/batches", h.GetAllBatches).Methods("GET")
}
