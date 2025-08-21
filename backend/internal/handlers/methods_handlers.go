package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"cetasense-v2.0/config"
	"cetasense-v2.0/internal/metrics"
	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/middleware"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"
)

type MethodsHandler struct {
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
	ctx := r.Context()

	// Parsing multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	// Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to get file from form: "+err.Error())
		return
	}
	defer file.Close()

	// Determine file type
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
	// Generate unique ID and build file path
	MethodID := uuid.New().String()
	MethodName := header.Filename
	MethodPath := fmt.Sprintf("Methods/%s", MethodName)

	// Upload file to MinIO
	_, err = h.minio.PutObject(ctx, h.bucketName, MethodPath, file, header.Size, minio.PutObjectOptions{ContentType: "application/octet-stream"})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to upload file: "+err.Error())
		return
	}
	log.Printf("File %s uploaded successfully to bucket %s", MethodPath, h.bucketName)

	// Save metadata to the database
	method := &models.MethodsFile{
		ID:         MethodID,
		NamaMetode: MethodName,
		TipeMetode: filetype,
		ObjectPath: MethodPath,
	}
	if err = h.repo.Create(method); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save metadata: "+err.Error())
		return
	}
	log.Printf("Metadata for %s saved successfully", MethodName)
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
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	// Get all methods from the repository
	methods, err := h.repo.GetAll()
	if err != nil {
		log.Printf("GetAll error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve methods: "+err.Error())
		return
	}
	// Respond with the list of methods
	respondJSON(w, http.StatusOK, methods)
}

func (h *MethodsHandler) GetMethodByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	methodID := mux.Vars(r)["id"]
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()

	// Validate method ID
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}
	metrics.Step(reqID, "GET_METHOD_BY_ID_VALIDATE", float64(time.Since(t0).Nanoseconds())/1e6)

	// Fetch method by ID
	t0 = time.Now()
	method, err := h.repo.GetByID(ctx, methodID)
	if err != nil {
		log.Printf("GetByID error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve method: "+err.Error())
		return
	}
	metrics.Step(reqID, "GET_METHOD_BY_ID_FETCH", float64(time.Since(t0).Nanoseconds())/1e6)

	// Respond with the method details
	respondJSON(w, http.StatusOK, method)
}

func (h *MethodsHandler) DeleteMethod(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)

	// Step 1: Validate method ID
	methodID := vars["id"]
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}
	// Step 2: Retrieve metadata
	method, err := h.repo.GetByID(ctx, methodID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to retrieve method: "+err.Error())
		return
	}
	// Step 3: Remove object from MinIO
	objectName := methodID + filepath.Ext(method.ObjectPath)
	if err := h.minio.RemoveObject(ctx, h.bucketName, objectName, minio.RemoveObjectOptions{}); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete object from storage: "+err.Error())
		return
	}
	// Step 4: Delete metadata from database
	if err := h.repo.Delete(ctx, methodID); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete metadata: "+err.Error())
		return
	}
	// Final step: Done
	respondJSON(w, http.StatusOK, map[string]string{"message": "Method and storage object deleted successfully"})
}

func (h *MethodsHandler) RenameMethod(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	// Start process
	methodID := vars["id"]

	// Validate method ID
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}
	// Decode JSON payload
	var req struct {
		NewName string `json:"new_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	// Validate new name value
	if req.NewName == "" {
		respondError(w, http.StatusBadRequest, "New name is required")
		return
	}

	// Update the method name in the repository
	if err := h.repo.UpdateName(ctx, methodID, req.NewName); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update method: "+fmt.Sprint(err))
		return
	}
	// End process
	respondJSON(w, http.StatusOK, map[string]string{"message": "Method updated successfully"})
}
