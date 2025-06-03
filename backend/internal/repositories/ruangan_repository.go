package repositories

import (
	"context"
	"database/sql"
	"fmt"

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
        (id, nama_ruangan, panjang_ruangan, lebar_ruangan, posisi_tx, posisi_rx)
        VALUES (?, ?, ?, ?, ?, ?)`)
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
	)

	return err
}

func (r *RuanganRepository) GetRuanganByNama(ctx context.Context, nama string) (*models.Ruangan, error) {
	row := r.db.QueryRowContext(ctx, `
        SELECT id, nama_ruangan, panjang_ruangan, lebar_ruangan, posisi_tx, posisi_rx 
        FROM ruangan 
        WHERE nama_ruangan = ?`, nama)

	var ruangan models.Ruangan
	err := row.Scan(
		&ruangan.ID,
		&ruangan.NamaRuangan,
		&ruangan.Panjang,
		&ruangan.Lebar,
		&ruangan.PosisiTX,
		&ruangan.PosisiRX,
	)
	if err != nil {
		return nil, fmt.Errorf("ruangan dengan nama '%s' tidak ditemukan: %v", nama, err)
	}
	return &ruangan, nil
}

// GetByID dengan error handling
func (r *RuanganRepository) GetByID(ctx context.Context, id string) (*models.Ruangan, error) {
	row := r.db.QueryRowContext(ctx, `
        SELECT 
            id, nama_ruangan, panjang_ruangan, lebar_ruangan, 
            posisi_tx, posisi_rx
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
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ruangan with ID %s not found", id)
	}

	return &ruangan, err
}

// Update ruangan dengan prepared statement
func (r *RuanganRepository) Update(ctx context.Context, ruangan *models.Ruangan) error {
	stmt, err := r.db.PrepareContext(ctx, `
		UPDATE ruangan 
		SET nama_ruangan = ?, panjang_ruangan = ?, lebar_ruangan = ?, 
			posisi_tx = ?, posisi_rx = ? 
		WHERE id = ?`)
	if err != nil {
		return fmt.Errorf("prepare error: %w", err)
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx,
		ruangan.NamaRuangan,
		ruangan.Panjang,
		ruangan.Lebar,
		ruangan.PosisiTX,
		ruangan.PosisiRX,
		ruangan.ID,
	)

	return err
}

// Delete ruangan dengan prepared statement
func (r *RuanganRepository) Delete(ctx context.Context, id string) error {
	stmt, err := r.db.PrepareContext(ctx, `
		DELETE FROM ruangan 
		WHERE id = ?`)
	if err != nil {
		return fmt.Errorf("prepare error: %w", err)
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx, id)
	if err != nil {
		return fmt.Errorf("exec error: %w", err)
	}

	return nil
}

// GetAll untuk mendapatkan semua ruangan
func (r *RuanganRepository) GetAll(ctx context.Context) ([]*models.Ruangan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT 
			id, nama_ruangan, panjang_ruangan, lebar_ruangan, 
			posisi_tx, posisi_rx
		FROM ruangan`)
	if err != nil {
		return nil, fmt.Errorf("query error: %w", err)
	}
	defer rows.Close()

	var ruangans []*models.Ruangan
	for rows.Next() {
		var ruangan models.Ruangan
		if err := rows.Scan(
			&ruangan.ID,
			&ruangan.NamaRuangan,
			&ruangan.Panjang,
			&ruangan.Lebar,
			&ruangan.PosisiTX,
			&ruangan.PosisiRX,
		); err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		ruangans = append(ruangans, &ruangan)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return ruangans, nil
}
