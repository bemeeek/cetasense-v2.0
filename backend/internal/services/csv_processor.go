package services

import (
	"context"
	"encoding/csv"
	"io"
	"strconv"
	"time"

	"cetasense-v2.0/internal/models"
	"cetasense-v2.0/internal/repositories"
)

type UploadStats struct {
	RowsProcessed int
	Errors        []string
}

type CSVProcessor struct {
	dataRepo repositories.DataRepository
}

func NewCSVProcessor(dataRepo repositories.DataRepository) *CSVProcessor {
	return &CSVProcessor{
		dataRepo: dataRepo,
	}
}

func (p *CSVProcessor) ProcessCSIUpload(
	file io.Reader,
	ruanganID string,
	filterID string,
	batchName string,
) (*UploadStats, error) {
	stats := &UploadStats{}
	reader := csv.NewReader(file)

	_, _ = reader.Read() // Skip header row

	batchID, err := strconv.Atoi(batchName)
	if err != nil {
		stats.Errors = append(stats.Errors, "Invalid batchName: "+batchName)
		return stats, nil
	}

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break // End of file
		}
		if err != nil {
			stats.Errors = append(stats.Errors, "CSV read error :"+err.Error())
		}

		if len(record) < 4 {
			stats.Errors = append(stats.Errors, "Invalid record length")
			continue // Skip invalid records
		}

		amplitude, _ := strconv.ParseFloat(record[0], 64)
		phase, _ := strconv.ParseFloat(record[1], 64)
		rssi, _ := strconv.ParseFloat(record[2], 64)
		timestamp := record[3]

		// Parse the record fields
		parsedTime, err := time.Parse(time.RFC3339, timestamp)
		if err != nil {
			stats.Errors = append(stats.Errors, "Invalid timestamp format: "+timestamp)
			continue // Skip record if timestamp parsing fails
		}
		data := models.Data{
			Amplitude:   []float64{amplitude},
			Phase:       []float64{phase},
			RSSI:        []float64{rssi},
			BatchID:     batchID,
			NamaRuangan: ruanganID,
			FilterID:    filterID,
			Timestamp:   []time.Time{parsedTime},
		}

		err = p.dataRepo.Create(context.Background(), &data)
		if err != nil {
			stats.Errors = append(stats.Errors, "Database insert error: "+err.Error())
			continue // Skip this record on error
		} else {
			stats.RowsProcessed++
		}
	}

	// Return the upload statistics
	return stats, nil
}
