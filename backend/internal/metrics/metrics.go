package metrics

import (
	"fmt"
	"log"
	"os"
	"time"
)

var Logger *log.Logger
var FrontendLogger *log.Logger
var StepsLogger *log.Logger
var MetricsLogger *log.Logger

func Init(path string) {
	f, err := os.OpenFile(path,
		os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatalf("cannot open metrics file: %v", err)
	}
	Logger = log.New(f, "", 0)
	if info, _ := f.Stat(); info.Size() == 0 {
		Logger.Println("timestamp,reqID,method,route,ttfb_ms,ttlb_ms")
	}
}
func LogMetricJSON(reqID, event, method, route string, status int, ttfbMs, ttlbMs float64) {
	jsonStr := fmt.Sprintf(`{"reqID": "%s", "event": "%s", "method": "%s", "route": "%s", "status": %d, "ttfb_ms": %f, "ttlb_ms": %f, "msg": "request-metric"}`,
		reqID, event, method, route, status, ttfbMs, ttlbMs)
	Logger.Println(jsonStr)
}

func InitFrontendLogger(path string) {
	f, err := os.OpenFile(path,
		os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatalf("cannot open frontend metrics file: %v", err)
	}
	FrontendLogger = log.New(f, "", 0)
	if info, _ := f.Stat(); info.Size() == 0 {
		FrontendLogger.Println("timestamp,reqID,type,route,ttfb_ms,ttlb_ms")
	}
}

func InitSteps(path string) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatalf("cannot open steps file: %v", err)
	}
	StepsLogger = log.New(f, "", 0)
	if info, _ := f.Stat(); info.Size() == 0 {
		StepsLogger.Println("timestamp,reqID,stepName,duration_ms")
	}
}

// helper tanggal
func Now() string {
	return time.Now().Format("2006-01-02 15:04:05.000")
}

// LogRequest writes START/END per-request metrics
func LogRequest(reqID, eventType, method, route string, status int, ttfbMs, ttlbMs float64) {
	MetricsLogger.Printf("%s,%s,%s,%s,%s,%d,%.2f,%.2f",
		Now(), reqID, eventType, method, route, status, ttfbMs, ttlbMs,
	)
}

func Step(reqID, stepName string, durationMs float64) {
	StepsLogger.Printf("%s,%s,%s,%.2f",
		Now(), reqID, stepName, durationMs,
	)
}
