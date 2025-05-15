package data

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func InitDB() *sql.DB {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	} else {
		fmt.Println("Successfully loaded .env file")
	}

	// Ambil variabel dari file .env
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")

	// Format DSN (Data Source Name)
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", dbUser, dbPassword, dbHost, dbPort, dbName)

	// Membuka koneksi database
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}

	// Memastikan koneksi berhasil
	err = db.Ping()
	if err != nil {
		log.Fatal("Error pinging database: ", err)
	}

	// Optional: Pengaturan untuk efisiensi koneksi
	db.SetMaxIdleConns(10)                 // Set idle connection
	db.SetMaxOpenConns(50)                 // Set max open connections
	db.SetConnMaxLifetime(time.Minute * 3) // Set max lifetime for a connection

	return db
}

func CloseDB(db *sql.DB) {
	err := db.Close()
	if err != nil {
		log.Fatal("Error closing database: ", err)
	}
}
