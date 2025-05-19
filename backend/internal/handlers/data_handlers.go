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

	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	ruanganID, err := h.repo.GetIDByNamaRuangan(r.Context(), request.NamaRuangan)
	if err != nil {
		http.Error(w, "Failed to get Ruangan ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	filterID, err := h.repo.GetIDByNamaFilter(r.Context(), request.NamaFilter)
	if err != nil {
		http.Error(w, "Failed to get Filter ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	request.RuanganID = ruanganID
	request.FilterID = filterID

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
