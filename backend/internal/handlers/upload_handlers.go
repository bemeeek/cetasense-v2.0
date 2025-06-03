package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"cetasense-v2.0/internal/services"
)

type UploadHandler struct {
	csvService *services.CSVProcessor
}

func NewUploadHandler(csvService *services.CSVProcessor) *UploadHandler {
	return &UploadHandler{
		csvService: csvService,
	}
}

func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	// Tambahkan logging
	log.Println("Received upload request")

	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		log.Printf("ParseMultipartForm error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	// Log semua form values
	log.Printf("Form values: %+v", r.Form)

	namaFilter := r.FormValue("nama_filter")
	batch_id := r.FormValue("batch_id")

	// Validasi parameter
	namaRuangan := strings.TrimSpace(r.FormValue("nama_ruangan"))
	if namaRuangan == "" {
		respondError(w, http.StatusBadRequest, "Nama ruangan tidak boleh kosong")
		return
	}

	if namaFilter == "" {
		respondError(w, http.StatusBadRequest, "Missing required field: nama_filter")
		return
	}

	if batch_id == "" {
		respondError(w, http.StatusBadRequest, "Missing required field: batch_id")
		return
	}

	batchID, err := strconv.Atoi(batch_id)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid batch_id number: "+batch_id)
		return
	}

	// Ambil file CSV dari form
	file, header, err := r.FormFile("csv_file")
	if err != nil {
		log.Printf("FormFile error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to get file: "+err.Error())
		return
	}
	defer file.Close()

	// Log file info
	log.Printf("Received file: %s (size: %d bytes)", header.Filename, header.Size)

	// Memproses CSV dan menyimpan data
	stats, err := h.csvService.ProcessCSIUpload(file, namaRuangan, namaFilter, batchID)
	if err != nil {
		log.Printf("ProcessCSIUpload error: %v", err)
		respondError(w, http.StatusInternalServerError, "Processing error: "+err.Error())
		return
	}

	// Respons sukses
	log.Printf("Upload processed successfully. Rows: %d, Errors: %d",
		stats.RowsProcessed, len(stats.Errors))

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":        "CSV processed successfully",
		"rows_processed": stats.RowsProcessed,
		"errors":         stats.Errors,
		"file_name":      header.Filename,
		"batch_id":       batchID,
		"ruangan":        namaRuangan,
		"filter":         namaFilter,
	})
}
