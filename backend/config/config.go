// config/config.go
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
}

func LoadConfig() *Config {
	// Load .env hanya di development
	if os.Getenv("APP_ENV") != "production" {
		if err := godotenv.Load(); err != nil {
			log.Printf("Warning: .env not loaded: %v", err)
		}
	}

	// Validasi environment variables
	required := []string{"DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME"}
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
	}
}
