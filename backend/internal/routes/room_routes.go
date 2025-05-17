package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterRoomRoutes(r *mux.Router, h *handlers.RoomHandler) {
	r.HandleFunc("/api/ruangan", h.CreateRoom).Methods("POST")
	r.HandleFunc("/api/ruangan/{id}", h.GetRoomByID).Methods("GET")
	r.HandleFunc("/api/ruangan", h.GetAllRooms).Methods("GET")
	r.HandleFunc("/api/ruangan/{id}", h.UpdateRoom).Methods("PUT")
	r.HandleFunc("/api/ruangan/{id}", h.DeleteRoom).Methods("DELETE")
}
