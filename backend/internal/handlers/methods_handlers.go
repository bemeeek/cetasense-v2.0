package handlers

import (
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strings"

	"cetasense-v2.0/config"
	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"
)

type MethodsHandler struct {
	// Dependencies can be added here, such as repositories or services
	repo       *repositories.MethodsRepository
	minio      *minio.Client
	bucketName string
	cfg        *config.Config
}

func NewMethodsHandler(repo *repositories.MethodsRepository, minioClient *minio.Client, bucketName string, cfg *config.Config) *MethodsHandler {
	return &MethodsHandler{
		repo:       repo,
		minio:      minioClient,
		bucketName: bucketName,
		cfg:        cfg,
	}
}

func (h *MethodsHandler) UploadMethods(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Received upload request")
	ctx := r.Context()

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Printf("ParseMultipartForm error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("FormFile error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to get file from form: "+err.Error())
		return
	}
	defer file.Close()
	ext := strings.ToLower(filepath.Ext(header.Filename))
	var filetype string
	switch ext {
	case ".py":
		filetype = "0" // Python script
	case ".pkl":
		filetype = "1" // Model
	default:
		http.Error(w, "Unsupported file type", http.StatusBadRequest)
		return
	}

	log.Printf("Received file: %s, type: %s", header.Filename, filetype)

	// Generate a unique ID for the file
	MethodID := uuid.New().String()
	MethodName := header.Filename
	MethodPath := fmt.Sprintf("Metodhs/%s", MethodName)

	// Upload the file to MinIO
	// if _, err := h.minio.PutObject(ctx, h.bucketName, MethodID+ext, file, header.Size, minio.PutObjectOptions{ContentType: "application/octet-stream"}); err != nil {
	// 	log.Printf("MinIO upload error: %v", err)
	// 	respondError(w, http.StatusInternalServerError, "Failed to upload file: "+err.Error())
	// 	return
	// }

	info, err := h.minio.PutObject(ctx, h.bucketName, MethodPath,
		file, header.Size, minio.PutObjectOptions{ContentType: "application/octet-stream"})
	if err != nil {
		log.Printf("MinIO upload error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to upload file: "+err.Error())
		return
	}
	log.Printf("File uploaded to MinIO: %s (%d bytes)", MethodPath, info.Size)
	// Save metadata to the database
	method := &models.MethodsFile{
		ID:         MethodID,
		NamaMetode: MethodName,
		TipeMetode: filetype,
		ObjectPath: MethodPath,
	}

	if err := h.repo.Create(method); err != nil {
		log.Printf("Database insert error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to save metadata: "+err.Error())
		return
	}
	log.Printf("Metadata saved successfully: %s", MethodName)

	log.Println("Upload process completed successfully")

	// Respond with success
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "File uploaded successfully",
		"filetype":    filetype,
		"method_id":   MethodID,
		"method_name": MethodName,
		"object_path": MethodPath,
	})
}

func (h *MethodsHandler) ListMethods(w http.ResponseWriter, r *http.Request) {
	r.Context()

	// Get all methods from the repository
	methods, err := h.repo.GetAll()
	if err != nil {
		log.Printf("GetAll error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve methods: "+err.Error())
		return
	}

	// Respond with the list of methods
	respondJSON(w, http.StatusOK, methods)
}

func (h *MethodsHandler) GetMethodByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	methodID := mux.Vars(r)["id"]
	// Validate method ID
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}

	// Fetch method by ID
	method, err := h.repo.GetByID(ctx, methodID)
	if err != nil {
		log.Printf("GetByID error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve method: "+err.Error())
		return
	}

	// Respond with the method details
	respondJSON(w, http.StatusOK, method)
}

func (h *MethodsHandler) DeleteMethod(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	methodID := vars["id"]
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}

	// 1. (Opsional) ambil metadata dulu, agar tahu nama object di MinIO
	method, err := h.repo.GetByID(ctx, methodID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to retrieve method: "+err.Error())
		return
	}
	// misal kamu menyimpan ObjectPath = "Metodhs/namafile.ext"
	objectName := methodID + filepath.Ext(method.ObjectPath)

	// atau kalau kamu menyimpan objectName langsung di DB, tinggal pakai method.ObjectPath

	// 2. Hapus object di MinIO
	// if err := h.minio.RemoveObject(ctx, h.bucketName, objectName, minio.RemoveObjectOptions{}); err != nil {
	// 	log.Printf("MinIO delete error: %v", err)
	// 	// kamu bisa pilih: lanjut hapus DB juga, atau rollback, sesuai kebijakan
	// 	respondError(w, http.StatusInternalServerError, "Failed to delete object from storage: "+err.Error())
	// 	return
	// }

	if err := h.minio.RemoveObject(
		ctx,
		h.bucketName,
		objectName,
		minio.RemoveObjectOptions{},
	); err != nil {
		log.Printf("MinIO RemoveObject error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to delete file from storage: "+err.Error())
		return
	}
	log.Printf("File deleted from MinIO: %s", objectName)

	// 3. Hapus metadata di database
	if err := h.repo.Delete(ctx, methodID); err != nil {
		log.Printf("Database delete error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to delete metadata: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Method and storage object deleted successfully"})
}
