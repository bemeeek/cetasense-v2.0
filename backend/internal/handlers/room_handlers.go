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
	var req models.CreateRuanganRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		respondError(w, http.StatusBadRequest, "Validation error: "+err.Error())
		return
	}

	room := models.Ruangan{
		NamaRuangan: req.NamaRuangan,
		Panjang:     req.Panjang,
		Lebar:       req.Lebar,
		Mode:        req.Mode,

		Posisi_X_TX: req.Posisi_X_TX,
		Posisi_Y_TX: req.Posisi_Y_TX,
		Posisi_X_RX: req.Posisi_X_RX,
		Posisi_Y_RX: req.Posisi_Y_RX,
	}

	if req.Mode == "anchor" {
		room.Posisi_X_TX, room.Posisi_Y_TX, room.Posisi_X_RX, room.Posisi_Y_RX = 0, 0, 0, 0
		room.SetAnchors(req.Anchors)
	}

	room.GenerateID()

	if err := h.repo.Create(r.Context(), &room); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create room: "+err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, room)
}

func (h *RoomHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}

	var req models.UpdateRuanganRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		respondError(w, http.StatusBadRequest, "Validation error: "+err.Error())
		return
	}

	room := models.Ruangan{
		ID:          id,
		NamaRuangan: req.NamaRuangan,
		Panjang:     req.Panjang,
		Lebar:       req.Lebar,
		Mode:        req.Mode,

		Posisi_X_TX: req.Posisi_X_TX,
		Posisi_Y_TX: req.Posisi_Y_TX,
		Posisi_X_RX: req.Posisi_X_RX,
		Posisi_Y_RX: req.Posisi_Y_RX,
	}

	if req.Mode == "anchor" {
		room.Posisi_X_TX, room.Posisi_Y_TX, room.Posisi_X_RX, room.Posisi_Y_RX = 0, 0, 0, 0
		room.SetAnchors(req.Anchors)
	}

	if err := h.repo.Update(r.Context(), &room); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to update room: "+err.Error())
		return
	}

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
