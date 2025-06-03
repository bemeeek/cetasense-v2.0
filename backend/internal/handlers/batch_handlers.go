package handlers

import (
	"net/http"

	"cetasense-v2.0/internal/repositories"
)

type BatchHandler struct {
	dataRepo *repositories.DataRepository
}

func NewBatchHandler(dataRepo *repositories.DataRepository) *BatchHandler {
	return &BatchHandler{dataRepo: dataRepo}
}

func (h *BatchHandler) GetAllBatches(w http.ResponseWriter, r *http.Request) {
	batches, err := h.dataRepo.GetAllBatchIDs(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch batches: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, batches)
}
