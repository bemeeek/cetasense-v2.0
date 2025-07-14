package repositories

import (
	"context"
	"database/sql"

	"cetasense-v2.0/internal/models"
)

type MethodsRepository struct {
	db *sql.DB
}

func (r *MethodsRepository) Rename(ctx context.Context, methodID string, name string) any {
	panic("unimplemented")
}

func NewMethodsRepository(db *sql.DB) *MethodsRepository {
	return &MethodsRepository{db: db}
}

func (r *MethodsRepository) Create(method *models.MethodsFile) error {
	query := `
	INSERT INTO metodelokalisasi (id, nama_metode, tipe_metode, path_file)
	VALUES (?, ?, ?, ?)`
	_, err := r.db.Exec(query, method.ID, method.NamaMetode, method.TipeMetode, method.ObjectPath)
	return err
}

func (r *MethodsRepository) GetAll() ([]*models.MethodsFile, error) {
	query := `
	SELECT id, nama_metode, tipe_metode, path_file
	FROM metodelokalisasi
	ORDER BY nama_metode`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var methods []*models.MethodsFile
	for rows.Next() {
		method := new(models.MethodsFile)
		if err := rows.Scan(&method.ID, &method.NamaMetode, &method.TipeMetode, &method.ObjectPath); err != nil {
			return nil, err
		}
		methods = append(methods, method)
	}
	return methods, nil
}

func (r *MethodsRepository) Delete(ctx context.Context, id string) error {
	stmt, err := r.db.PrepareContext(ctx, `
		DELETE FROM metodelokalisasi
		WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx, id)
	return err
}

func (r *MethodsRepository) GetByID(ctx context.Context, id string) (*models.MethodsFile, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, nama_metode, tipe_metode, path_file
		FROM metodelokalisasi 
		WHERE id = ?`, id)

	method := new(models.MethodsFile)
	err := row.Scan(&method.ID, &method.NamaMetode, &method.TipeMetode, &method.ObjectPath)
	if err != nil {
		return nil, err
	}
	return method, nil
}

func (r *MethodsRepository) UpdateName(ctx context.Context, id string, newName string) error {
	stmt, err := r.db.PrepareContext(ctx, `
		UPDATE metodelokalisasi
		SET nama_metode = ?
		WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx, newName, id)
	return err
}
