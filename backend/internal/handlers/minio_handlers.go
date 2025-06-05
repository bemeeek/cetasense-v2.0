package handlers

import (
	"net/http"

	"github.com/minio/minio-go/v7"
)

type MinioHandler struct {
	client *minio.Client
	bucket string
}

// Fungsi pembuat (constructor) MinioHandler
func NewMinioHandler(client *minio.Client, bucket string) *MinioHandler {
	return &MinioHandler{
		client: client,
		bucket: bucket,
	}
}

// Handler untuk upload file
func (h *MinioHandler) Upload(w http.ResponseWriter, r *http.Request) {
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "bad file", 400)
		return
	}
	defer file.Close()

	_, err = h.client.PutObject(
		r.Context(),
		h.bucket,
		header.Filename,
		file,
		-1,
		minio.PutObjectOptions{ContentType: header.Header.Get("Content-Type")},
	)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Write([]byte("upload ok"))
}
