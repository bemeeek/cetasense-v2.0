package models

import (
	"github.com/google/uuid"
)

// DTO untuk CREATE request (client -> server)
type CreateRuanganRequest struct {
	NamaRuangan string  `json:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64 `json:"panjang" validate:"required,gt=0"`
	Lebar       float64 `json:"lebar" validate:"required,gt=0"`
	Posisi_X_TX float64 `json:"posisi_x_tx" validate:"required"`
	Posisi_Y_TX float64 `json:"posisi_y_tx" validate:"required"`
	Posisi_X_RX float64 `json:"posisi_x_rx" validate:"required"`
	Posisi_Y_RX float64 `json:"posisi_y_rx" validate:"required"`
}

// DTO untuk UPDATE request (client -> server)
type UpdateRuanganRequest struct {
	NamaRuangan string  `json:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64 `json:"panjang" validate:"required,gt=0"`
	Lebar       float64 `json:"lebar" validate:"required,gt=0"`
	Posisi_X_TX float64 `json:"posisi_x_tx" validate:"required"`
	Posisi_Y_TX float64 `json:"posisi_y_tx" validate:"required"`
	Posisi_X_RX float64 `json:"posisi_x_rx" validate:"required"`
	Posisi_Y_RX float64 `json:"posisi_y_rx" validate:"required"`
}

// Model database
type Ruangan struct {
	ID          string  `json:"id" db:"id"` // UUID di-generate server
	NamaRuangan string  `json:"nama_ruangan" db:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64 `json:"panjang" db:"panjang_ruangan" validate:"required,gt=0"`
	Lebar       float64 `json:"lebar" db:"lebar_ruangan" validate:"required,gt=0"`
	Posisi_X_TX float64 `json:"posisi_x_tx" db:"posisi_x_tx" validate:"required,gt=0"`
	Posisi_Y_TX float64 `json:"posisi_y_tx" db:"posisi_y_tx" validate:"required,gt=0"`
	Posisi_X_RX float64 `json:"posisi_x_rx" db:"posisi_x_rx" validate:"required,gt=0"`
	Posisi_Y_RX float64 `json:"posisi_y_rx" db:"posisi_y_rx" validate:"required,gt=0"`
}

// Generate ID sebelum insert
func (r *Ruangan) GenerateID() {
	r.ID = uuid.New().String()
}
