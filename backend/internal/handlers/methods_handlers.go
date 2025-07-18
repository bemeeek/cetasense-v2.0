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
	reqID := r.Context().Value(middleware.ReqIDKey).(string)

	t0 := time.Now()
	metrics.Step(reqID, "UPLOAD_METHODS_START", float64(time.Since(t0).Nanoseconds())/1e6)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Printf("ParseMultipartForm error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}
	metrics.Step(reqID, "UPLOAD_METHODS_PARSE_FORM", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("FormFile error: %v", err)
		respondError(w, http.StatusBadRequest, "Failed to get file from form: "+err.Error())
		return
	}
	metrics.Step(reqID, "UPLOAD_METHODS_GET_FILE", float64(time.Since(t0).Nanoseconds())/1e6)
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
	metrics.Step(reqID, "UPLOAD_METHODS_GET_FILE_DONE", float64(time.Since(t0).Nanoseconds())/1e6)

	// Generate a unique ID for the file
	MethodID := uuid.New().String()
	MethodName := header.Filename
	MethodPath := fmt.Sprintf("Metodhs/%s", MethodName)

	t0 = time.Now()
	info, err := h.minio.PutObject(ctx, h.bucketName, MethodPath,
		file, header.Size, minio.PutObjectOptions{ContentType: "application/octet-stream"})
	if err != nil {
		log.Printf("MinIO upload error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to upload file: "+err.Error())
		return
	}
	log.Printf("File uploaded to MinIO: %s (%d bytes)", MethodPath, info.Size)
	metrics.Step(reqID, "UPLOAD_METHODS_MINIO_PUT", float64(time.Since(t0).Nanoseconds())/1e6)
	// Save metadata to the database
	t0 = time.Now()
	method := &models.MethodsFile{
		ID:         MethodID,
		NamaMetode: MethodName,
		TipeMetode: filetype,
		ObjectPath: MethodPath,
	}
	metrics.Step(reqID, "UPLOAD_METHODS_CREATE_METADATA", float64(time.Since(t0).Nanoseconds())/1e6)

	t0 = time.Now()
	if err := h.repo.Create(method); err != nil {
		log.Printf("Database insert error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to save metadata: "+err.Error())
		return
	}
	log.Printf("Metadata saved successfully: %s", MethodName)
	metrics.Step(reqID, "UPLOAD_METHODS_DB_INSERT", float64(time.Since(t0).Nanoseconds())/1e6)
	log.Println("Upload process completed successfully")

	// Respond with success
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "File uploaded successfully",
		"filetype":    filetype,
		"method_id":   MethodID,
		"method_name": MethodName,
		"object_path": MethodPath,
	})
	metrics.Step(reqID, "UPLOAD_METHODS_DONE", float64(time.Since(t0).Nanoseconds())/1e6)
}

func (h *MethodsHandler) ListMethods(w http.ResponseWriter, r *http.Request) {
	r.Context()
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()
	// Get all methods from the repository
	methods, err := h.repo.GetAll()
	if err != nil {
		log.Printf("GetAll error: %v", err)
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
		log.Printf("GetByID error: %v", err)
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
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()
	methodID := vars["id"]
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}
	metrics.Step(reqID, "DELETE_METHOD_VALIDATE", float64(time.Since(t0).Nanoseconds())/1e6)

	// 1. (Opsional) ambil metadata dulu, agar tahu nama object di MinIO
	t0 = time.Now()
	method, err := h.repo.GetByID(ctx, methodID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to retrieve method: "+err.Error())
		return
	}
	metrics.Step(reqID, "DELETE_METHOD_GET_BY_ID", float64(time.Since(t0).Nanoseconds())/1e6)
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
	t0 = time.Now()
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
	metrics.Step(reqID, "DELETE_METHOD_MINIO_REMOVE", float64(time.Since(t0).Nanoseconds())/1e6)
	log.Printf("File deleted from MinIO: %s", objectName)

	// 3. Hapus metadata di database
	t0 = time.Now()
	if err := h.repo.Delete(ctx, methodID); err != nil {
		log.Printf("Database delete error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to delete metadata: "+err.Error())
		return
	}
	metrics.Step(reqID, "DELETE_METHOD_DB_DELETE", float64(time.Since(t0).Nanoseconds())/1e6)

	respondJSON(w, http.StatusOK, map[string]string{"message": "Method and storage object deleted successfully"})
}

func (h *MethodsHandler) RenameMethod(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	t0 := time.Now()
	methodID := vars["id"]
	if methodID == "" {
		respondError(w, http.StatusBadRequest, "Method ID is required")
		return
	}
	metrics.Step(reqID, "RENAME_METHOD_VALIDATE", float64(time.Since(t0).Nanoseconds())/1e6)

	var req struct {
		NewName string `json:"new_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("JSON decode error: %v", err)
		respondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if req.NewName == "" {
		respondError(w, http.StatusBadRequest, "New name is required")
		return
	}

	// Update the method name in the repository
	t0 = time.Now()
	if err := h.repo.UpdateName(ctx, methodID, req.NewName); err != nil {
		log.Printf("Rename error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to update method: "+fmt.Sprint(err))
		return
	}
	log.Printf("Method updated successfully: %s to %s", methodID, req.NewName)
	metrics.Step(reqID, "RENAME_METHOD_UPDATE", float64(time.Since(t0).Nanoseconds())/1e6)

	respondJSON(w, http.StatusOK, map[string]string{"message": "Method updated successfully"})
}
