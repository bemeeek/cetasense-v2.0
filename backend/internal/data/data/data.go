package data

import (
	"encoding/json"
	"fmt"
	"net/http"

	"cetasense-v2.0/internal/data/database"
	_ "github.com/go-sql-driver/mysql"
)

type DataFrame struct {
	Amp       []float64 `json:"amp"`
	Phase     []float64 `json:"phase"`
	Rssi      []float64 `json:"rssi"`
	Timestamp []string  `json:"timestamp"`
}

func UploadDataParameter(w http.ResponseWriter, r *http.Request) {
	// Implementasi fungsi untuk mengupload data frame ke database

	var Request struct {
		Data        DataFrame `json:"data"`
		NamaRuangan string    `json:"nama_ruangan"`
		NamaFilter  string    `json:"nama_filter"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&Request); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	db := database.InitDB()
	defer database.CloseDB(db)

	if len(Request.Data.Amp) == 0 || len(Request.Data.Phase) == 0 || len(Request.Data.Rssi) == 0 || len(Request.Data.Timestamp) == 0 {
		http.Error(w, "Data frame is empty", http.StatusBadRequest)
		return
	}

	// Simpan data frame ke database

	for i := 0; i < len(Request.Data.Amp); i++ {
		// Simpan setiap elemen ke dalam database
		_, err := db.Exec(`
			INSERT INTO data (data_amplitude, data_phase, data_rssi, id_batch, id_ruangan, id_filter, timestamp) 
			VALUES (?, ?, ?, ?, 
				(SELECT id FROM ruangan WHERE nama_ruangan = ?), 
				(SELECT id FROM filter WHERE nama_filter = ?), 
				?)`,
			Request.Data.Amp[i], Request.Data.Phase[i], Request.Data.Rssi[i], 1,
			Request.NamaRuangan, Request.NamaFilter, Request.Data.Timestamp[i])
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
		NamaRuangan    string  `json:"nama_ruangan"`
		PanjangRuangan float64 `json:"panjang_ruangan"`
		LebarRuangan   float64 `json:"lebar_ruangan"`
		PosisiTX       float64 `json:"posisi_tx"`
		PosisiRX       float64 `json:"posisi_rx"`
	}

	// Decode JSON request body
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&Request); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Validasi input
	if Request.NamaRuangan == "" {
		http.Error(w, "Nama ruangan tidak boleh kosong", http.StatusBadRequest)
		return
	}
	if Request.PanjangRuangan <= 0 || Request.LebarRuangan <= 0 {
		http.Error(w, "Panjang dan lebar ruangan harus lebih besar dari 0", http.StatusBadRequest)
		return
	}
	if Request.PosisiTX <= 0 || Request.PosisiRX <= 0 {
		http.Error(w, "Posisi TX dan RX harus lebih besar dari 0", http.StatusBadRequest)
		return
	}

	// Koneksi ke database
	db := database.InitDB()
	defer database.CloseDB(db)

	// Simpan data ruangan ke database
	result, err := db.Exec("INSERT INTO ruangan (id, nama_ruangan, panjang_ruangan, lebar_ruangan, posisi_tx, posisi_rx) VALUES (UUID(), ?, ?, ?, ?, ?)",
		Request.NamaRuangan, Request.PanjangRuangan, Request.LebarRuangan, Request.PosisiTX, Request.PosisiRX)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error saving room data: %v", err), http.StatusInternalServerError)
		return
	}

	// Mengambil ID dari record yang baru saja dimasukkan
	roomID, err := result.LastInsertId()
	if err != nil {
		http.Error(w, fmt.Sprintf("Error retrieving last inserted ID: %v", err), http.StatusInternalServerError)
		return
	}

	// Response sukses
	response := map[string]interface{}{
		"status":  "success",
		"message": "Data ruangan berhasil disimpan",
		"room_id": roomID,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func UploadDataFilter(w http.ResponseWriter, r *http.Request) {
	var Request struct {
		NamaFilter string `json:"nama_filter"`
	}
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&Request); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding JSON: %v", err), http.StatusBadRequest)
		return
	}
	db := database.InitDB()
	defer database.CloseDB(db)
	if Request.NamaFilter == "" {
		http.Error(w, "Data filter is empty", http.StatusBadRequest)
		return
	}
	// Simpan data filter ke database
	_, err := db.Exec("INSERT INTO filter (id, nama_filter) VALUES (UUID(), ?)", Request.NamaFilter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	response := map[string]string{"status": "success"}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// getDataFrame retrieves data from the database based on the provided idBatch
func GetDataFrame(w http.ResponseWriter, r *http.Request) {
	idBatch := r.URL.Path[len("/dataframe/"):]

	db := database.InitDB()
	defer database.CloseDB(db)

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
