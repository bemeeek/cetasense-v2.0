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
	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
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

	namaRuangan := r.FormValue("nama_ruangan")
	namaFilter := r.FormValue("nama_filter")

	// Parse multipart form (limit: 10 MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Printf("ParseMultipartForm error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	ruangan, err := h.ruanganRepo.GetRuanganByNama(ctx, namaRuangan)
	if err != nil {
		log.Printf("GetRuanganByNama error: %v", err)
		respondError(w, http.StatusBadRequest, "Invalid ruangan: "+err.Error())
		return
	}

	filter, err := h.filterRepo.GetFilterByNama(ctx, namaFilter)
	if err != nil {
		log.Printf("GetFilterByNama error: %v", err)
		respondError(w, http.StatusBadRequest, "Invalid filter: "+err.Error())
		return
	}

	// Retrieve CSV file
	file, header, err := r.FormFile("csv_file")
	if err != nil {
		log.Printf("FormFile error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to get file: "+err.Error())
		return
	}
	defer file.Close()

	// Read file into buffer for upload
	buf, err := io.ReadAll(file)
	if err != nil {
		log.Printf("ReadAll error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to read file: "+err.Error())
		return
	}

	// Generate unique ID and object path
	fileID := uuid.New().String()
	namaFile := header.Filename
	objectPath := fmt.Sprintf("Data-Parameter/%s", namaFile)

	// Upload to MinIO
	info, err := h.minioClient.PutObject(ctx, h.bucketName, objectPath,
		bytes.NewReader(buf), int64(len(buf)), minio.PutObjectOptions{ContentType: "text/csv"})
	if err != nil {
		log.Printf("MinIO PutObject error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to upload file to storage: "+err.Error())
		return
	}
	log.Printf("File uploaded to MinIO: %s (%d bytes)", objectPath, info.Size)

	// Save metadata to MariaDB via repository
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

	// Respond JSON
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"file_id":     fileID,
		"file_name":   header.Filename,
		"object_path": objectPath,
		"ruangan_id":  ruangan.ID,
		"filter_id":   filter.ID,
		"created_at":  fileMeta.CreatedAt,
	})
}

// GetAllUploads mengembalikan list semua file CSV yang sudah di-upload
func (h *UploadHandler) GetAllUploads(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	files, err := h.csvRepo.GetAll(ctx)
	if err != nil {
		log.Printf("CSVFileRepository.GetAll error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to fetch uploads")
		return
	}

	// Pastikan files bukan nil
	if files == nil {
		files = []*models.CSI_File{}
	}

	respondJSON(w, http.StatusOK, files)
}

func (h *UploadHandler) DeleteUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	fileID := mux.Vars(r)["id"]
	if fileID == "" {
		respondError(w, http.StatusBadRequest, "File ID is required")
		return
	}

	// 1. Ambil metadata dari DB
	fileMeta, err := h.csvRepo.GetByID(ctx, fileID)
	if err != nil {
		log.Printf("CSVFileRepository.GetByID error: %v", err)
		respondError(w, http.StatusNotFound, "File not found: "+err.Error())
		return
	}

	// 2. Hapus objek di MinIO menggunakan ObjectPath yang sebenarnya
	if err := h.minioClient.RemoveObject(
		ctx,
		h.bucketName,
		fileMeta.ObjectPath,
		minio.RemoveObjectOptions{},
	); err != nil {
		log.Printf("MinIO RemoveObject error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to delete file from storage: "+err.Error())
		return
	}
	log.Printf("File deleted from MinIO: %s", fileMeta.ObjectPath)

	// 3. Hapus metadata dari DB
	if err := h.csvRepo.Delete(ctx, fileID); err != nil {
		log.Printf("CSVFileRepository.Delete error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to delete metadata: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "File deleted successfully",
	})
}

func (h *UploadHandler) UpdateName(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Ambil ID file dari parameter URL
	vars := mux.Vars(r)
	fileID := vars["id"]

	// Pastikan ID file tidak kosong
	if fileID == "" {
		respondError(w, http.StatusBadRequest, "File ID is required")
		return
	}

	// Parse 'new_name' dari body JSON
	var requestData struct {
		NewName string `json:"new_name"`
	}

	// Decode body JSON
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid JSON format")
		return
	}

	// Pastikan 'new_name' tidak kosong
	if requestData.NewName == "" {
		respondError(w, http.StatusBadRequest, "New name is required")
		return
	}

	// Update metadata file dalam repositori
	fileMeta := &models.CSI_File{
		ID:       fileID,
		FileName: requestData.NewName,
	}

	// Cek apakah update berhasil
	if err := h.csvRepo.UpdateName(ctx, fileMeta); err != nil {
		log.Printf("CSVFileRepository.UpdateName error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to update file name: "+err.Error())
		return
	}

	// Respons berhasil
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "File name updated successfully",
	})
}
