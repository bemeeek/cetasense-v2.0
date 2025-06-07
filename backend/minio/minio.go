package minio

import (
	"context"
	"log"

	"cetasense-v2.0/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func SetupMinIO() (*minio.Client, error) {
	cfg := config.LoadConfig() // Mengambil konfigurasi

	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioUser, cfg.MinioPass, ""),
		Secure: cfg.MinioSecure,
	})

	if err != nil {
		return nil, err
	}

	// Cek dan buat bucket jika belum ada
	bucketExists, err := client.BucketExists(context.Background(), cfg.MinioBucket)
	if err != nil {
		return nil, err
	}
	if !bucketExists {
		err = client.MakeBucket(context.Background(), cfg.MinioBucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, err
		}
		log.Printf("Bucket %s created", cfg.MinioBucket)
	}

	log.Println("MinIO client initialized")
	return client, nil
}
