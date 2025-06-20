package main

import (
	"context"
	"fmt"
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
	"github.com/joho/godotenv"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/cors"
)

func init() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}
}

func main() {
	// ─── 1) Load config ────────────────────────────────────────────────────
	cfg := config.LoadConfig()

	// ─── 2) Init DB ──────────────────────────────────────────────────────
	db := database.InitDB(cfg)
	defer database.CloseDB()

	// ─── 3) Init MinIO ───────────────────────────────────────────────────
	minioEndpoint := strings.TrimPrefix(cfg.MinioEndpoint, "http://")
	minioClient, err := minio.New(minioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioUser, cfg.MinioPass, ""),
		Secure: cfg.MinioSecure,
	})
	if err != nil {
		log.Fatalf("Failed to connect to MinIO: %v", err)
	}
	ctx := context.Background()
	if exists, _ := minioClient.BucketExists(ctx, cfg.MinioBucket); !exists {
		if err := minioClient.MakeBucket(ctx, cfg.MinioBucket, minio.MakeBucketOptions{}); err != nil {
			log.Fatalf("Error creating bucket: %v", err)
		}
	}

	// ─── 4) Repositories & Handlers ───────────────────────────────────────
	ruanganRepo := repositories.NewRuanganRepository(db)
	filterRepo := repositories.NewFilterRepository(db)
	dataRepo := repositories.NewDataRepository(db)
	csvRepo := repositories.NewCSVFileRepository(db)
	methodRepo := repositories.NewMethodsRepository(db)

	// Core handlers
	roomHandler := handlers.NewRoomHandler(*ruanganRepo)
	filterHandler := handlers.NewFilterHandler(*filterRepo)
	dataHandler := handlers.NewDataHandler(*dataRepo)
	uploadHandler := handlers.NewUploadHandler(csvRepo, minioClient, cfg.MinioBucket, cfg, ruanganRepo, filterRepo)
	batchHandler := handlers.NewBatchHandler(dataRepo)
	methodHandler := handlers.NewMethodsHandler(methodRepo, minioClient, cfg.MinioBucket, cfg)
	heatmapHandler := handlers.NewHeatmapHandler(csvRepo, minioClient, cfg.MinioBucket, cfg)

	// ─── 5) Router & Middleware ──────────────────────────────────────────
	router := mux.NewRouter()

	// Application routes
	routes.RegisterRoomRoutes(router, roomHandler)
	routes.RegisterFilterRoutes(router, filterHandler)
	routes.RegisterDataRoutes(router, dataHandler)
	routes.RegisterUploadRoutes(router, uploadHandler)
	routes.RegisterBatchRoutes(router, batchHandler)
	routes.RegisterMethodsRoutes(router, methodHandler)
	routes.RegisterHeatmapRoutes(router, heatmapHandler)

	// Gateway route
	mux := http.NewServeMux()
	mux.HandleFunc("/api/localize", handlers.NewLocalizeHandler(cfg))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})
	addr := ":8081"
	log.Printf("Gateway listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))

	// Global middleware
	router.Use(loggingMiddleware, contentTypeMiddleware)

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})
	handler := c.Handler(router)

	// ─── 6) HTTP Server & Graceful Shutdown ──────────────────────────────
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", os.Getenv("PORT")),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Run server
	go func() {
		log.Printf("Server started on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctxShut, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctxShut); err != nil {
		log.Fatalf("Graceful shutdown failed: %v", err)
	}
	log.Println("Server stopped cleanly")
}

// ─── Middleware ─────────────────────────────────────────────────────────
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
