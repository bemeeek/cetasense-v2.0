package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"

	"cetasense-v2.0/config"
	"cetasense-v2.0/internal/metrics"
	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/middleware"
)

// UploadHandler handles CSV uploads: save file to MinIO and metadata to MariaDB
// using a repository for persistence.
type UploadHandler struct {
	csvRepo     *repositories.CSVFileRepository
	minioClient *minio.Client
	bucketName  string
	cfg         *config.Config
	ruanganRepo *repositories.RuanganRepository
	filterRepo  *repositories.FilterRepository
}

// NewUploadHandler constructs a new UploadHandler
func NewUploadHandler(
	csvRepo *repositories.CSVFileRepository,
	minioClient *minio.Client,
	bucketName string,
	cfg *config.Config,
	ruanganRepo *repositories.RuanganRepository,
	filterRepo *repositories.FilterRepository,
) *UploadHandler {
	return &UploadHandler{
		csvRepo:     csvRepo,
		minioClient: minioClient,
		bucketName:  bucketName,
		cfg:         cfg,
		ruanganRepo: ruanganRepo,
		filterRepo:  filterRepo,
	}
}

// HandleUpload receives a CSV file, uploads to MinIO, and saves metadata to DB
func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	log.Println("Received upload request")
	ctx := r.Context()
	reqID := ctx.Value(middleware.ReqIDKey).(string)

	// Log the receipt of the request
	startStep := time.Now()
	metrics.Step(reqID, "UPLOAD_REQUEST_RECEIVED", float64(time.Since(startStep).Nanoseconds())/1e6)

	// Get form values
	namaRuangan := r.FormValue("nama_ruangan")
	namaFilter := r.FormValue("nama_filter")

	// Parse multipart form (limit: 10 MB)
	startStep = time.Now()
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}
	metrics.Step(reqID, "PARSE_FORM", float64(time.Since(startStep).Nanoseconds())/1e6)

	// Retrieve ruangan info
	startStep = time.Now()
	ruangan, err := h.ruanganRepo.GetRuanganByNama(ctx, namaRuangan)
	if err != nil {
		log.Printf("GetRuanganByNama error: %v", err)
		respondError(w, http.StatusBadRequest, "Invalid ruangan: "+err.Error())
		return
	}
	metrics.Step(reqID, "GET_RUANGAN", float64(time.Since(startStep).Nanoseconds())/1e6)

	// Retrieve filter info
	startStep = time.Now()
	filter, err := h.filterRepo.GetFilterByNama(ctx, namaFilter)
	if err != nil {
		log.Printf("GetFilterByNama error: %v", err)
		respondError(w, http.StatusBadRequest, "Invalid filter: "+err.Error())
		return
	}
	metrics.Step(reqID, "GET_FILTER", float64(time.Since(startStep).Nanoseconds())/1e6)

	// Retrieve CSV file from the form
	startStep = time.Now()
	file, header, err := r.FormFile("csv_file")
	if err != nil {
		log.Printf("FormFile error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to get file: "+err.Error())
		return
	}
	metrics.Step(reqID, "GET_CSV_FILE", float64(time.Since(startStep).Nanoseconds())/1e6)
	defer file.Close()

	// Read file into buffer for upload
	startStep = time.Now()
	buf, err := io.ReadAll(file)
	if err != nil {
		log.Printf("ReadAll error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to read file: "+err.Error())
		return
	}
	metrics.Step(reqID, "READ_FILE", float64(time.Since(startStep).Nanoseconds())/1e6)

	// Generate unique ID and object path
	fileID := uuid.New().String()
	namaFile := header.Filename
	objectPath := fmt.Sprintf("Data-Parameter/%s", namaFile)

	// Upload to MinIO
	startStep = time.Now()
	_, err = h.minioClient.PutObject(ctx, h.bucketName, objectPath,
		bytes.NewReader(buf), int64(len(buf)), minio.PutObjectOptions{ContentType: "text/csv"})
	if err != nil {
		log.Printf("MinIO PutObject error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to upload file to storage: "+err.Error())
		return
	}
	metrics.Step(reqID, "MINIO_PUT_OBJECT", float64(time.Since(startStep).Nanoseconds())/1e6)

	// Save metadata to MariaDB via repository
	startStep = time.Now()
	fileMeta := &models.CSI_File{
		ID:          fileID,
		FileName:    header.Filename,
		ObjectPath:  objectPath,
		CreatedAt:   time.Now().Format(time.RFC3339),
		RuanganID:   ruangan.ID,
		FilterID:    filter.ID,
		NamaRuangan: ruangan.NamaRuangan,
		NamaFilter:  filter.NamaFilter,
	}
	if err := h.csvRepo.Create(ctx, fileMeta); err != nil {
		log.Printf("CSVFileRepository.Create error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to save metadata: "+err.Error())
		return
	}
	metrics.Step(reqID, "CSV_REPO_CREATE", float64(time.Since(startStep).Nanoseconds())/1e6)

	// Respond with JSON
	startStep = time.Now()
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"file_id":     fileID,
		"file_name":   header.Filename,
		"object_path": objectPath,
		"ruangan_id":  ruangan.ID,
		"filter_id":   filter.ID,
		"created_at":  fileMeta.CreatedAt,
	})
	metrics.Step(reqID, "UPLOAD_OK", float64(time.Since(startStep).Nanoseconds())/1e6)
}

// GetAllUploads mengembalikan list semua file CSV yang sudah di-upload
func (h *UploadHandler) GetAllUploads(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	ctx := r.Context()
	t0_2 := time.Now()

	files, err := h.csvRepo.GetAll(ctx)
	if err != nil {
		log.Printf("CSVFileRepository.GetAll error: %v", err)
		// middleware.LogEvent(r.Context().Value(middleware.ReqIDKey).(string), "CSV_REPO_GET_ALL_ERROR", err.Error())
		respondError(w, http.StatusInternalServerError, "Failed to fetch uploads")
		return
	}
	// middleware.LogEvent(r.Context().Value(middleware.ReqIDKey).(string), "CSV_REPO_GET_ALL_OK", fmt.Sprintf("found %d files", len(files)))	// Pastikan files bukan nil
	metrics.Step(reqID, "CSV_REPO_GET_ALL", float64(time.Since(t0_2).Nanoseconds())/1e6)
	if files == nil {
		files = []*models.CSI_File{}
	}

	respondJSON(w, http.StatusOK, files)
}

func (h *UploadHandler) DeleteUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	fileID := mux.Vars(r)["id"]
	reqID := ctx.Value(middleware.ReqIDKey).(string)

	// Start: Validate fileID
	start := time.Now()
	if fileID == "" {
		respondError(w, http.StatusBadRequest, "File ID is required")
		middleware.LogEvent(reqID, "DELETE_UPLOAD_ERROR", "File ID is required")
		return
	}
	metrics.Step(reqID, "DELETE_UPLOAD_START", float64(time.Since(start).Nanoseconds())/1e6)

	// 1. Retrieve metadata from DB
	start = time.Now()
	fileMeta, err := h.csvRepo.GetByID(ctx, fileID)
	if err != nil {
		log.Printf("CSVFileRepository.GetByID error: %v", err)
		metrics.Step(reqID, "CSV_REPO_GET_BY_ID", float64(time.Since(start).Nanoseconds())/1e6)
		respondError(w, http.StatusNotFound, "File not found: "+err.Error())
		return
	}
	metrics.Step(reqID, "CSV_REPO_GET_BY_ID", float64(time.Since(start).Nanoseconds())/1e6)

	// 2. Remove object from MinIO
	start = time.Now()
	if err := h.minioClient.RemoveObject(
		ctx,
		h.bucketName,
		fileMeta.ObjectPath,
		minio.RemoveObjectOptions{},
	); err != nil {
		log.Printf("MinIO RemoveObject error: %v", err)
		metrics.Step(reqID, "MINIO_REMOVE_OBJECT", float64(time.Since(start).Nanoseconds())/1e6)
		respondError(w, http.StatusInternalServerError, "Failed to delete file from storage: "+err.Error())
		return
	}
	metrics.Step(reqID, "MINIO_REMOVE_OBJECT", float64(time.Since(start).Nanoseconds())/1e6)
	log.Printf("File deleted from MinIO: %s", fileMeta.ObjectPath)

	// 3. Delete metadata from DB
	start = time.Now()
	if err := h.csvRepo.Delete(ctx, fileID); err != nil {
		log.Printf("CSVFileRepository.Delete error: %v", err)
		metrics.Step(reqID, "CSV_REPO_DELETE", float64(time.Since(start).Nanoseconds())/1e6)
		respondError(w, http.StatusInternalServerError, "Failed to delete metadata: "+err.Error())
		return
	}
	metrics.Step(reqID, "CSV_REPO_DELETE", float64(time.Since(start).Nanoseconds())/1e6)

	// 4. Respond with JSON
	start = time.Now()
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "File deleted successfully",
	})
	metrics.Step(reqID, "DELETE_UPLOAD_OK", float64(time.Since(start).Nanoseconds())/1e6)
}

func (h *UploadHandler) UpdateName(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	reqID := ctx.Value(middleware.ReqIDKey).(string)

	// Ambil ID file dari parameter URL
	vars := mux.Vars(r)
	fileID := vars["id"]
	if fileID == "" {
		respondError(w, http.StatusBadRequest, "File ID is required")
		return
	}

	// Decode body JSON dan log waktu decoding
	var requestData struct {
		NewName string `json:"new_name"`
	}
	startDecode := time.Now()
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		metrics.Step(reqID, "DECODE_JSON_ERROR", float64(time.Since(startDecode).Nanoseconds())/1e6)
		respondError(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}
	metrics.Step(reqID, "DECODE_JSON_OK", float64(time.Since(startDecode).Nanoseconds())/1e6)

	// Pastikan 'new_name' tidak kosong
	if requestData.NewName == "" {
		respondError(w, http.StatusBadRequest, "New name is required")
		return
	}

	// Update metadata file dalam repositori dan log waktu update
	fileMeta := &models.CSI_File{
		ID:       fileID,
		FileName: requestData.NewName,
	}
	startUpdateDB := time.Now()
	if err := h.csvRepo.UpdateName(ctx, fileMeta); err != nil {
		metrics.Step(reqID, "UPDATE_NAME_DB_ERROR", float64(time.Since(startUpdateDB).Nanoseconds())/1e6)
		log.Printf("CSVFileRepository.UpdateName error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to update file name: "+err.Error())
		return
	}
	metrics.Step(reqID, "UPDATE_NAME_DB_OK", float64(time.Since(startUpdateDB).Nanoseconds())/1e6)

	// Respons berhasil dan log waktu response
	startResponse := time.Now()
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "File name updated successfully",
	})
	metrics.Step(reqID, "UPDATE_RESPONSE_OK", float64(time.Since(startResponse).Nanoseconds())/1e6)
}
