package handlers

import (
	"encoding/json"
	"net/http"

	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
	"github.com/go-playground/validator/v10"
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

	// Validasi struct Data
	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Simpan data ke dalam database
	if err := h.repo.Create(r.Context(), &request); err != nil {
		http.Error(w, "Failed to create data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, request)
}

// GetAllData dengan DTO
func (h *DataHandler) GetAllData(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get data: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, data)
}
