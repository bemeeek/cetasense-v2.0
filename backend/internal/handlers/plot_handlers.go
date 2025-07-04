package handlers

import (
	"encoding/csv"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"

	"cetasense-v2.0/internal/repositories"
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
	files, err := h.csvRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list CSV files: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, files)
}

func (h *PlotHandler) GetPlots(w http.ResponseWriter, r *http.Request) {
	// 1) ambil metadata & object CSV
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

	// 2) parse CSV → [][]float64 with shape [nPackets][3*30]
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
	n := len(data) // e.g. 1500
	sub := 30      // jumlah subcarrier
	// 3) hitung average per-antenna/subcarrier
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
	// 4) mean per antenna per-subcarrier
	meanAnt1 := avgAll[0]
	meanAnt2 := avgAll[1]
	meanAnt3 := avgAll[2]

	// 5) snapshots untuk ant1: paket 1, tengah, terakhir
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

	// 6) overallMean per antenna
	overallMean := make([]float64, 3)
	for ant := 0; ant < 3; ant++ {
		sum := 0.0
		for _, v := range avgAll[ant] {
			sum += v
		}
		overallMean[ant] = sum / float64(sub)
	}

	// 7) kirim JSON
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"avgAll":      avgAll,
		"meanAnt1":    meanAnt1,
		"meanAnt2":    meanAnt2,
		"meanAnt3":    meanAnt3,
		"snapshots1":  snapshots1,
		"snapshots2":  snapshots2,
		"snapshots3":  snapshots3,
		"overallMean": overallMean,
		"subcarriers": sub, // =1…30
		"antennas":    []string{"Ant 1", "Ant 2", "Ant 3"},
	})
}
