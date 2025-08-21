package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"
)

type RoomHandler struct {
	repo     repositories.RuanganRepository
	validate *validator.Validate
}

func NewRoomHandler(repo repositories.RuanganRepository) *RoomHandler {
	return &RoomHandler{
		repo:     repo,
		validate: validator.New(),
	}
}

func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var request models.Ruangan
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	// Validate request payload
	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	// Process request and generate room data
	room := models.Ruangan{
		NamaRuangan: request.NamaRuangan,
		Panjang:     request.Panjang,
		Lebar:       request.Lebar,
		Posisi_X_TX: request.Posisi_X_TX,
		Posisi_Y_TX: request.Posisi_Y_TX,
		Posisi_X_RX: request.Posisi_X_RX,
		Posisi_Y_RX: request.Posisi_Y_RX,
	}
	room.GenerateID()
	// Save room to repository
	if err := h.repo.Create(r.Context(), &room); err != nil {
		http.Error(w, "Failed to create room: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// Log total processing time
	respondJSON(w, http.StatusCreated, room)
}

func (h *RoomHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {

	// Get room ID from URL parameters
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}
	// Decode JSON body
	var request models.UpdateRuanganRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	// Validate request
	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	// Prepare room model
	room := models.Ruangan{
		ID:          id,
		NamaRuangan: request.NamaRuangan,
		Panjang:     request.Panjang,
		Lebar:       request.Lebar,
		Posisi_X_TX: request.Posisi_X_TX,
		Posisi_Y_TX: request.Posisi_Y_TX,
		Posisi_X_RX: request.Posisi_X_RX,
		Posisi_Y_RX: request.Posisi_Y_RX,
	}

	// Update room in the repository
	if err := h.repo.Update(r.Context(), &room); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		http.Error(w, "Failed to update room: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Log total update time
	respondJSON(w, http.StatusOK, room)
}

func (h *RoomHandler) GetAllRooms(w http.ResponseWriter, r *http.Request) {
	// Get all rooms from the repository
	rooms, err := h.repo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to retrieve rooms: "+err.Error())
		return
	}
	// Respond with the list of rooms
	respondJSON(w, http.StatusOK, rooms)
}

func (h *RoomHandler) GetRoomByID(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)

	// Get room ID from URL parameters
	roomID := mux.Vars(r)["id"]
	if roomID == "" {
		log.Printf("Room ID is required, reqID: %s", reqID)
		respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}
	// Fetch room by ID
	room, err := h.repo.GetByID(r.Context(), roomID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Room not found, reqID: %s, roomID: %s", reqID, roomID)
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		log.Printf("Error retrieving room, reqID: %s, roomID: %s, error: %v", reqID, roomID, err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve room: "+err.Error())
		return
	}

	// Respond with room details
	respondJSON(w, http.StatusOK, room)
}

func (h *RoomHandler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	// Validation phase: get room ID from URL params
	roomID := mux.Vars(r)["id"]
	if roomID == "" {
		respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}
	// Database deletion phase
	if err := h.repo.Delete(r.Context(), roomID); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to delete room: "+err.Error())
		return
	}
	// Final response phase
	respondJSON(w, http.StatusNoContent, nil)
}
