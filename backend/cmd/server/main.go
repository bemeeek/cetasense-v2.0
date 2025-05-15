package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

func main() {
	// Load environment variables
	dbURL := os.Getenv("DB_URL")
	port := os.Getenv("PORT")

	// Initialize database connection (using sqlx or GORM)
	db, err := InitDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer db.Close()

	// Set up router
	r := mux.NewRouter()

	// API Endpoints
	r.HandleFunc("/api/data/upload", fileupload.UploadFileHandler(db)).Methods("POST")
	r.HandleFunc("/api/data/{data_id}/edit", data.EditDataHandler(db)).Methods("PUT")
	r.HandleFunc("/api/data/streams/{batch_id}", data.GetDataStreamHandler(db)).Methods("GET")
	r.HandleFunc("/api/localization", localization.StartLocalizationHandler(db)).Methods("POST")

	// Start server
	log.Printf("Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
