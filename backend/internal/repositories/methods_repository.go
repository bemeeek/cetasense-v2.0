package repositories

import (
	"context"
	"database/sql"
)

type MethodsRepository struct {
	db *sql.DB
}

type MethodsFile struct {
	ID         string
	NamaMetode string
	TipeMetode string
	ObjectPath string
}

func NewMethodsRepository(db *sql.DB) *MethodsRepository {
	return &MethodsRepository{db: db}
}

func (r *MethodsRepository) Create(method *MethodsFile) error {
	query := `
	INSERT INTO methods_file (id, nama_metode, tipe_metode, object_path)
	VALUES (?, ?, ?, ?)`
	_, err := r.db.Exec(query, method.ID, method.NamaMetode, method.TipeMetode, method.ObjectPath)
	return err
}

func (r *MethodsRepository) GetAll() ([]*MethodsFile, error) {
	query := `
	SELECT id, nama_metode, tipe_metode, object_path
	FROM methods_file
	ORDER BY nama_metode`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var methods []*MethodsFile
	for rows.Next() {
		method := new(MethodsFile)
		if err := rows.Scan(&method.ID, &method.NamaMetode, &method.TipeMetode, &method.ObjectPath); err != nil {
			return nil, err
		}
		methods = append(methods, method)
	}
	return methods, nil
}

func (r *MethodsRepository) Delete(ctx context.Context, id string) error {
	stmt, err := r.db.PrepareContext(ctx, `
		DELETE FROM methods_file 
		WHERE id = ?`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.ExecContext(ctx, id)
	return err
}

func (r *MethodsRepository) GetByID(ctx context.Context, id string) (*MethodsFile, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, nama_metode, tipe_metode, object_path 
		FROM methods_file 
		WHERE id = ?`, id)

	method := new(MethodsFile)
	err := row.Scan(&method.ID, &method.NamaMetode, &method.TipeMetode, &method.ObjectPath)
	if err != nil {
		return nil, err
	}
	return method, nil
}
