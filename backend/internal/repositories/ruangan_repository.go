package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cetasense-v2.0/internal/models"
)

type RuanganRepository struct {
	db *sql.DB
}

func NewRuanganRepository(db *sql.DB) *RuanganRepository {
	return &RuanganRepository{db: db}
}

// Create ruangan dengan prepared statement
func (r *RuanganRepository) Create(ctx context.Context, ruangan *models.Ruangan) error {
	stmt, err := r.db.PrepareContext(ctx, `
        INSERT INTO ruangan 
        (id, nama_ruangan, panjang_ruangan, lebar_ruangan, posisi_tx, posisi_rx, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("prepare error: %w", err)
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx,
		ruangan.ID,
		ruangan.NamaRuangan,
		ruangan.Panjang,
		ruangan.Lebar,
		ruangan.PosisiTX,
		ruangan.PosisiRX,
		time.Now().UTC(),
	)

	return err
}

// GetByID dengan error handling
func (r *RuanganRepository) GetByID(ctx context.Context, id string) (*models.Ruangan, error) {
	row := r.db.QueryRowContext(ctx, `
        SELECT 
            id, nama_ruangan, panjang_ruangan, lebar_ruangan, 
            posisi_tx, posisi_rx, created_at 
        FROM ruangan 
        WHERE id = ?`, id)

	var ruangan models.Ruangan
	err := row.Scan(
		&ruangan.ID,
		&ruangan.NamaRuangan,
		&ruangan.Panjang,
		&ruangan.Lebar,
		&ruangan.PosisiTX,
		&ruangan.PosisiRX,
		&ruangan.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ruangan with ID %s not found", id)
	}

	return &ruangan, err
}
