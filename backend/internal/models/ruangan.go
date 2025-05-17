package models

import (
	"time"

	"github.com/google/uuid"
)

type Ruangan struct {
	ID          string    `json:"id" db:"id" validate:"required,uuid"`
	NamaRuangan string    `json:"nama_ruangan" db:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64   `json:"panjang" db:"panjang_ruangan" validate:"required,gt=0"`
	Lebar       float64   `json:"lebar" db:"lebar_ruangan" validate:"required,gt=0"`
	PosisiTX    float64   `json:"posisi_tx" db:"posisi_tx" validate:"required"`
	PosisiRX    float64   `json:"posisi_rx" db:"posisi_rx" validate:"required"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// GenerateID untuk membuat UUID sebelum insert
func (r *Ruangan) GenerateID() {
	r.ID = uuid.New().String()
}
