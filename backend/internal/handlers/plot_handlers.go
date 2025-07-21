package handlers

import (
	"encoding/csv"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"

	"cetasense-v2.0/internal/metrics"
	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/middleware"
)

type PlotHandler struct {
	csvRepo     *repositories.CSVFileRepository
	minioClient *minio.Client
	bucketName  string
}

func NewPlotHandler(csvRepo *repositories.CSVFileRepository, minioClient *minio.Client, bucket string) *PlotHandler {
	return &PlotHandler{csvRepo, minioClient, bucket}
}

func (h *PlotHandler) ListCSV(w http.ResponseWriter, r *http.Request) {
	reqID := r.Context().Value(middleware.ReqIDKey).(string)
	start := time.Now()
	files, err := h.csvRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list CSV files: "+err.Error())
		return
	}
	metrics.Step(reqID, "LIST_CSV_FETCH_ALL", float64(time.Since(start).Milliseconds()))
	respondJSON(w, http.StatusOK, files)
}

func (h *PlotHandler) GetPlots(w http.ResponseWriter, r *http.Request) {
	// Retrieve request ID from context.
	reqID := r.Context().Value(middleware.ReqIDKey).(string)

	// 1) Get metadata for the CSV
	id := mux.Vars(r)["id"]
	start := time.Now()
	meta, err := h.csvRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "CSV not found")
		return
	}
	metrics.Step(reqID, "GET_PLOTS_GET_BY_ID", float64(time.Since(start).Nanoseconds())/1e6)

	// 2) Fetch the CSV object from MinIO
	start = time.Now()
	obj, err := h.minioClient.GetObject(r.Context(), h.bucketName, meta.ObjectPath, minio.GetObjectOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch CSV")
		return
	}
	metrics.Step(reqID, "GET_PLOTS_GET_OBJECT", float64(time.Since(start).Nanoseconds())/1e6)
	defer obj.Close()

	// 3) Parse CSV into [][]float64 with shape [nPackets][3*30]
	start = time.Now()
	reader := csv.NewReader(obj)
	var data [][]float64
	if _, err := reader.Read(); err != nil {
		respondError(w, http.StatusInternalServerError, "Parse CSV header: "+err.Error())
		return
	}
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		} else if err != nil {
			respondError(w, http.StatusInternalServerError, "Parse CSV: "+err.Error())
			return
		}
		vals := make([]float64, len(row))
		for i, cell := range row {
			v, _ := strconv.ParseFloat(cell, 64)
			vals[i] = v
		}
		data = append(data, vals)
	}
	metrics.Step(reqID, "GET_PLOTS_PARSE_CSV", float64(time.Since(start).Nanoseconds())/1e6)

	start_processing := time.Now()
	// 4) Process CSV: compute averages per antenna/subcarrier, snapshots, etc.
	n := len(data) // e.g. 1500
	sub := 30      // jumlah subcarrier
	avgAll := make([][]float64, 3)
	for ant := 0; ant < 3; ant++ {
		avgAll[ant] = make([]float64, sub)
		for s := 0; s < sub; s++ {
			sum := 0.0
			for p := 0; p < n; p++ {
				sum += data[p][ant*sub+s]
			}
			avgAll[ant][s] = sum / float64(n)
		}
	}

	meanAnt1 := avgAll[0]
	meanAnt2 := avgAll[1]
	meanAnt3 := avgAll[2]

	mid := n/2 - 1
	snapshots1 := map[string][]float64{
		"pkt1": data[0][0:sub],
		"mid":  data[mid][0:sub],
		"last": data[n-1][0:sub],
	}
	snapshots2 := map[string][]float64{
		"pkt1": data[0][sub : 2*sub],
		"mid":  data[mid][sub : 2*sub],
		"last": data[n-1][sub : 2*sub],
	}
	snapshots3 := map[string][]float64{
		"pkt1": data[0][2*sub : 3*sub],
		"mid":  data[mid][2*sub : 3*sub],
		"last": data[n-1][2*sub : 3*sub],
	}

	avgPerPacket := make([][]float64, 3)
	for ant := 0; ant < 3; ant++ {
		avgPerPacket[ant] = make([]float64, n)
		for p := 0; p < n; p++ {
			sum := 0.0
			for s := 0; s < sub; s++ {
				sum += data[p][ant*sub+s]
			}
			avgPerPacket[ant][p] = sum / float64(sub)
		}
	}

	overallMean := make([]float64, 3)
	for ant := 0; ant < 3; ant++ {
		sum := 0.0
		for _, v := range avgAll[ant] {
			sum += v
		}
		overallMean[ant] = sum / float64(sub)
	}
	metrics.Step(reqID, "GET_PLOTS_PROCESS_CSV", float64(time.Since(start_processing).Nanoseconds())/1e6)

	// 5) Send JSON response containing all computed metrics
	start = time.Now()
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"avgAll":       avgAll,
		"avgPerPacket": avgPerPacket,
		"meanAnt1":     meanAnt1,
		"meanAnt2":     meanAnt2,
		"meanAnt3":     meanAnt3,
		"snapshots1":   snapshots1,
		"snapshots2":   snapshots2,
		"snapshots3":   snapshots3,
		"overallMean":  overallMean,
		"subcarriers":  sub,
		"antennas":     []string{"Ant 1", "Ant 2", "Ant 3"},
	})
	metrics.Step(reqID, "GET_PLOTS_SEND_RESPONSE", float64(time.Since(start).Nanoseconds())/1e6)
}
