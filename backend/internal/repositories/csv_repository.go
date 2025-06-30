package repositories

import (
	"context"
	"database/sql"

	"cetasense-v2.0/internal/models"
)

type CSVFileRepository struct {
	db *sql.DB
}

func (r *CSVFileRepository) GetFileNameByID(ctx context.Context, fileID string) (any, any) {
	panic("unimplemented")
}

func NewCSVFileRepository(db *sql.DB) *CSVFileRepository {
	return &CSVFileRepository{db: db}
}

// Save metadata of uploaded CSV
func (r *CSVFileRepository) Create(ctx context.Context, f *models.CSI_File) error {
	query := `
    INSERT INTO data_csv
      (id, filename, object_path, id_ruangan, id_filter)
    VALUES (?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		f.ID,
		f.FileName,
		f.ObjectPath,
		f.RuanganID,
		f.FilterID,
	)
	return err
}

// List semua file CSV (opsional: filter by batch, ruangan, dsb)
func (r *CSVFileRepository) GetAll(ctx context.Context) ([]*models.CSI_File, error) {
	rows, err := r.db.QueryContext(ctx, `
      SELECT id, filename, object_path, id_ruangan, id_filter
      FROM data_csv
      ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*models.CSI_File
	for rows.Next() {
		f := new(models.CSI_File)
		if err := rows.Scan(
			&f.ID,
			&f.FileName,
			&f.ObjectPath,
			&f.RuanganID,
			&f.FilterID,
		); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, nil
}

// Cari satu file by ID
func (r *CSVFileRepository) GetByID(ctx context.Context, id string) (*models.CSI_File, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, filename, object_path, id_ruangan, id_filter
		FROM data_csv WHERE id = ?`, id)
	f := new(models.CSI_File)
	if err := row.Scan(
		&f.ID,
		&f.FileName,
		&f.ObjectPath,
		&f.RuanganID,
		&f.FilterID,
	); err != nil {
		return nil, err
	}
	return f, nil
}

func (r *CSVFileRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM data_csv WHERE id = ?`, id)
	return err
}

func (r *CSVFileRepository) UpdateName(ctx context.Context, f *models.CSI_File) error {
	query := `
        UPDATE data_csv
        SET filename = ?
        WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, f.FileName, f.ID)
	return err
}
