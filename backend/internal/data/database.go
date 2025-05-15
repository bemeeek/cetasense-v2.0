// buat handle koneksi ke database

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func initDB() *sql.DB {
	// load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", dbUser, dbPassword, dbHost, dbPort, dbName)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal("Error pinging database: ", err)
		return db
	}
	return db
}
func closeDB(db *sql.DB) {
	err := db.Close()
	if err != nil {
		log.Fatal("Error closing database: ", err)
	}
}
