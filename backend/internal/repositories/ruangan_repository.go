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

/* ========== CREATE ========== */

func (r *RuanganRepository) Create(ctx context.Context, m *models.Ruangan) error {
	stmt, err := r.db.PrepareContext(ctx, `
		INSERT INTO ruangan
		(id, nama_ruangan, panjang_ruangan, lebar_ruangan, mode,
		 posisi_x_tx, posisi_y_tx, posisi_x_rx, posisi_y_rx, anchors)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("prepare insert: %w", err)
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx,
		m.ID,
		m.NamaRuangan,
		m.Panjang,
		m.Lebar,
		m.Mode,
		m.Posisi_X_TX,
		m.Posisi_Y_TX,
		m.Posisi_X_RX,
		m.Posisi_Y_RX,
		m.AnchorsJSON,
	)
	if err != nil {
		return fmt.Errorf("exec insert: %w", err)
	}
	return nil
}

/* ========== READ ========== */

func (r *RuanganRepository) GetRuanganByNama(ctx context.Context, nama string) (*models.Ruangan, error) {
	row := r.db.QueryRowContext(ctx, `
  SELECT id, nama_ruangan, panjang_ruangan, lebar_ruangan, mode,
         posisi_x_tx, posisi_y_tx, posisi_x_rx, posisi_y_rx,
         COALESCE(anchors, '') AS anchors
  FROM ruangan
  WHERE nama_ruangan = ?`, nama)

	var m models.Ruangan
	err := row.Scan(
		&m.ID, &m.NamaRuangan, &m.Panjang, &m.Lebar, &m.Mode,
		&m.Posisi_X_TX, &m.Posisi_Y_TX, &m.Posisi_X_RX, &m.Posisi_Y_RX, &m.AnchorsJSON,
	)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, fmt.Errorf("scan by nama: %w", err)
	}
	m.ParseAnchors()
	return &m, nil
}

func (r *RuanganRepository) GetByID(ctx context.Context, id string) (*models.Ruangan, error) {
	row := r.db.QueryRowContext(ctx, `
  SELECT id, nama_ruangan, panjang_ruangan, lebar_ruangan, mode,
         posisi_x_tx, posisi_y_tx, posisi_x_rx, posisi_y_rx,
         COALESCE(anchors, '') AS anchors
  FROM ruangan
  WHERE id = ?`, id)

	var m models.Ruangan
	err := row.Scan(
		&m.ID, &m.NamaRuangan, &m.Panjang, &m.Lebar, &m.Mode,
		&m.Posisi_X_TX, &m.Posisi_Y_TX, &m.Posisi_X_RX, &m.Posisi_Y_RX, &m.AnchorsJSON,
	)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, fmt.Errorf("scan by id: %w", err)
	}
	m.ParseAnchors()
	return &m, nil
}

func (r *RuanganRepository) GetAll(ctx context.Context) ([]*models.Ruangan, error) {
	rows, err := r.db.QueryContext(ctx, `
  SELECT id, nama_ruangan, panjang_ruangan, lebar_ruangan, mode,
         posisi_x_tx, posisi_y_tx, posisi_x_rx, posisi_y_rx,
         COALESCE(anchors, '') AS anchors
  FROM ruangan`)
	if err != nil {
		return nil, fmt.Errorf("query all: %w", err)
	}
	defer rows.Close()

	var list []*models.Ruangan
	for rows.Next() {
		var m models.Ruangan
		if err := rows.Scan(
			&m.ID, &m.NamaRuangan, &m.Panjang, &m.Lebar, &m.Mode,
			&m.Posisi_X_TX, &m.Posisi_Y_TX, &m.Posisi_X_RX, &m.Posisi_Y_RX, &m.AnchorsJSON,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		m.ParseAnchors()
		list = append(list, &m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows err: %w", err)
	}
	return list, nil
}

/* ========== UPDATE ========== */

func (r *RuanganRepository) Update(ctx context.Context, m *models.Ruangan) error {
	stmt, err := r.db.PrepareContext(ctx, `
		UPDATE ruangan
		SET nama_ruangan = ?, panjang_ruangan = ?, lebar_ruangan = ?, mode = ?,
		    posisi_x_tx = ?, posisi_y_tx = ?, posisi_x_rx = ?, posisi_y_rx = ?, anchors = ?
		WHERE id = ?
	`)
	if err != nil {
		return fmt.Errorf("prepare update: %w", err)
	}
	defer stmt.Close()

	res, err := stmt.ExecContext(ctx,
		m.NamaRuangan,
		m.Panjang,
		m.Lebar,
		m.Mode,
		m.Posisi_X_TX,
		m.Posisi_Y_TX,
		m.Posisi_X_RX,
		m.Posisi_Y_RX,
		m.AnchorsJSON,
		m.ID,
	)
	if err != nil {
		return fmt.Errorf("exec update: %w", err)
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return sql.ErrNoRows
	}
	return nil
}

/* ========== DELETE ========== */

func (r *RuanganRepository) Delete(ctx context.Context, id string) error {
	stmt, err := r.db.PrepareContext(ctx, `DELETE FROM ruangan WHERE id = ?`)
	if err != nil {
		return fmt.Errorf("prepare delete: %w", err)
	}
	defer stmt.Close()

	res, err := stmt.ExecContext(ctx, id)
	if err != nil {
		return fmt.Errorf("exec delete: %w", err)
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return sql.ErrNoRows
	}
	return nil
}
