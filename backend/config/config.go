package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBUser     string
	DBPassword string
	DBHost     string
	DBPort     string
	DBName     string

	MinioUser     string
	MinioPass     string
	MinioBucket   string
	MinioEndpoint string
	MinioSecure   bool

	RabbitMQHost      string
	RabbitMQPort      string
	RabbitMQVHost     string
	RabbitMQUser      string
	RabbitMQPassword  string
	RabbitMQQueueName string

	RedisHost string
	RedisPort string
	RedisDB   int
}

func LoadConfig() *Config {
	// Tentukan lokasi file .env yang baru di folder tools
	if os.Getenv("APP_ENV") != "production" {
		if err := godotenv.Load("../../.env"); err != nil {
			log.Fatalf("Error loading .env file: %v", err) // Ganti log.Printf menjadi log.Fatalf agar error terlihat jelas
		}
	}

	// Validasi environment variables
	required := []string{
		"DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME",
		"MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD", "MINIO_BUCKET_NAME", "MINIO_ENDPOINT", "MINIO_SECURE",
		"RABBITMQ_HOST", "RABBITMQ_PORT", "RABBITMQ_VHOST", "RABBITMQ_DEFAULT_USER", "RABBITMQ_DEFAULT_PASS", "RABBITMQ_QUEUE_NAME",
		"REDIS_HOST", "REDIS_PORT", "REDIS_DB",
	}
	for _, envVar := range required {
		if os.Getenv(envVar) == "" {
			log.Fatalf("Environment variable %s is required", envVar)
		}
	}

	return &Config{
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     os.Getenv("DB_PORT"),
		DBName:     os.Getenv("DB_NAME"),

		MinioUser:     os.Getenv("MINIO_ROOT_USER"),
		MinioPass:     os.Getenv("MINIO_ROOT_PASSWORD"),
		MinioBucket:   os.Getenv("MINIO_BUCKET_NAME"),
		MinioEndpoint: os.Getenv("MINIO_ENDPOINT"),
		MinioSecure:   os.Getenv("MINIO_SECURE") == "true", // Konversi string ke bool

		RabbitMQHost:      os.Getenv("RABBITMQ_HOST"),
		RabbitMQPort:      os.Getenv("RABBITMQ_PORT"),
		RabbitMQVHost:     os.Getenv("RABBITMQ_VHOST"),
		RabbitMQUser:      os.Getenv("RABBITMQ_DEFAULT_USER"),
		RabbitMQPassword:  os.Getenv("RABBITMQ_DEFAULT_PASS"),
		RabbitMQQueueName: "lok_requests",

		RedisHost: os.Getenv("REDIS_HOST"),
		RedisPort: os.Getenv("REDIS_PORT"),
		RedisDB:   0, // Default Redis DB
	}
}
