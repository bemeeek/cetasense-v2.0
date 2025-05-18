package repositories

import (
	"context"
	"database/sql"

	"cetasense-v2.0/internal/models"
)

type DataRepository struct {
	db *sql.DB
}

func NewDataRepository(db *sql.DB) *DataRepository {
	return &DataRepository{db: db}
}

// &ruangan.CreatedAt,
func (r *DataRepository) Create(ctx context.Context, data *models.Data) error {
	stmt, err := r.db.PrepareContext(ctx, `
		INSERT INTO data 
		(id, data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx,
		data.ID,
		data.Amplitude,
		data.Phase,
		data.RSSI,
		data.BatchID,
		data.RuanganID,
		data.FilterID,
		data.Timestamp,
	)

	return err
}

// GetByID untuk mendapatkan data berdasarkan ID
func (r *DataRepository) GetByID(ctx context.Context, id string) (*models.Data, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT 
			id, data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp 
		FROM data 
		WHERE id = ?`, id)

	var data models.Data
	err := row.Scan(
		&data.ID,
		&data.Amplitude,
		&data.Phase,
		&data.RSSI,
		&data.BatchID,
		&data.RuanganID,
		&data.FilterID,
		&data.Timestamp,
	)

	if err != nil {
		return nil, err
	}

	return &data, nil
}

// Update untuk memperbarui data
func (r *DataRepository) Update(ctx context.Context, data *models.Data) error {
	stmt, err := r.db.PrepareContext(ctx, `
		UPDATE data 
		SET data_amplitude = ?, data_phase = ?, data_rssi = ?, id_batch = ?, id_ruangan = ?, id_filter = ?, timestamp = ?
		WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx,
		data.Amplitude,
		data.Phase,
		data.RSSI,
		data.BatchID,
		data.RuanganID,
		data.FilterID,
		data.Timestamp,
		data.ID,
	)

	return err
}

// Delete untuk menghapus data
func (r *DataRepository) Delete(ctx context.Context, id string) error {
	stmt, err := r.db.PrepareContext(ctx, `
		DELETE FROM data 
		WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx, id)

	return err
}
