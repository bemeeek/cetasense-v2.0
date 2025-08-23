package handlers

import (
	"encoding/csv"
	"io"
	"math"
	"net/http"
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

// ---------------- BNR CONFIG ----------------

const (
	numChannels         = 3
	numSubcarriers      = 30
	percentileBaseline  = 15.0 // perc-15 per subcarrier (lintas waktu)
	dropoutRatio        = 5e-4 // A/N < 5e-4 => masked
	clipDbLo            = -20.0
	clipDbHi            = 20.0
	minGapSubcarrier    = 3   // non-redundant spacing antar subcarrier
	maxAbsCorrThreshold = 0.8 // non-redundant korelasi |rho| < 0.8
)

// ---------------- Small utilities ----------------

func absInt(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func percentileSorted(x []float64, p float64) float64 {
	// x diasumsikan sudah sorted ascending
	n := len(x)
	if n == 0 {
		return math.NaN()
	}
	if p <= 0 {
		return x[0]
	}
	if p >= 100 {
		return x[n-1]
	}
	r := p / 100.0 * float64(n-1)
	lo := int(math.Floor(r))
	hi := int(math.Ceil(r))
	if lo == hi {
		return x[lo]
	}
	w := r - float64(lo)
	return x[lo]*(1.0-w) + x[hi]*w
}

func percentile(x []float64, p float64) float64 {
	if len(x) == 0 {
		return math.NaN()
	}
	cp := make([]float64, len(x))
	copy(cp, x)
	sort.Float64s(cp)
	return percentileSorted(cp, p)
}

func medianIgnoreNaN(x []float64) float64 {
	buf := make([]float64, 0, len(x))
	for _, v := range x {
		if !math.IsNaN(v) {
			buf = append(buf, v)
		}
	}
	return percentile(buf, 50)
}

func p90IgnoreNaN(x []float64) float64 {
	buf := make([]float64, 0, len(x))
	for _, v := range x {
		if !math.IsNaN(v) {
			buf = append(buf, v)
		}
	}
	return percentile(buf, 90)
}

func stdIgnoreNaN(x []float64) float64 {
	cnt, sum, sum2 := 0.0, 0.0, 0.0
	for _, v := range x {
		if !math.IsNaN(v) {
			cnt++
			sum += v
			sum2 += v * v
		}
	}
	if cnt <= 1 {
		return 0
	}
	mean := sum / cnt
	variance := (sum2 / cnt) - mean*mean
	if variance < 0 {
		variance = 0
	}
	return math.Sqrt(variance)
}

func madIgnoreNaN(x []float64, med float64) float64 {
	buf := make([]float64, 0, len(x))
	for _, v := range x {
		if !math.IsNaN(v) {
			buf = append(buf, math.Abs(v-med))
		}
	}
	return medianIgnoreNaN(buf)
}

func robustSigmaIgnoreNaN(x []float64) float64 {
	med := medianIgnoreNaN(x)
	mad := madIgnoreNaN(x, med)
	sigma := 1.4826 * mad
	if sigma <= 0 || math.IsNaN(sigma) {
		return stdIgnoreNaN(x)
	}
	return sigma
}

func fillNaNWithMedian(x []float64) []float64 {
	med := medianIgnoreNaN(x)
	out := make([]float64, len(x))
	for i, v := range x {
		if math.IsNaN(v) {
			out[i] = med
		} else {
			out[i] = v
		}
	}
	return out
}

func pearsonCorrIgnoreNaN(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0
	}
	aa := fillNaNWithMedian(a)
	bb := fillNaNWithMedian(b)

	// handle zero-variance
	var sumA, sumB, sumA2, sumB2, sumAB float64
	n := float64(len(aa))
	for i := range aa {
		va := aa[i]
		vb := bb[i]
		sumA += va
		sumB += vb
		sumA2 += va * va
		sumB2 += vb * vb
		sumAB += va * vb
	}
	num := sumAB - (sumA*sumB)/n
	den := math.Sqrt((sumA2 - (sumA*sumA)/n) * (sumB2 - (sumB*sumB)/n))
	if den == 0 {
		if num == 0 {
			return 0
		}
		return 1
	}
	return num / den
}

// parsing helpers (lebih toleran terhadap koma desimal / header opsional)
func parseFloatLoose(s string) (float64, bool) {
	if v, err := strconv.ParseFloat(s, 64); err == nil {
		return v, true
	}
	s2 := strings.ReplaceAll(s, ",", ".")
	if v, err := strconv.ParseFloat(s2, 64); err == nil {
		return v, true
	}
	return math.NaN(), false
}

func readFloatRow(row []string) ([]float64, float64) {
	vals := make([]float64, len(row))
	ok := 0
	for i, cell := range row {
		v, okv := parseFloatLoose(cell)
		if okv {
			ok++
		}
		vals[i] = v
	}
	return vals, float64(ok) / float64(len(row))
}

// pilih jendela 90 kolom berurutan yang paling “sehat” (valid ratio tertinggi)
func pick90ConsecutiveCols(data [][]float64) []int {
	if len(data) == 0 {
		return nil
	}
	nCols := len(data[0])
	// valid ratio per kolom
	valid := make([]float64, nCols)
	for j := 0; j < nCols; j++ {
		c := 0
		for i := 0; i < len(data); i++ {
			if !math.IsNaN(data[i][j]) {
				c++
			}
		}
		valid[j] = float64(c) / float64(len(data))
	}
	// cari window 90 dengan rata-rata valid terbesar
	bestStart, bestScore := 0, -1.0
	if nCols >= 90 {
		for start := 0; start <= nCols-90; start++ {
			sum := 0.0
			for j := start; j < start+90; j++ {
				sum += valid[j]
			}
			score := sum / 90.0
			if score > bestScore {
				bestScore = score
				bestStart = start
			}
		}
		idx := make([]int, 90)
		for k := 0; k < 90; k++ {
			idx[k] = bestStart + k
		}
		return idx
	}
	// fallback (harusnya tidak terjadi)
	idx := make([]int, nCols)
	for k := 0; k < nCols; k++ {
		idx[k] = k
	}
	return idx
}

// ---------------- Core: BNR Top-5 per Channel ----------------

func (h *PlotHandler) GetPlots(w http.ResponseWriter, r *http.Request) {
	// 1) Metadata CSV
	id := mux.Vars(r)["id"]
	meta, err := h.csvRepo.GetByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "CSV not found")
		return
	}

	// 2) Ambil objek CSV dari MinIO
	obj, err := h.minioClient.GetObject(r.Context(), h.bucketName, meta.ObjectPath, minio.GetObjectOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch CSV")
		return
	}
	defer obj.Close()

	// 3) Parse CSV → [][]float64 (baris=paket, kolom=data)
	reader := csv.NewReader(obj)

	first, err := reader.Read()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Read CSV: "+err.Error())
		return
	}
	vals, ratio := readFloatRow(first)

	data := make([][]float64, 0, 1024)
	// jika baris pertama lebih mirip data (>=60% cell ter-parse), masukkan sebagai data pertama
	if ratio > 0.6 {
		data = append(data, vals)
	}
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Parse CSV: "+err.Error())
			return
		}
		v, _ := readFloatRow(row)
		data = append(data, v)
	}
	if len(data) == 0 {
		respondError(w, http.StatusBadRequest, "Empty CSV")
		return
	}

	P := len(data)
	nCols := len(data[0])
	if nCols < numChannels*numSubcarriers {
		respondError(w, http.StatusBadRequest, "CSV must contain at least 90 numeric columns (3×30)")
		return
	}

	// 4) Pilih 90 kolom berurutan terbaik lalu bentuk amplitudo [C][S][P]
	colIdx := pick90ConsecutiveCols(data)
	if len(colIdx) < numChannels*numSubcarriers {
		respondError(w, http.StatusBadRequest, "CSV must contain at least 90 usable numeric columns")
		return
	}

	C := numChannels
	S := numSubcarriers

	amp := make([][][]float64, C)
	for c := 0; c < C; c++ {
		amp[c] = make([][]float64, S)
		for s := 0; s < S; s++ {
			amp[c][s] = make([]float64, P)

			col := colIdx[c*S+s] // mapping blok 30-30-30 per channel
			for p := 0; p < P; p++ {
				v := data[p][col]
				if math.IsNaN(v) || v <= 0 {
					v = math.NaN()
				}
				amp[c][s][p] = v
			}
		}
	}
	// 5) Hitung BNR dB (robust-sigma/MAD) dan siapkan statistik
	bnr := make([][][]float64, C)        // nilai dB (NaN untuk masked)
	bnrMasked := make([][][]*float64, C) // untuk JSON (nil = masked)
	validPct := make([][]float64, C)
	medPerSC := make([][]float64, C)
	seriesStore := make([][][]float64, C) // untuk korelasi

	for c := 0; c < C; c++ {
		bnr[c] = make([][]float64, S)
		bnrMasked[c] = make([][]*float64, S)
		validPct[c] = make([]float64, S)
		medPerSC[c] = make([]float64, S)
		seriesStore[c] = make([][]float64, S)

		for s := 0; s < S; s++ {
			// robust sigma per subcarrier (MAD*1.4826, fallback std)
			sigma := robustSigmaIgnoreNaN(amp[c][s])
			series := make([]float64, P)
			seriesMasked := make([]*float64, P)
			validCount := 0

			for p := 0; p < P; p++ {
				val := amp[c][s][p]
				if math.IsNaN(val) || sigma <= 0 || math.IsNaN(sigma) {
					series[p] = math.NaN()
					seriesMasked[p] = nil
					continue
				}
				ratio := math.Abs(val) / sigma
				if ratio <= 0 {
					series[p] = math.NaN()
					seriesMasked[p] = nil
					continue
				}
				db := 20.0 * math.Log10(ratio)
				if db < clipDbLo {
					series[p] = math.NaN()
					seriesMasked[p] = nil
					continue
				}
				series[p] = db
				seriesMasked[p] = &db
				validCount++
			}
			bnr[c][s] = series
			bnrMasked[c][s] = seriesMasked
			seriesStore[c][s] = series
			medPerSC[c][s] = medianIgnoreNaN(series)
			if P > 0 {
				validPct[c][s] = 100.0 * float64(validCount) / float64(P)
			}
		}
	}

	// 6) Ranking Top-5 per channel (RAW median BNR) dengan non-redundan
	type scStat struct {
		Channel    int        `json:"channel"`
		Rank       int        `json:"rank"`
		Subcarrier int        `json:"subcarrier"`
		Series     []*float64 `json:"series"` // null untuk masked
		Median     float64    `json:"median"`
		P90        float64    `json:"p90"`
		Std        float64    `json:"std"`
		ValidPct   float64    `json:"validPct"`
	}

	type channelResp struct {
		Channel int      `json:"channel"`
		Top5    []scStat `json:"top5"`
	}

	var results []channelResp
	var indices [][]int // 1-based untuk kemudahan UI

	for c := 0; c < C; c++ {
		// kandidat diurutkan berdasarkan median BNR menurun
		type pair struct {
			s     int
			score float64
		}
		cands := make([]pair, S)
		for s := 0; s < S; s++ {
			cands[s] = pair{s: s, score: medPerSC[c][s]}
		}
		sort.Slice(cands, func(i, j int) bool { return cands[i].score > cands[j].score })

		chosen := make([]int, 0, 5)
		for _, p := range cands {
			if math.IsNaN(p.score) {
				continue
			}
			// cek jarak minimal antarsubcarrier
			okGap := true
			for _, jj := range chosen {
				if absInt(p.s-jj) < minGapSubcarrier {
					okGap = false
					break
				}
			}
			if !okGap {
				continue
			}
			// cek korelasi bentuk waktu
			okCorr := true
			for _, jj := range chosen {
				rho := math.Abs(pearsonCorrIgnoreNaN(seriesStore[c][p.s], seriesStore[c][jj]))
				if math.IsNaN(rho) || rho >= maxAbsCorrThreshold {
					okCorr = false
					break
				}
			}
			if !okCorr {
				continue
			}
			chosen = append(chosen, p.s)
			if len(chosen) == 5 {
				break
			}
		}
		// fallback relax (gap lalu korelasi) bila belum cukup 5
		if len(chosen) < 5 {
			for _, p := range cands {
				found := false
				for _, jj := range chosen {
					if jj == p.s || absInt(jj-p.s) < minGapSubcarrier {
						found = true
						break
					}
				}
				if !found && !math.IsNaN(p.score) {
					chosen = append(chosen, p.s)
					if len(chosen) == 5 {
						break
					}
				}
			}
		}
		if len(chosen) < 5 {
			for _, p := range cands {
				seen := false
				for _, jj := range chosen {
					if jj == p.s {
						seen = true
						break
					}
				}
				if !seen && !math.IsNaN(p.score) {
					chosen = append(chosen, p.s)
					if len(chosen) == 5 {
						break
					}
				}
			}
		}

		// siapkan payload channel
		chRes := channelResp{Channel: c + 1}
		for rank, s := range chosen {
			ser := bnr[c][s]
			stats := scStat{
				Channel:    c + 1,
				Rank:       rank + 1,
				Subcarrier: s + 1,
				Series:     bnrMasked[c][s],
				Median:     medianIgnoreNaN(ser),
				P90:        p90IgnoreNaN(ser),
				Std:        stdIgnoreNaN(ser),
				ValidPct:   validPct[c][s],
			}
			chRes.Top5 = append(chRes.Top5, stats)
		}
		results = append(results, chRes)

		idx1 := make([]int, 0, len(chosen))
		for _, s := range chosen {
			idx1 = append(idx1, s+1) // 1-based
		}
		indices = append(indices, idx1)
	}

	// 7) Response JSON
	resp := map[string]interface{}{
		"meta": map[string]interface{}{
			"method":      "Band-to-Noise Ratio robust-σ (Median Absolute Deviation)",
			"clipDb":      []float64{clipDbLo, clipDbHi},
			"channels":    numChannels,
			"subcarriers": numSubcarriers,
			"packets":     P,
			"ranking":     "RAW median BNR",
		},
		"indices1based": indices,
		"channels":      results,
	}

	respondJSON(w, http.StatusOK, resp)
}
