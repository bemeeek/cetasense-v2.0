package models

import (
	"github.com/google/uuid"
)

// DTO untuk CREATE request (client -> server)
type CreateRuanganRequest struct {
	NamaRuangan string  `json:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64 `json:"panjang" validate:"required,gt=0"`
	Lebar       float64 `json:"lebar" validate:"required,gt=0"`
	PosisiTX    float64 `json:"posisi_tx" validate:"required"`
	PosisiRX    float64 `json:"posisi_rx" validate:"required"`
}

// DTO untuk UPDATE request (client -> server)
type UpdateRuanganRequest struct {
	NamaRuangan string  `json:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64 `json:"panjang" validate:"required,gt=0"`
	Lebar       float64 `json:"lebar" validate:"required,gt=0"`
	PosisiTX    float64 `json:"posisi_tx" validate:"required"`
	PosisiRX    float64 `json:"posisi_rx" validate:"required"`
}

// Model database
type Ruangan struct {
	ID          string  `json:"id" db:"id"` // UUID di-generate server
	NamaRuangan string  `json:"nama_ruangan" db:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64 `json:"panjang" db:"panjang_ruangan" validate:"required,gt=0"`
	Lebar       float64 `json:"lebar" db:"lebar_ruangan" validate:"required,gt=0"`
	PosisiTX    float64 `json:"posisi_tx" db:"posisi_tx" validate:"required,gt=0"`
	PosisiRX    float64 `json:"posisi_rx" db:"posisi_rx" validate:"required,gt=0"`
}

// Generate ID sebelum insert
func (r *Ruangan) GenerateID() {
	r.ID = uuid.New().String()
}
