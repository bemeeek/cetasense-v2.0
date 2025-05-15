package main

import (
	"fmt"
	"log"
	"net/http"

	"cetasense-v2.0/internal/data"
)

func main() {
	db := data.InitDB()
	defer db.Close()

	fmt.Println("Database connection established successfully")
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, World!")
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
