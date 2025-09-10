package handlers

import (
	"encoding/csv"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"

	"cetasense-v2.0/internal/repositories"
)

// ---------------- Handler wiring ----------------

type PlotHandler struct {
	csvRepo     *repositories.CSVFileRepository
	minioClient *minio.Client
	bucketName  string
}

func NewPlotHandler(csvRepo *repositories.CSVFileRepository, minioClient *minio.Client, bucket string) *PlotHandler {
	return &PlotHandler{csvRepo: csvRepo, minioClient: minioClient, bucketName: bucket}
}

func (h *PlotHandler) ListCSV(w http.ResponseWriter, r *http.Request) {
	files, err := h.csvRepo.GetAll(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list CSV files: "+err.Error())
		return
	}
	respondJSON(w, http.StatusOK, files)
}

// parseFloatLoose tries dot or comma decimals.
func parseFloatLoose(s string) (float64, bool) {
	if v, err := strconv.ParseFloat(strings.TrimSpace(s), 64); err == nil {
		return v, true
	}
	s2 := strings.ReplaceAll(s, ",", ".")
	if v, err := strconv.ParseFloat(strings.TrimSpace(s2), 64); err == nil {
		return v, true
	}
	return 0, false
}

// findHeaderIndex returns the first column index whose lowercased header contains any of the keys.
func findHeaderIndex(headers []string, keys ...string) int {
	for i, h := range headers {
		lh := strings.ToLower(strings.TrimSpace(h))
		for _, k := range keys {
			if strings.Contains(lh, k) {
				return i
			}
		}
	}
	return -1
}

// attemptFromLabel extracts trailing digits and returns a 1-based attempt index.
// If label ends with "0" (e.g. s0), it becomes 1. If it ends with "1", stays 1, etc.
func attemptFromLabel(s string, fallback int) int {
	s = strings.TrimSpace(s)
	if s == "" {
		return fallback
	}

	// Look for pattern like "s0", "s1", "s2", "s3", "s4" at the end
	re := regexp.MustCompile(`s(\d+)\s*$`)
	m := re.FindStringSubmatch(s)
	if len(m) == 2 {
		v, _ := strconv.Atoi(m[1])
		// Convert 0-based (s0,s1,s2,s3,s4) to 1-based (1,2,3,4,5)
		return v + 1
	}

	// Fallback to original pattern for other formats
	re2 := regexp.MustCompile(`(\d+)\s*$`)
	m2 := re2.FindStringSubmatch(s)
	if len(m2) == 2 {
		v, _ := strconv.Atoi(m2[1])
		if v == 0 {
			return 1
		}
		return v
	}
	return fallback
}

// ============== RSSI JSON payload types ==============

type rssiAttemptSeries struct {
	Attempt int        `json:"attempt"`
	Y       []*float64 `json:"y"` // aligned with anchors order; nil -> null in JSON
}

type rssiResponse struct {
	Meta struct {
		Kind         string `json:"kind"` // "RSSI"
		AnchorCount  int    `json:"anchorCount"`
		AttemptCount int    `json:"attemptCount"`
		XLabel       string `json:"xLabel"`
		YLabel       string `json:"yLabel"`
	} `json:"meta"`
	Anchors  []string            `json:"anchors"`  // tick labels (sorted)
	Attempts []int               `json:"attempts"` // 1..N
	Series   []rssiAttemptSeries `json:"series"`
}

// ============== Core: parse RSSI CSV and respond ==============

// GetPlots now serves RSSI line-chart payload.
// Robust CSV expectations (long format OK, headers flexible):
// required: anchor|anchor_id, rssi
// optional: attempt|trial|try|measurement|measure|sample|sample_id|seq|index
// if attempt missing, attempts are inferred per-anchor order (1..N)
func (h *PlotHandler) GetPlots(w http.ResponseWriter, r *http.Request) {
	// 1) Fetch CSV metadata
	id := mux.Vars(r)["id"]
	meta, err := h.csvRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "CSV not found")
		return
	}

	// 2) Stream CSV from MinIO
	obj, err := h.minioClient.GetObject(r.Context(), h.bucketName, meta.ObjectPath, minio.GetObjectOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch CSV")
		return
	}
	defer obj.Close()

	reader := csv.NewReader(obj)
	reader.FieldsPerRecord = -1 // allow ragged rows

	// 3) Read header
	hdr, err := reader.Read()
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to read CSV header: "+err.Error())
		return
	}

	// Column indices
	idxAnchor := findHeaderIndex(hdr, "anchor_id", "anchor")
	idxRSSI := findHeaderIndex(hdr, "rssi")
	idxAttempt := findHeaderIndex(hdr, "attempt", "trial", "try", "measurement", "measure", "sample", "sample_id", "seq", "index")

	if idxAnchor < 0 || idxRSSI < 0 {
		respondError(w, http.StatusBadRequest, "CSV must have columns for anchor and rssi")
		return
	}

	// Containers
	anchorSet := map[string]struct{}{}
	attemptSet := map[int]struct{}{}

	// attempt -> anchorLabel -> value
	values := map[int]map[string]float64{}

	// Track inferred attempt when not present
	perAnchorCounter := map[string]int{}

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			respondError(w, http.StatusBadRequest, "Parse CSV: "+err.Error())
			return
		}
		if idxAnchor >= len(row) || idxRSSI >= len(row) {
			continue // skip malformed
		}

		anchorLabel := strings.TrimSpace(row[idxAnchor])
		if anchorLabel == "" {
			continue
		}
		anchorSet[anchorLabel] = struct{}{}

		// attempt index
		att := 0
		if idxAttempt >= 0 && idxAttempt < len(row) {
			att = attemptFromLabel(row[idxAttempt], 0)
		}
		if att == 0 { // infer by per-anchor count
			perAnchorCounter[anchorLabel]++
			att = perAnchorCounter[anchorLabel]
		}

		// rssi value
		val, ok := parseFloatLoose(row[idxRSSI])
		if !ok {
			continue
		}

		if _, ok := values[att]; !ok {
			values[att] = map[string]float64{}
		}
		values[att][anchorLabel] = val
		attemptSet[att] = struct{}{}
	}

	if len(anchorSet) == 0 || len(attemptSet) == 0 {
		respondError(w, http.StatusBadRequest, "No usable RSSI rows found")
		return
	}

	// Sort anchors (numeric if possible)
	anchors := make([]string, 0, len(anchorSet))
	for a := range anchorSet {
		anchors = append(anchors, a)
	}
	sort.Slice(anchors, func(i, j int) bool {
		iNum, iErr := strconv.Atoi(anchors[i])
		jNum, jErr := strconv.Atoi(anchors[j])
		if iErr == nil && jErr == nil {
			return iNum < jNum
		}
		return anchors[i] < anchors[j]
	})

	// Sort attempts ascending
	attempts := make([]int, 0, len(attemptSet))
	for a := range attemptSet {
		attempts = append(attempts, a)
	}
	sort.Ints(attempts)

	// Build series, aligning to anchors order
	series := make([]rssiAttemptSeries, 0, len(attempts))
	for _, att := range attempts {
		row := make([]*float64, len(anchors))
		for i, a := range anchors {
			if v, ok := values[att][a]; ok {
				vv := v
				row[i] = &vv
			} else {
				row[i] = nil // gap
			}
		}
		series = append(series, rssiAttemptSeries{Attempt: att, Y: row})
	}

	// Response
	resp := rssiResponse{}
	resp.Meta.Kind = "RSSI"
	resp.Meta.AnchorCount = len(anchors)
	resp.Meta.AttemptCount = len(attempts)
	resp.Meta.XLabel = "Anchor"
	resp.Meta.YLabel = "RSSI (dBm)"
	resp.Anchors = anchors
	resp.Attempts = attempts
	resp.Series = series

	respondJSON(w, http.StatusOK, resp)
}
