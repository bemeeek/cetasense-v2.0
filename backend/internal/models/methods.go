package models

type MethodsFile struct {
	ID         string `json:"method_id" db:"id"` // UUID di-generate server
	NamaMetode string `json:"method_name" db:"nama_metode" validate:"required,min=3"`
	TipeMetode string `json:"filetype" db:"tipe_metode"`
	ObjectPath string `json:"object_path" db:"object_path" validate:"required"`
}
