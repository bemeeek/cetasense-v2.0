package handlers

import (
	"net/http"

	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/internal/services"
)

type UploadHandler struct {
	csvService services.CSVProcessor
	dataRepo   repositories.DataRepository
}

func NewUploadHandler(
	csvService *services.CSVProcessor) *UploadHandler {
	return &UploadHandler{
		csvService: *csvService}
}

func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}
	ruanganID := r.FormValue("ruangan_id")
	filterID := r.FormValue("filter_id")
	batchName := r.FormValue("batch_name")

	if ruanganID == "" || filterID == "" || batchName == "" {
		respondError(w, http.StatusBadRequest, "Missing required fields: ruangan_id, filter_id, batch_name")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to get file: "+err.Error())
		return
	}
	defer file.Close()

	stats, err := h.csvService.ProcessCSIUpload(file, ruanganID, filterID, batchName)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to process CSV: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":        "CSV processed successfully",
		"rows_processed": stats.RowsProcessed,
		"errors":         stats.Errors,
		"file_name":      header.Filename,
		"rows_added":     len(stats.Errors) == 0,
	})
}
