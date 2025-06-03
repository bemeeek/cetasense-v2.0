package services

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"reflect"
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
	return &CSVProcessor{dataRepo: dataRepo}
}

func (p *CSVProcessor) ProcessCSIUpload(
	file io.Reader,
	namaRuangan string,
	namaFilter string,
	batchID int,
) (*UploadStats, error) {
	stats := &UploadStats{}
	reader := csv.NewReader(file)

	// Skip header row
	header, err := reader.Read()
	if err != nil {
		stats.Errors = append(stats.Errors, "Failed to read header: "+err.Error())
		return stats, nil
	}

	// Validasi header
	expectedHeader := []string{"amplitude", "phase", "rssi", "timestamp"}
	if !reflect.DeepEqual(header, expectedHeader) {
		stats.Errors = append(stats.Errors,
			fmt.Sprintf("Invalid CSV header. Expected %v, got %v", expectedHeader, header))
		return stats, nil
	}

	if namaRuangan == "" {
		stats.Errors = append(stats.Errors, "Ruangan name is required")
		return stats, nil
	}

	if namaFilter == "" {
		stats.Errors = append(stats.Errors, "Filter name is required")
		return stats, nil
	}

	ruangan, err := p.dataRepo.GetRuanganByNama(context.Background(), namaRuangan)
	if err != nil {
		stats.Errors = append(stats.Errors, "Ruangan not found: "+namaRuangan)
		return stats, nil
	}
	// Dapatkan ID filter berdasarkan nama
	filter, err := p.dataRepo.GetFilterByNama(context.Background(), namaFilter)
	if err != nil {
		stats.Errors = append(stats.Errors, "Filter not found: "+namaFilter)
		return stats, nil
	}

	// Iterasi over records and insert into database
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			stats.Errors = append(stats.Errors, "CSV read error: "+err.Error())
			continue
		}

		if len(record) < 4 {
			stats.Errors = append(stats.Errors, "Invalid record length")
			continue
		}

		amplitude, err := strconv.ParseFloat(record[0], 64)
		if err != nil {
			stats.Errors = append(stats.Errors, "Invalid amplitude: "+record[0])
			continue
		}

		phase, err := strconv.ParseFloat(record[1], 64)
		if err != nil {
			stats.Errors = append(stats.Errors, "Invalid phase: "+record[1])
			continue
		}

		rssi, err := strconv.ParseFloat(record[2], 64)
		if err != nil {
			stats.Errors = append(stats.Errors, "Invalid RSSI: "+record[2])
			continue
		}

		timestamp := record[3]
		parsedTime, err := time.Parse(time.RFC3339, timestamp)
		if err != nil {
			parsedTime, err = time.Parse("2006-01-02 15:04:05.000", timestamp)
			if err != nil {
				parsedTime, err = time.Parse("2006-01-02 15:04:05", timestamp)
				if err != nil {
					stats.Errors = append(stats.Errors, "Invalid timestamp: "+timestamp)
					continue
				}
			}
		}

		data := models.Data{
			Amplitude: []float64{amplitude},
			Phase:     []float64{phase},
			RSSI:      []float64{rssi},
			BatchID:   batchID,
			RuanganID: ruangan.ID, // Gunakan ID ruangan yang ditemukan
			FilterID:  filter.ID,
			Timestamp: []time.Time{parsedTime},
		}

		err = p.dataRepo.Create(context.Background(), &data)
		if err != nil {
			stats.Errors = append(stats.Errors, "Database error Coyyy: "+err.Error())
			continue
		}

		stats.RowsProcessed++
	}

	return stats, nil
}
