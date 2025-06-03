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
		return nil, fmt.Errorf("ruangan dengan nama '%s' tidak ditemukan: %v", nama, err)
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
	// Memulai transaksi
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}

	// Iterasi untuk memasukkan data CSV ke dalam database
	for i := 0; i < len(data.Amplitude); i++ {
		_, err := tx.ExecContext(ctx, `
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
			tx.Rollback() // Rollback jika ada error
			return fmt.Errorf("failed to insert data at row %d: %v", i, err)
		}
	}

	// Commit transaksi jika semua berhasil
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
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

// Fungsi untuk mendapatkan ID batch berdasarkan nama
func (r *DataRepository) GetBatchIDByName(ctx context.Context, batchName string) (int, error) {
	row := r.db.QueryRowContext(ctx, `
        SELECT id FROM batch WHERE name = ?`, batchName)

	var batchID int
	err := row.Scan(&batchID)
	if err != nil {
		return 0, fmt.Errorf("batch dengan nama '%s' tidak ditemukan: %v", batchName, err)
	}

	return batchID, nil
}

// Fungsi untuk membuat batch baru jika belum ada
func (r *DataRepository) CreateBatch(ctx context.Context, batchName string) (int, error) {
	result, err := r.db.ExecContext(ctx, `
        INSERT INTO batch (name) VALUES (?)`, batchName)
	if err != nil {
		return 0, fmt.Errorf("failed to create batch: %v", err)
	}

	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get last insert id: %v", err)
	}

	return int(lastInsertID), nil
}
