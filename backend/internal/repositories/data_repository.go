package repositories

import (
	"context"
	"database/sql"
	"fmt"

	"cetasense-v2.0/internal/models"
)

type DataRepository struct {
	db *sql.DB
}

func NewDataRepository(db *sql.DB) *DataRepository {
	return &DataRepository{db: db}
}

func (r *DataRepository) GetRuanganByNama(ctx context.Context, nama string) (*models.Ruangan, error) {
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
		return nil, fmt.Errorf("ruangan dengan nama '%s' tidak ditemukan: %v", nama, err) // Error lebih spesifik jika tidak ditemukan
	}
	return &ruangan, nil
}

func (r *DataRepository) GetFilterByNama(ctx context.Context, nama string) (*models.Filter, error) {
	row := r.db.QueryRowContext(ctx, `
        SELECT id, nama_filter 
        FROM filter 
        WHERE nama_filter = ?`, nama)

	var filter models.Filter
	err := row.Scan(
		&filter.ID,
		&filter.NamaFilter,
	)
	if err != nil {
		return nil, fmt.Errorf("filter dengan nama '%s' tidak ditemukan: %v", nama, err) // Error lebih spesifik jika tidak ditemukan
	}
	return &filter, nil
}

func (r *DataRepository) Create(ctx context.Context, data *models.Data) error {
	// Ambil ID Ruangan berdasarkan nama yang diterima
	ruangan, err := r.GetRuanganByNama(ctx, data.NamaRuangan)
	if err != nil {
		return fmt.Errorf("failed to find ruangan: %v", err) // Berikan error yang jelas jika ruangan tidak ditemukan
	}
	data.RuanganID = ruangan.ID // Menyimpan id_ruangan yang valid

	// Ambil ID Filter berdasarkan nama yang diterima
	filter, err := r.GetFilterByNama(ctx, data.NamaFilter)
	if err != nil {
		return fmt.Errorf("failed to find filter: %v", err) // Berikan error yang jelas jika filter tidak ditemukan
	}
	data.FilterID = filter.ID // Menyimpan id_filter yang valid

	// Iterasi untuk memasukkan data ke dalam database
	for i := 0; i < len(data.Amplitude); i++ {
		_, err := r.db.ExecContext(ctx, `
            INSERT INTO data 
            (data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
			data.Amplitude[i],
			data.Phase[i],
			data.RSSI[i],
			data.BatchID,
			data.RuanganID,
			data.FilterID,
			data.Timestamp[i])

		if err != nil {
			return fmt.Errorf("failed to insert data at row %d: %v", i, err) // Error per row
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
