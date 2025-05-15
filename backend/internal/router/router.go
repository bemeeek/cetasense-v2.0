package router

import (
	"fmt"
	"net/http"

	"cetasense-v2.0/internal/data/data"
	// Updated import path as per module
)

func SetupRoutes() {
	http.HandleFunc("/upload-data", data.UploadDataParameter)
	http.HandleFunc("/upload-room-data", data.UploadRoomData)
	http.HandleFunc("/upload-filter-data", data.UploadDataFilter)

	fmt.Println("Routes set up suscessfully")
	fmt.Println("Server is running on port 8080")
	fmt.Println("Visit http://localhost:8080/upload-data to upload data")
	fmt.Println("Visit http://localhost:8080/upload-room-data to upload room data")
	fmt.Println("Visit http://localhost:8080/upload-filter-data to upload filter data")
}
