package main

import (
	"fmt"
	"net/http"

	"cetasense-v2.0/internal/router" // Gantilah dengan path proyek Anda
)

func main() {
	// Set up router
	router.SetupRoutes()

	// Menjalankan server pada port 8080
	fmt.Println("Server berjalan di http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
