package handlers

import (
	"net/http"

	"cetasense-v2.0/config"
	"cetasense-v2.0/internal/repositories"
	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"
)

type HeatmapHandler struct {
	csvRepo     *repositories.CSVFileRepository
	minioClient *minio.Client
	bucketName  string
	cfg         *config.Config
}

func NewHeatmapHandler(csvRepo *repositories.CSVFileRepository, minioClient *minio.Client, bucketName string, cfg *config.Config) *HeatmapHandler {
	return &HeatmapHandler{
		csvRepo:     csvRepo,
		minioClient: minioClient,
		bucketName:  bucketName,
		cfg:         cfg,
	}
}

func (h *HeatmapHandler) ListCSV(w http.ResponseWriter, r *http.Request) {
	files, err := h.csvRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list CSV files: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, files)
}

func (h *HeatmapHandler) GetHeatmap(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	meta, err := h.csvRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "CSV not found")
		return
	}
	obj, err := h.minioClient.GetObject(r.Context(), h.bucketName, meta.ObjectPath, minio.GetObjectOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch CSV")
		return
	}
	defer obj.Close()
	matrix, err := h.csvRepo.ParseCSVFile(obj)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to parse CSV file: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"theta": ThetaScan,
		"tau":   TauScan,
		"z":     matrix,
	})
}
