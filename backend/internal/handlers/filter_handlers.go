package handlers

import (
	"encoding/json"
	"net/http"

	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"
)

type FilterHandler struct {
	repo     repositories.FilterRepository
	validate *validator.Validate
}

func NewFilterHandler(repo repositories.FilterRepository) *FilterHandler {
	return &FilterHandler{
		repo:     repo,
		validate: validator.New(),
	}
}

// CreateFilter dengan DTO
func (h *FilterHandler) CreateFilter(w http.ResponseWriter, r *http.Request) {
	var request models.Filter
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	filter := models.Filter{
		NamaFilter: request.NamaFilter,
	}
	filter.GenerateID()

	if err := h.repo.Create(r.Context(), &filter); err != nil {
		http.Error(w, "Failed to create filter: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, filter)
}

// UpdateFilter dengan DTO
func (h *FilterHandler) UpdateFilter(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var request models.Filter
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := h.validate.Struct(request); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	filter := models.Filter{
		ID:         id,
		NamaFilter: request.NamaFilter,
	}

	if err := h.repo.Update(r.Context(), &filter); err != nil {
		http.Error(w, "Failed to update filter: "+err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, filter)
}
