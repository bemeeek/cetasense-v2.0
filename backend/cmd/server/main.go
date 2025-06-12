package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"cetasense-v2.0/config"
	"cetasense-v2.0/database"
	"cetasense-v2.0/internal/handlers"
	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/internal/routes"

	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/cors"
)

func main() {
	// 1. Load configuration from .env (handled inside LoadConfig)
	cfg := config.LoadConfig()

	// 2. Initialise MariaDB connection
	db := database.InitDB(cfg)
	defer database.CloseDB()

	// 3. Initialise MinIO client
	minioEndpoint := strings.TrimPrefix(cfg.MinioEndpoint, "http://")
	minioClient, err := minio.New(minioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioUser, cfg.MinioPass, ""),
		Secure: cfg.MinioSecure, // Use true if HTTPS is required
	})
	if err != nil {
		log.Fatalf("Failed to connect to MinIO: %v", err)
	}

	// Ensure bucket exists (create if missing)
	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, cfg.MinioBucket)
	if err != nil {
		log.Fatalf("Error checking bucket: %v", err)
	}
	if !exists {
		log.Printf("Bucket %s does not exist, creating it now...", cfg.MinioBucket)
		if err := minioClient.MakeBucket(ctx, cfg.MinioBucket, minio.MakeBucketOptions{}); err != nil {
			log.Fatalf("Error creating bucket: %v", err)
		}
	}

	// 4. Initialise repositories & handlers
	ruanganRepo := repositories.NewRuanganRepository(db)
	filterRepo := repositories.NewFilterRepository(db)
	dataRepo := repositories.NewDataRepository(db)
	csvRepo := repositories.NewCSVFileRepository(db)
	methodRepo := repositories.NewMethodsRepository(db)

	roomHandler := handlers.NewRoomHandler(*ruanganRepo)
	filterHandler := handlers.NewFilterHandler(*filterRepo)
	dataHandler := handlers.NewDataHandler(*dataRepo)

	uploadHandler := handlers.NewUploadHandler(csvRepo, minioClient, cfg.MinioBucket, cfg, ruanganRepo, filterRepo)
	batchHandler := handlers.NewBatchHandler(dataRepo)
	methodHandler := handlers.NewMethodsHandler(methodRepo, minioClient, cfg.MinioBucket, cfg)
	heatmapHandler := handlers.NewHeatmapHandler(csvRepo, minioClient, cfg.MinioBucket, cfg)

	// 5. Setup router & middleware
	router := mux.NewRouter()

	routes.RegisterRoomRoutes(router, roomHandler)
	routes.RegisterFilterRoutes(router, filterHandler)
	routes.RegisterDataRoutes(router, dataHandler)
	routes.RegisterUploadRoutes(router, uploadHandler)
	routes.RegisterBatchRoutes(router, batchHandler)
	routes.RegisterMethodsRoutes(router, methodHandler)
	routes.RegisterHeatmapRoutes(router, heatmapHandler)

	router.Use(loggingMiddleware)
	router.Use(contentTypeMiddleware)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// Configure and start server
	server := &http.Server{
		Addr:         ":8080",
		Handler:      c.Handler(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown logic
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("⇢ API server started on %s", server.Addr)
		defer log.Println("API server stopped")
		defer database.CloseDB()
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-shutdown
	log.Println("⏻ Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Graceful shutdown failed: %v", err)
	}
	log.Println("✅ Server stopped cleanly")
}

// ----------------------------------------------------------------------------
// Middleware helpers
// ----------------------------------------------------------------------------
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s %s", r.RemoteAddr, r.Method, r.URL)
		next.ServeHTTP(w, r)
	})
}

func contentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}
