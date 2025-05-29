package models

import "time"

type Data struct {
	// The name of the data point
	Amplitude   []float64   `json:"amplitude" db:"data_amplitude" validate:"required"`
	Phase       []float64   `json:"phase" db:"data_phase" validate:"required"`
	RSSI        []float64   `json:"rssi" db:"data_rssi" validate:"required"`
	BatchID     int         `json:"batch_id" db:"id_batch" validate:"required"`
	RuanganID   string      `json:"ruangan_id" db:"id_ruangan"`
	FilterID    string      `json:"filter_id" db:"id_filter"`
	Timestamp   []time.Time `json:"timestamp" db:"timestamp" validate:"required"`
	NamaRuangan string      `json:"nama_ruangan" db:"nama_ruangan" validate:"required"`
	NamaFilter  string      `json:"nama_filter" db:"nama_filter" validate:"required"`
}

type HasilLokalisasi struct {
	ID        string  `json:"id" db:"id" validate:"required,uuid"`
	X         float64 `json:"x" db:"hasil_x" validate:"required"`
	Y         float64 `json:"y" db:"hasil_y" validate:"required"`
	MetodeID  string  `json:"metode_id" db:"id_metode" validate:"required,uuid"`
	RuanganID string  `json:"ruangan_id" db:"id_ruangan" validate:"required,uuid"`
	BatchID   int     `json:"batch_id" db:"id_batch" validate:"required"`
	CreatedAt string  `json:"created_at" db:"created_at"`
}
