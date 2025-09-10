package models

import (
	"encoding/json"

	"github.com/google/uuid"
)

// DTO untuk CREATE request (client -> server)
type CreateRuanganRequest struct {
	NamaRuangan string   `json:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64  `json:"panjang" validate:"required,gt=0"`
	Lebar       float64  `json:"lebar" validate:"required,gt=0"`
	Mode        string   `json:"mode" validate:"required,oneof=antenna anchor"`
	Posisi_X_TX float64  `json:"posisi_x_tx" validate:"required_if=Mode antenna,gte=0"`
	Posisi_Y_TX float64  `json:"posisi_y_tx" validate:"required_if=Mode antenna,gte=0"`
	Posisi_X_RX float64  `json:"posisi_x_rx" validate:"required_if=Mode antenna,gte=0"`
	Posisi_Y_RX float64  `json:"posisi_y_rx" validate:"required_if=Mode antenna,gte=0"`
	Anchors     []Anchor `json:"anchors" validate:"required_if=Mode anchor,dive"`
}

type Anchor struct {
	Name string  `json:"name" validate:"required,min=1"`
	X    float64 `json:"x" validate:"gte=0"`
	Y    float64 `json:"y" validate:"gte=0"`
}

// DTO untuk UPDATE request (client -> server)

type UpdateRuanganRequest = CreateRuanganRequest

// Model database
type Ruangan struct {
	ID          string   `json:"id" db:"id"`
	NamaRuangan string   `json:"nama_ruangan" db:"nama_ruangan" validate:"required,min=3"`
	Panjang     float64  `json:"panjang" db:"panjang_ruangan" validate:"required,gt=0"`
	Lebar       float64  `json:"lebar" db:"lebar_ruangan" validate:"required,gt=0"`
	Mode        string   `json:"mode" db:"mode"`
	Posisi_X_TX float64  `json:"posisi_x_tx" db:"posisi_x_tx"`
	Posisi_Y_TX float64  `json:"posisi_y_tx" db:"posisi_y_tx"`
	Posisi_X_RX float64  `json:"posisi_x_rx" db:"posisi_x_rx"`
	Posisi_Y_RX float64  `json:"posisi_y_rx" db:"posisi_y_rx"`
	AnchorsJSON string   `json:"-" db:"anchors"`
	Anchors     []Anchor `json:"anchors" validate:"required_if=Mode anchor,min=1,dive"`
}

// Generate ID sebelum insert
func (r *Ruangan) GenerateID() {
	r.ID = uuid.New().String()
}

func (r *Ruangan) SetAnchors(anchors []Anchor) {
	b, _ := json.Marshal(anchors)
	r.AnchorsJSON = string(b)
	r.Anchors = anchors
}

func (r *Ruangan) ParseAnchors() {
	if r.AnchorsJSON == "" {
		r.Anchors = nil
		return
	}
	var arr []Anchor
	if err := json.Unmarshal([]byte(r.AnchorsJSON), &arr); err == nil {
		r.Anchors = arr
	}
}
