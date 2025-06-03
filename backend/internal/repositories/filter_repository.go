package repositories

import (
	"context"
	"database/sql"

	"cetasense-v2.0/internal/models"
)

type FilterRepository struct {
	db *sql.DB
}

func NewFilterRepository(db *sql.DB) *FilterRepository {
	return &FilterRepository{db: db}
}

// Create filter dengan prepared statement
func (r *FilterRepository) Create(ctx context.Context, filter *models.Filter) error {
	stmt, err := r.db.PrepareContext(ctx, `
		INSERT INTO filter 
		(id, nama_filter)
		VALUES (?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx,
		filter.ID,
		filter.NamaFilter,
	)

	return err
}

// GetByID untuk mendapatkan filter berdasarkan ID
func (r *FilterRepository) GetByID(ctx context.Context, id string) (*models.Filter, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT 
			id, nama_filter
		FROM filter 
		WHERE id = ?`, id)

	var filter models.Filter
	err := row.Scan(
		&filter.ID,
		&filter.NamaFilter,
	)

	if err != nil {
		return nil, err
	}

	return &filter, nil
}

// GetAll untuk mendapatkan semua filter
func (r *FilterRepository) GetAll(ctx context.Context) ([]*models.Filter, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT 
			id, nama_filter
		FROM filter`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var filters []*models.Filter
	for rows.Next() {
		var filter models.Filter
		if err := rows.Scan(
			&filter.ID,
			&filter.NamaFilter,
		); err != nil {
			return nil, err
		}
		filters = append(filters, &filter)
	}

	return filters, nil
}

// Update filter dengan prepared statement
func (r *FilterRepository) Update(ctx context.Context, filter *models.Filter) error {
	stmt, err := r.db.PrepareContext(ctx, `
		UPDATE filter 
		SET nama_filter = ?
		WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx,
		filter.NamaFilter,
		filter.ID,
	)

	return err
}

// Delete filter dengan prepared statement
func (r *FilterRepository) Delete(ctx context.Context, id string) error {
	stmt, err := r.db.PrepareContext(ctx, `
		DELETE FROM filter 
		WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx, id)
	if err != nil {
		return err
	}

	return nil
}

// Close untuk menutup koneksi database
func (r *FilterRepository) Close() error {
	if r.db != nil {
		return r.db.Close()
	}
	return nil
}

func (r *DataRepository) GetAllBatchIDs(ctx context.Context) ([]int, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT DISTINCT id_batch FROM data")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var batches []int
	for rows.Next() {
		var batchID int
		if err := rows.Scan(&batchID); err != nil {
			return nil, err
		}
		batches = append(batches, batchID)
	}

	return batches, nil
}
