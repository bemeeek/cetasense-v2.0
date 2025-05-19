package models

import (
	"time"

	"github.com/google/uuid"
)

type Filter struct {
	ID         string    `json:"id" db:"id"`
	NamaFilter string    `json:"nama_filter" db:"nama_filter" validate:"required,min=3"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// GenerateID untuk filter
func (f *Filter) GenerateID() {
	f.ID = uuid.New().String()
}
