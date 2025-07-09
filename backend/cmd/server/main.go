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

	"cetasense-v2.0/cache"
	"cetasense-v2.0/config"
	"cetasense-v2.0/database"
	"cetasense-v2.0/internal/handlers"
	"cetasense-v2.0/internal/repositories"
	"cetasense-v2.0/internal/routes"
	"cetasense-v2.0/middleware"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/mux"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/cors"
)

// Test Redis connection dengan detailed logging
func testRedisConnection(rdb *redis.Client) {
	ctx := context.Background()

	// Test ping
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("❌ Go Redis ping failed: %v", err)
		return
	}
	log.Println("✅ Go Redis connected successfully")

	// Test subscribe to test channel
	sub := rdb.Subscribe(ctx, "test_channel")
	defer sub.Close()

	// Wait for subscription confirmation
	if _, err := sub.Receive(ctx); err != nil {
		log.Printf("❌ Failed to subscribe to test channel: %v", err)
		return
	}
	log.Println("✅ Test subscription successful")

	ch := sub.Channel()

	// Test publish
	testMsg := `{"test":"connection","timestamp":"` + time.Now().Format(time.RFC3339) + `"}`
	result := rdb.Publish(ctx, "test_channel", testMsg)
	log.Printf("📡 Published test message, subscribers: %d", result.Val())

	// Listen for 3 seconds
	timeout := time.After(3 * time.Second)
	select {
	case msg := <-ch:
		log.Printf("✅ Go received test message: %s", msg.Payload)
	case <-timeout:
		log.Println("⏰ Go test subscription timeout (this is normal)")
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

	// ─── 4) Initialize Redis ──────────────────────────────────────────────
	redisAddr := fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort)
	log.Printf("🔗 Connecting to Redis at %s, DB %d", redisAddr, cfg.RedisDB)

	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "",          // No password set
		DB:       cfg.RedisDB, // Use default DB
		// DialTimeout:  5 * time.Second,
		// ReadTimeout:  3 * time.Second,
		// WriteTimeout: 3 * time.Second,
		PoolSize:     50,
		MinIdleConns: 10,
	})

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("✅ Redis connection established")

	// Test Redis connection
	testRedisConnection(rdb)

	// Ensure Redis connection is closed on exit
	defer func() {
		if err := rdb.Close(); err != nil {
			log.Printf("Error closing Redis connection: %v", err)
		}
	}()

	// ─── 5) Repositories & Handlers ───────────────────────────────────────
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
	plotHandler := handlers.NewPlotHandler(csvRepo, minioClient, cfg.MinioBucket)

	// ─── 6) Router & Middleware ──────────────────────────────────────────
	router := mux.NewRouter()

	// Application routes
	routes.RegisterRoomRoutes(router, roomHandler)
	routes.RegisterFilterRoutes(router, filterHandler)
	routes.RegisterDataRoutes(router, dataHandler)
	routes.RegisterUploadRoutes(router, uploadHandler)
	routes.RegisterBatchRoutes(router, batchHandler)
	routes.RegisterMethodsRoutes(router, methodHandler)
	routes.RegisterPlotRoutes(router, plotHandler)

	// SSE routes
	router.HandleFunc("/api/localize", handlers.NewLocalizeHandler(cfg)).
		Methods("POST")
	router.HandleFunc("/api/localize/stream/{job_id}", handlers.LocalizationHandler(rdb)).Methods("GET")

	// Gateway route
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	cacheClient := cache.NewClient(redisAddr, cfg.RedisDB)
	router.Use(middleware.CacheMiddleware(cacheClient, 5*time.Minute)) // Set cache TTL to 5 minutes

	// Test di main.go
	log.Printf("LocalizationHandler function: %v", handlers.LocalizationHandler)

	// Di main.go setelah semua routes
	log.Println("🚀 Registered routes:")
	router.Walk(func(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {
		pathTemplate, err := route.GetPathTemplate()
		if err == nil {
			methods, _ := route.GetMethods()
			log.Printf("   %s %v", pathTemplate, methods)
		}
		return nil
	})

	// Global middleware
	router.Use(loggingMiddleware, contentTypeMiddleware)

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "Cache-Control"},
		AllowCredentials: true,
	})
	handler := c.Handler(router)

	// ─── 7) HTTP Server & Graceful Shutdown ──────────────────────────────
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Run server
	go func() {
		log.Printf("🚀 Server started on %s", srv.Addr)
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
		start := time.Now()
		log.Printf("📥 %s %s %s", r.RemoteAddr, r.Method, r.URL)
		next.ServeHTTP(w, r)
		log.Printf("📤 %s %s %s - %v", r.RemoteAddr, r.Method, r.URL, time.Since(start))
	})
}

func contentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Jika handler men‐set content‐type lain (misal text/event-stream), jangan timpa
		if w.Header().Get("Content-Type") == "" {
			w.Header().Set("Content-Type", "application/json")
		}
		next.ServeHTTP(w, r)
	})
}
