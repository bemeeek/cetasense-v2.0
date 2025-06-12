package models

type MethodsFile struct {
	ID         string `json:"method_id" db:"id" validate:"required"` // UUID di-generate server
	NamaMetode string `json:"method_name" db:"nama_metode" validate:"required,min=3"`
	TipeMetode string `json:"filetype" db:"tipe_metode" validate:"required,oneof=script model"`
	ObjectPath string `json:"object_path" db:"path_file" validate:"required"`
}
