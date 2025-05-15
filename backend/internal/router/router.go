package router

import (
	"fmt"
	"net/http"

	"cetasense-v2.0/internal/data"
	// Updated import path as per module
)

func UploadDataFrame(w http.ResponseWriter, r *http.Request) {
	data.UploadDataFrame(w, r)
}

func GetDataFrame(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "GetDataFrame not implemented", http.StatusNotImplemented)
}

func SetupRoutes() {
	http.HandleFunc("/upload", UploadDataFrame)
	http.HandleFunc("/dataframe/", GetDataFrame)

	fmt.Println("Routes set up successfully")
	fmt.Println("Server is running on port 8080")
	fmt.Println("Use Ctrl+C to stop the server")
	fmt.Println("Use /upload to upload data")
	fmt.Println("Use /dataframe/{idBatch} to retrieve data")
	fmt.Println("Use /dataframe to retrieve all data")
	fmt.Println("Use /dataframe/{idBatch}/delete to delete data")
}
