// cmd/server/main.go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cetasense-v2.0/config"
	"cetasense-v2.0/database"
	"cetasense-v2.0/internal/handlers"
	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/internal/routes"
	"cetasense-v2.0/internal/services"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize database
	db := database.InitDB(cfg)
	defer database.CloseDB()

	// Initialize repositories
	ruanganRepo := repositories.NewRuanganRepository(db)
	filterRepo := repositories.NewFilterRepository(db)
	dataRepo := repositories.NewDataRepository(db)

	// Initialize handlers
	roomHandler := handlers.NewRoomHandler(*ruanganRepo)
	filterHandler := handlers.NewFilterHandler(*filterRepo)
	dataHandler := handlers.NewDataHandler(*dataRepo)
	csvProcessor := services.NewCSVProcessor(*dataRepo)
	uploadHandler := handlers.NewUploadHandler(csvProcessor)

	// Create router
	router := mux.NewRouter()

	// Register routes
	routes.RegisterRoomRoutes(router, roomHandler)
	routes.RegisterFilterRoutes(router, filterHandler)
	routes.RegisterDataRoutes(router, dataHandler)
	routes.RegisterUploadRoutes(router, uploadHandler)

	// Add middleware
	router.Use(loggingMiddleware)
	router.Use(contentTypeMiddleware)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"}, // Allow all origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	// Configure server
	server := &http.Server{
		Addr:         ":8080",
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server started on %s", server.Addr)
		log.Printf("/api/data untuk CreateData")
		log.Printf("/api/data/{id} untuk GetDataByID")
		log.Printf("/api/data untuk GetAllData")
		log.Printf("/api/data/{id} untuk UpdateData")
		log.Printf("/api/filter untuk CreateFilter")
		log.Printf("/api/filter/{id} untuk GetFilterByID")
		log.Printf("/api/filter untuk GetAllFilter")
		log.Printf("/api/filter/{id} untuk UpdateFilter")
		log.Printf("/api/ruangan untuk CreateRuangan")
		log.Printf("/api/ruangan/{id} untuk GetRuanganByID")
		log.Printf("/api/upload untuk upload data CSI csv")
		// Start server
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}

	}()

	<-done
	log.Println("Server is shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown failed: %v", err)
	}
	log.Println("Server stopped")
}

// Middleware untuk logging
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s %s", r.RemoteAddr, r.Method, r.URL)
		next.ServeHTTP(w, r)
	})
}

// Middleware untuk content type JSON
func contentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}
