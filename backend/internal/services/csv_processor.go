package services

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
)

func PareseCSVFile(r io.Reader) ([][]float64, error) {
	reader := csv.NewReader(r)
	var matrix [][]float64

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading CSV: %w", err)
		}

		row := make([]float64, len(record))
		for i, value := range record {
			num, err := strconv.ParseFloat(value, 64)
			if err != nil {
				return nil, fmt.Errorf("error parsing float from CSV: %w", err)
			}
			row[i] = num
		}
		matrix = append(matrix, row)
	}
	return matrix, nil
}
