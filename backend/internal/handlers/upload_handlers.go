package handlers

import (
	"net/http"

	"cetasense-v2.0/internal/services"
)

type UploadHandler struct {
	csvService *services.CSVProcessor
}

func NewUploadHandler(
	csvService *services.CSVProcessor) *UploadHandler {
	return &UploadHandler{
		csvService: csvService}
}

func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	namaRuangan := r.FormValue("nama_ruangan") // Sekarang nama ruangan
	namaFilter := r.FormValue("nama_filter")   // Sekarang nama filter
	batchName := r.FormValue("batch_name")

	if namaRuangan == "" || namaFilter == "" || batchName == "" {
		respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	file, header, err := r.FormFile("csv_file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "File error: "+err.Error())
		return
	}
	defer file.Close()

	stats, err := h.csvService.ProcessCSIUpload(file, namaRuangan, namaFilter, batchName)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Processing error: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":        "CSV processed successfully",
		"rows_processed": stats.RowsProcessed,
		"errors":         stats.Errors,
		"file_name":      header.Filename,
		"ruangan":        namaRuangan,
		"filter":         namaFilter,
		"batch":          batchName,
	})
}
