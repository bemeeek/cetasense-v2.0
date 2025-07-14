package handlers

import (
	"encoding/json"
	"net/http"

	"cetasense-v2.0/internal/metrics"
)

type FrontendMetric struct {
	ReqID string  `json:"reqID"`
	Type  string  `json:"type"`    // "page" atau "fetch"
	Route string  `json:"route"`   // path URL
	TTFB  float64 `json:"ttfb_ms"` // ms
	TTLB  float64 `json:"ttlb_ms"` // ms
}

func HandleFrontendLog(w http.ResponseWriter, r *http.Request) {
	var m FrontendMetric
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, "invalid JSON", 400)
		return
	}
	// tulis CSV
	metrics.FrontendLogger.Printf("%s,%s,%s,%s,%.2f,%.2f",
		metrics.Now(),
		m.ReqID, m.Type, m.Route,
		m.TTFB, m.TTLB,
	)
	w.WriteHeader(204)
}
