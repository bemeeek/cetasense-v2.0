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
	reqID := ctx.Value(middleware.ReqIDKey).(string)

	// Optionally log the start (duration is 0 since nothing has been done yet)
	metrics.Step(reqID, "UPLOAD_METHODS_START", 0)

	// Parsing multipart form
	stepStart := time.Now()
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Printf("Error parsing multipart form, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}
	metrics.Step(reqID, "UPLOAD_METHODS_PARSE_FORM", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Get file from form
	stepStart = time.Now()
	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("Error retrieving file from form, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusBadRequest, "Failed to get file from form: "+err.Error())
		return
	}
	metrics.Step(reqID, "UPLOAD_METHODS_GET_FILE", float64(time.Since(stepStart).Nanoseconds())/1e6)
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

	log.Printf("Received file: %s, type: %s, reqID: %s", header.Filename, filetype, reqID)

	// Generate unique ID and build file path
	MethodID := uuid.New().String()
	MethodName := header.Filename
	MethodPath := fmt.Sprintf("Methods/%s", MethodName)

	// Upload file to MinIO
	stepStart = time.Now()
	_, err = h.minio.PutObject(ctx, h.bucketName, MethodPath, file, header.Size, minio.PutObjectOptions{ContentType: "application/octet-stream"})
	if err != nil {
		log.Printf("MinIO upload error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to upload file: "+err.Error())
		return
	}
	metrics.Step(reqID, "UPLOAD_METHODS_MINIO_PUT", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Save metadata to the database
	stepStart = time.Now()
	method := &models.MethodsFile{
		ID:         MethodID,
		NamaMetode: MethodName,
		TipeMetode: filetype,
		ObjectPath: MethodPath,
	}
	if err = h.repo.Create(method); err != nil {
		log.Printf("Database insert error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to save metadata: "+err.Error())
		return
	}
	metrics.Step(reqID, "UPLOAD_METHODS_DB_INSERT", float64(time.Since(stepStart).Nanoseconds())/1e6)

	log.Printf("Method uploaded successfully, reqID: %s, methodID: %s, file: %s", reqID, MethodID, MethodName)

	// Respond with success
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "File uploaded successfully",
		"filetype":    filetype,
		"method_id":   MethodID,
		"method_name": MethodName,
		"object_path": MethodPath,
	})

	metrics.Step(reqID, "UPLOAD_METHODS_DONE", 0)
}

func (h *MethodsHandler) ListMethods(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()

	// Get all methods from the repository
	methods, err := h.repo.GetAll()
	if err != nil {
		log.Printf("GetAll error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve methods: "+err.Error())
		return
	}
	metrics.Step(reqID, "LIST_METHODS_GET_ALL", float64(time.Since(t0).Nanoseconds())/1e6)

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
	reqID := ctx.Value(middleware.ReqIDKey).(string)

	// Step 1: Validate method ID
	stepStart := time.Now()
	methodID := vars["id"]
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}
	metrics.Step(reqID, "DELETE_METHOD_VALIDATE", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Step 2: Retrieve metadata
	stepStart = time.Now()
	method, err := h.repo.GetByID(ctx, methodID)
	if err != nil {
		log.Printf("GetByID error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to retrieve method: "+err.Error())
		return
	}
	metrics.Step(reqID, "DELETE_METHOD_GET_BY_ID", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Step 3: Remove object from MinIO
	objectName := methodID + filepath.Ext(method.ObjectPath)
	stepStart = time.Now()
	if err := h.minio.RemoveObject(ctx, h.bucketName, objectName, minio.RemoveObjectOptions{}); err != nil {
		log.Printf("MinIO remove error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to delete object from storage: "+err.Error())
		return
	}
	metrics.Step(reqID, "DELETE_METHOD_MINIO_REMOVE", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Step 4: Delete metadata from database
	stepStart = time.Now()
	if err := h.repo.Delete(ctx, methodID); err != nil {
		log.Printf("Database delete error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to delete metadata: "+err.Error())
		return
	}
	metrics.Step(reqID, "DELETE_METHOD_DB_DELETE", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Final step: Done
	metrics.Step(reqID, "DELETE_METHOD_DONE", 0)
	respondJSON(w, http.StatusOK, map[string]string{"message": "Method and storage object deleted successfully"})
}

func (h *MethodsHandler) RenameMethod(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	reqID := ctx.Value(middleware.ReqIDKey).(string)

	// Start process
	stepStart := time.Now()
	methodID := vars["id"]
	metrics.Step(reqID, "RENAME_METHOD_START", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Validate method ID
	stepStart = time.Now()
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}
	metrics.Step(reqID, "RENAME_METHOD_VALIDATE", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Decode JSON payload
	stepStart = time.Now()
	var req struct {
		NewName string `json:"new_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("JSON decode error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	metrics.Step(reqID, "RENAME_METHOD_JSON_DECODE", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// Validate new name value
	if req.NewName == "" {
		respondError(w, http.StatusBadRequest, "New name is required")
		return
	}

	// Update the method name in the repository
	stepStart = time.Now()
	if err := h.repo.UpdateName(ctx, methodID, req.NewName); err != nil {
		log.Printf("Rename error, reqID: %s, error: %v", reqID, err)
		respondError(w, http.StatusInternalServerError, "Failed to update method: "+fmt.Sprint(err))
		return
	}
	metrics.Step(reqID, "RENAME_METHOD_UPDATE", float64(time.Since(stepStart).Nanoseconds())/1e6)

	// End process
	metrics.Step(reqID, "RENAME_METHOD_DONE", 0)
	respondJSON(w, http.StatusOK, map[string]string{"message": "Method updated successfully"})
}
