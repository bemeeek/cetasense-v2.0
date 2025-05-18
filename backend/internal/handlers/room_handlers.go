package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"

	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
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
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	room := models.Ruangan{
		NamaRuangan: request.NamaRuangan,
		Panjang:     request.Panjang,
		Lebar:       request.Lebar,
		PosisiTX:    request.PosisiTX,
		PosisiRX:    request.PosisiRX,
	}
	room.GenerateID()

	if err := h.repo.Create(r.Context(), &room); err != nil {
		http.Error(w, "Failed to create room: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, room)
}

// UpdateRoom dengan DTO
func (h *RoomHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var request models.UpdateRuanganRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	room := models.Ruangan{
		ID:          id, // ID diambil dari URL
		NamaRuangan: request.NamaRuangan,
		Panjang:     request.Panjang,
		Lebar:       request.Lebar,
		PosisiTX:    request.PosisiTX,
		PosisiRX:    request.PosisiRX,
	}

	if err := h.repo.Update(r.Context(), &room); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		http.Error(w, "Failed to update room: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, room)
}

func (h *RoomHandler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := h.repo.Delete(r.Context(), id); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Room not found")
			return
		}
		http.Error(w, "Failed to delete room: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
func (h *RoomHandler) GetAllRooms(w http.ResponseWriter, r *http.Request) {
	rooms, err := h.repo.GetAll(r.Context())
	if err != nil {
		http.Error(w, "Failed to get rooms: "+err.Error(), http.StatusInternalServerError)
		return
	}

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
