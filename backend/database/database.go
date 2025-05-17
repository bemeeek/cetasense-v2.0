package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"cetasense-v2.0/config"
	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB(cfg *config.Config) *sql.DB {
	// Load configuration
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	// Open connection
	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Configure connection pool
	DB.SetMaxIdleConns(25)
	DB.SetMaxOpenConns(100)
	DB.SetConnMaxLifetime(5 * time.Minute)
	DB.SetConnMaxIdleTime(2 * time.Minute)

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := DB.PingContext(ctx); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	log.Println("Successfully connected to MariaDB/MySQL")
	return DB
}

func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("Database connection closed")
	}
}
