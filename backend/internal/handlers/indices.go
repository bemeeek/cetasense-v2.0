package handlers

import (
	"encoding/csv"
	"log"
	"os"
	"strconv"
)

var ThetaScan, TauScan []float64

func init() {
	ThetaScan = loadIndexCSV("theta_scan.csv")
	TauScan = loadIndexCSV("tau_scan.csv")
}

func loadIndexCSV(path string) []float64 {
	f, err := os.Open(path)
	if err != nil {
		log.Fatalf("Failed to open index CSV file %s: %v", path, err)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	record, err := reader.Read()
	if err != nil {
		log.Fatalf("Failed to read index CSV file %s: %v", path, err)
	}

	matrix := make([]float64, len(record))
	for i, value := range record {
		num, err := strconv.ParseFloat(value, 64)
		if err != nil {
			log.Fatalf("Failed to parse float from index CSV file %s: %v", path, err)
		}
		matrix[i] = num
	}
	return matrix
}
