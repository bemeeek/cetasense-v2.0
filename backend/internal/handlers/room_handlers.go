package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"

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

func (h *RoomHandler) Authenticate(w http.ResponseWriter, r *http.Request) bool {
	tokenString := r.Header.Get("Authorization")
	if tokenString == "" {
		http.Error(w, "Authorization header is missing", http.StatusUnauthorized)
		return false
	}

	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte("your-secret-key"), nil
	})

	if err != nil {
		http.Error(w, "Invalid token: "+err.Error(), http.StatusUnauthorized)
		return false
	}

	if !token.Valid {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		return false
	}

	// Check if the token is expired
	if exp, ok := claims["exp"].(float64); ok {
		if int64(exp) < time.Now().Unix() {
			http.Error(w, "Token expired", http.StatusUnauthorized)
			return false
		}
	}

	return true
}

// CreateRoom dengan DTO
func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var request models.Ruangan
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()
	metrics.Step(reqID, "CREATE_ROOM_INIT", float64(time.Since(t0).Nanoseconds())/1e6)
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "CREATE_ROOM_DECODE", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "CREATE_ROOM_VALIDATE", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
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
	metrics.Step(reqID, "CREATE_ROOM_INIT", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
	if err := h.repo.Create(r.Context(), &room); err != nil {
		http.Error(w, "Failed to create room: "+err.Error(), http.StatusInternalServerError)
		return
	}
	metrics.Step(reqID, "CREATE_ROOM_SAVE", float64(time.Since(t0).Nanoseconds())/1e6)

	respondJSON(w, http.StatusCreated, room)
}

// UpdateRoom dengan DTO
func (h *RoomHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()
	vars := mux.Vars(r)
	id := vars["id"]

	var request models.UpdateRuanganRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "UPDATE_ROOM_DECODE", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	metrics.Step(reqID, "UPDATE_ROOM_VALIDATE", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
	room := models.Ruangan{
		ID:          id, // ID diambil dari URL
		NamaRuangan: request.NamaRuangan,
		Panjang:     request.Panjang,
		Lebar:       request.Lebar,
		Posisi_X_TX: request.Posisi_X_TX,
		Posisi_Y_TX: request.Posisi_Y_TX,
		Posisi_X_RX: request.Posisi_X_RX,
		Posisi_Y_RX: request.Posisi_Y_RX,
	}
	metrics.Step(reqID, "UPDATE_ROOM_INIT", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
	if err := h.repo.Update(r.Context(), &room); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		http.Error(w, "Failed to update room: "+err.Error(), http.StatusInternalServerError)
		return
	}
	metrics.Step(reqID, "UPDATE_ROOM_SAVE", float64(time.Since(t0).Nanoseconds())/1e6)

	respondJSON(w, http.StatusOK, room)
}

func (h *RoomHandler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	vars := mux.Vars(r)
	id := vars["id"]
	t0 := time.Now()

	metrics.Step(reqID, "DELETE_ROOM_INIT", float64(time.Since(t0).Nanoseconds())/1e6)
	if err := h.repo.Delete(r.Context(), id); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		http.Error(w, "Failed to delete room: "+err.Error(), http.StatusInternalServerError)
		return
	}
	metrics.Step(reqID, "DELETE_ROOM", float64(time.Since(t0).Nanoseconds())/1e6)

	w.WriteHeader(http.StatusNoContent)
}
func (h *RoomHandler) GetAllRooms(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()
	rooms, err := h.repo.GetAll(r.Context())
	if err != nil {
		http.Error(w, "Failed to get rooms: "+err.Error(), http.StatusInternalServerError)
		return
	}
	metrics.Step(reqID, "GET_ALL_ROOMS", float64(time.Since(t0).Nanoseconds())/1e6)

	respondJSON(w, http.StatusOK, rooms)
}

func (h *RoomHandler) GetRoomByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	room, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		http.Error(w, "Failed to get room: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, room)
}
