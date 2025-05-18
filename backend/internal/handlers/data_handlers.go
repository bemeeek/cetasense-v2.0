package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"
)

type DataHandler struct {
	repo     repositories.DataRepository
	validate *validator.Validate
}

func NewDataHandler(repo repositories.DataRepository) *DataHandler {
	return &DataHandler{
		repo:     repo,
		validate: validator.New(),
	}
}

// CreateData dengan DTO
func (h *DataHandler) CreateData(w http.ResponseWriter, r *http.Request) {
	var request models.Data
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	request.GenerateID()

	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.repo.Create(r.Context(), &request); err != nil {
		http.Error(w, "Failed to create data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, request)
}

// UpdateData dengan DTO
func (h *DataHandler) UpdateData(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var request models.Data
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validasi input
	if err := h.validate.Struct(request); err != nil {
		respondError(w, http.StatusBadRequest, "Validation error: "+err.Error())
		return
	}

	// Pastikan ID dari URL digunakan
	data := models.Data{
		ID:        id,
		Amplitude: request.Amplitude,
		Phase:     request.Phase,
		RSSI:      request.RSSI,
		BatchID:   request.BatchID,
		RuanganID: request.RuanganID,
		FilterID:  request.FilterID,
		Timestamp: request.Timestamp,
	}

	if err := h.repo.Update(r.Context(), &data); err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusNotFound, "Data not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to update data: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, data)
}
