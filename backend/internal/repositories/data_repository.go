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

func (r *DataRepository) GetIDByNamaRuangan(ctx context.Context, NamaRuangan string) (string, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id FROM ruangan WHERE nama_ruangan = ?`, NamaRuangan)
	var id string
	err := row.Scan(&id)
	if err != nil {
		return "", err
	}

	return id, nil
}

func (r *DataRepository) GetIDByNamaFilter(ctx context.Context, NamaFilter string) (string, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id FROM filter WHERE nama_filter = ?`, NamaFilter)
	var id string
	err := row.Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// &ruangan.CreatedAt,
func (r *DataRepository) Create(ctx context.Context, data *models.Data) error {
	// Iterasi untuk memasukkan setiap elemen dalam array
	for i := 0; i < len(data.Amplitude); i++ {
		_, err := r.db.ExecContext(ctx, `
			INSERT INTO data 
			(data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp)
			VALUES (?, ?, ?, ?, 
				(SELECT id FROM ruangan WHERE nama_ruangan = ?), 
				(SELECT id FROM filter WHERE nama_filter = ?), 
				?)`,
			data.Amplitude[i], data.Phase[i], data.RSSI[i], data.BatchID,
			data.NamaRuangan, data.NamaFilter, data.Timestamp[i])

		if err != nil {
			return err
		}
	}
	return nil
}

// GetByID untuk mendapatkan data berdasarkan ID
func (r *DataRepository) GetByID(ctx context.Context, id string, NamaRuangan string, NamaFilter string) (*models.Data, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT 
			id, data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp 
		FROM data 
		WHERE id = ?`, id)
	if err := row.Err(); err != nil {
		return nil, err
	}

	var data models.Data
	err := row.Scan(
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
		SET data_amplitude = ?, data_phase = ?, data_rssi = ?, id_batch = ?, 
			id_ruangan = ?, id_filter = ?, timestamp = ?
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

// GetAll untuk mendapatkan semua data
func (r *DataRepository) GetAll(ctx context.Context) ([]*models.Data, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT 
			id, data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp 
		FROM data`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []*models.Data
	for rows.Next() {
		var d models.Data
		err := rows.Scan(
			&d.Amplitude,
			&d.Phase,
			&d.RSSI,
			&d.BatchID,
			&d.RuanganID,
			&d.FilterID,
			&d.Timestamp,
		)
		if err != nil {
			return nil, err
		}
		data = append(data, &d)
	}

	return data, nil
}
