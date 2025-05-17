package models

import (
	"time"

	"github.com/google/uuid"
)

type Data struct {
	// The name of the data point
	ID        string    `json:"id" db:"id" validate:"required,uuid"`
	Amplitude float64   `json:"amplitude" db:"data_amplitude" validate:"required"`
	Phase     float64   `json:"phase" db:"data_phase" validate:"required"`
	RSSI      float64   `json:"rssi" db:"data_rssi" validate:"required"`
	BatchID   int       `json:"batch_id" db:"id_batch" validate:"required"`
	RuanganID string    `json:"ruangan_id" db:"id_ruangan" validate:"required,uuid"`
	FilterID  string    `json:"filter_id" db:"id_filter" validate:"required,uuid"`
	Timestamp time.Time `json:"timestamp" db:"timestamp" validate:"required"`
}

type HasilLokalisasi struct {
	ID        string    `json:"id" db:"id" validate:"required,uuid"`
	X         float64   `json:"x" db:"hasil_x" validate:"required"`
	Y         float64   `json:"y" db:"hasil_y" validate:"required"`
	MetodeID  string    `json:"metode_id" db:"id_metode" validate:"required,uuid"`
	RuanganID string    `json:"ruangan_id" db:"id_ruangan" validate:"required,uuid"`
	BatchID   int       `json:"batch_id" db:"id_batch" validate:"required"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

func (d *Data) GenerateID() {
	d.ID = uuid.New().String()
}
