package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"cetasense-v2.0/internal/metrics"
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
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	totalStart := time.Now()

	// Decode JSON payload
	decodeStart := time.Now()
	var request models.Ruangan
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("Invalid request payload, reqID: %s, error: %v", reqID, err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "CREATE_ROOM_DECODE", float64(time.Since(decodeStart).Milliseconds()))

	// Validate request payload
	validateStart := time.Now()
	if err := h.validate.Struct(request); err != nil {
		log.Printf("Validation error, reqID: %s, error: %v", reqID, err)
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "CREATE_ROOM_VALIDATE", float64(time.Since(validateStart).Milliseconds()))

	// Process request and generate room data
	processStart := time.Now()
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
	metrics.Step(reqID, "CREATE_ROOM_PROCESS", float64(time.Since(processStart).Milliseconds()))

	// Save room to repository
	saveStart := time.Now()
	if err := h.repo.Create(r.Context(), &room); err != nil {
		log.Printf("Database insert error, reqID: %s, error: %v", reqID, err)
		http.Error(w, "Failed to create room: "+err.Error(), http.StatusInternalServerError)
		return
	}
	metrics.Step(reqID, "CREATE_ROOM_SAVE", float64(time.Since(saveStart).Milliseconds()))

	// Log total processing time
	metrics.Step(reqID, "CREATE_ROOM_TOTAL", float64(time.Since(totalStart).Milliseconds()))
	respondJSON(w, http.StatusCreated, room)
}

func (h *RoomHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	totalStart := time.Now()

	// Get room ID from URL parameters
	idStart := time.Now()
	vars := mux.Vars(r)
	id := vars["id"]
	metrics.Step(reqID, "UPDATE_ROOM_GET_ID", float64(time.Since(idStart).Milliseconds()))
	if id == "" {
		log.Printf("Room ID is required, reqID: %s", reqID)
		respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}

	// Decode JSON body
	decodeStart := time.Now()
	var request models.UpdateRuanganRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("Invalid request payload, reqID: %s, error: %v", reqID, err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "UPDATE_ROOM_DECODE", float64(time.Since(decodeStart).Milliseconds()))

	// Validate request
	validateStart := time.Now()
	if err := h.validate.Struct(request); err != nil {
		log.Printf("Validation error, reqID: %s, error: %v", reqID, err)
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "UPDATE_ROOM_VALIDATE", float64(time.Since(validateStart).Milliseconds()))

	// Prepare room model
	processStart := time.Now()
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
	metrics.Step(reqID, "UPDATE_ROOM_PROCESS", float64(time.Since(processStart).Milliseconds()))

	// Update room in the repository
	saveStart := time.Now()
	if err := h.repo.Update(r.Context(), &room); err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Room not found, reqID: %s, roomID: %s", reqID, id)
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		log.Printf("Database update error, reqID: %s, error: %v", reqID, err)
		http.Error(w, "Failed to update room: "+err.Error(), http.StatusInternalServerError)
		return
	}
	metrics.Step(reqID, "UPDATE_ROOM_SAVE", float64(time.Since(saveStart).Milliseconds()))

	// Log total update time
	metrics.Step(reqID, "UPDATE_ROOM_TOTAL", float64(time.Since(totalStart).Milliseconds()))
	respondJSON(w, http.StatusOK, room)
}

func (h *RoomHandler) GetAllRooms(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()

	// Get all rooms from the repository
	rooms, err := h.repo.GetAll(r.Context())
	if err != nil {
		log.Printf("Error retrieving rooms, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve rooms: "+err.Error())
		return
	}
	metrics.Step(reqID, "GET_ALL_ROOMS_FETCH", float64(time.Since(t0).Nanoseconds())/1e6)

	// Respond with the list of rooms
	respondJSON(w, http.StatusOK, rooms)
	metrics.Step(reqID, "GET_ALL_ROOMS_DONE", float64(time.Since(t0).Nanoseconds())/1e6)
}

func (h *RoomHandler) GetRoomByID(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()

	// Get room ID from URL parameters
	roomID := mux.Vars(r)["id"]
	if roomID == "" {
		log.Printf("Room ID is required, reqID: %s", reqID)
		respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}
	metrics.Step(reqID, "GET_ROOM_BY_ID_VALIDATE", float64(time.Since(t0).Nanoseconds())/1e6)

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
	metrics.Step(reqID, "GET_ROOM_BY_ID_FETCH", float64(time.Since(t0).Nanoseconds())/1e6)

	// Respond with room details
	respondJSON(w, http.StatusOK, room)
	metrics.Step(reqID, "GET_ROOM_BY_ID_DONE", float64(time.Since(t0).Nanoseconds())/1e6)
}

func (h *RoomHandler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)

	// Initialization metric (start timer and log duration immediately)
	initStart := time.Now()
	metrics.Step(reqID, "DELETE_ROOM_INIT", float64(time.Since(initStart).Nanoseconds())/1e6)

	// Validation phase: get room ID from URL params
	validateStart := time.Now()
	roomID := mux.Vars(r)["id"]
	if roomID == "" {
		log.Printf("Room ID is required, reqID: %s", reqID)
		respondError(w, http.StatusBadRequest, "Room ID is required")
		return
	}
	metrics.Step(reqID, "DELETE_ROOM_VALIDATE", float64(time.Since(validateStart).Nanoseconds())/1e6)

	// Database deletion phase
	dbDeleteStart := time.Now()
	if err := h.repo.Delete(r.Context(), roomID); err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Room not found for deletion, reqID: %s, roomID: %s", reqID, roomID)
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		log.Printf("Error deleting room, reqID: %s, roomID: %s, error: %v", reqID, roomID, err)
		respondError(w, http.StatusInternalServerError, "Failed to delete room: "+err.Error())
		return
	}
	metrics.Step(reqID, "DELETE_ROOM_DB_DELETE", float64(time.Since(dbDeleteStart).Nanoseconds())/1e6)

	// Final response phase
	responseStart := time.Now()
	respondJSON(w, http.StatusNoContent, nil)
	metrics.Step(reqID, "DELETE_ROOM_DONE", float64(time.Since(responseStart).Nanoseconds())/1e6)
}
