package data

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func UploadDataFrame(w http.ResponseWriter, r *http.Request) {
	// Implementasi fungsi untuk mengupload data frame ke database
	type DataFrame struct {
		Amp       []float64 `json:"amp"`
		Phase     []float64 `json:"phase"`
		Rssi      []float64 `json:"rssi"`
		Timestamp []string  `json:"timestamp"`
	}

	var Request struct {
		Data DataFrame `json:"data"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&Request); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	db := InitDB()
	defer CloseDB(db)

	if len(Request.Data.Amp) == 0 || len(Request.Data.Phase) == 0 || len(Request.Data.Rssi) == 0 || len(Request.Data.Timestamp) == 0 {
		http.Error(w, "Data frame is empty", http.StatusBadRequest)
		return
	}

	// Simpan data frame ke database

	for i := 0; i < len(Request.Data.Amp); i++ {
		// Simpan setiap elemen ke dalam database
		_, err := db.Exec("INSERT INTO data (data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp) VALUES (?, ?, ?, ?, UUID(), UUID(), ?)",
			Request.Data.Amp[i], Request.Data.Phase[i], Request.Data.Rssi[i], 1, Request.Data.Timestamp[i])
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	response := map[string]string{"status": "success"}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func UploadRoomData(w http.ResponseWriter, r *http.Request) {
	// Implementasi fungsi untuk mengupload data ruangan ke database
	var Request struct {
		ID             string  `json:"id"`
		NamaRuangan    string  `json:"nama_ruangan"`
		PanjangRuangan float64 `json:"panjang_ruangan"`
		LebarRuangan   float64 `json:"lebar_ruangan"`
		PosisiTX       float64 `json:"posisi_tx"`
		PosisiRX       float64 `json:"posisi_rx"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&Request); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	db := InitDB()
	defer CloseDB(db)

	
	}

	// Simpan data frame ke database

	for i := 0; i < len(Request.Data.Amp); i++ {
		// Simpan setiap elemen ke dalam database
		_, err := db.Exec("INSERT INTO data (data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp) VALUES (?, ?, ?, ?, UUID(), UUID(), ?)",
			Request.Data.Amp[i], Request.Data.Phase[i], Request.Data.Rssi[i], 1, Request.Data.Timestamp[i])
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	response := map[string]string{"status": "success"}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// getDataFrame retrieves data from the database based on the provided idBatch
func GetDataFrame(w http.ResponseWriter, r *http.Request) {
	idBatch := r.URL.Path[len("/dataframe/"):]

	db := InitDB()
	defer CloseDB(db)

	rows, err := db.Query("SELECT data_phase, data_rssi, timestamp FROM data_frame WHERE id_batch = ?", idBatch)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var result DataFrame
	for rows.Next() {
		var timestamp string
		var amp, phase, rssi float64

		if err := rows.Scan(&amp, &phase, &rssi, &timestamp); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		result.Timestamp = append(result.Timestamp, timestamp)
		result.Amp = append(result.Amp, amp)
		result.Phase = append(result.Phase, phase)
		result.Rssi = append(result.Rssi, rssi)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	response := map[string]interface{}{
		"status": "success",
		"data":   result,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

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
