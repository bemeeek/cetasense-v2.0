package pubsub

import (
	"context"

	"github.com/go-redis/redis/v8"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
)

func NewClient() *redis.Client {
	if redisClient == nil {
		redisClient = redis.NewClient(&redis.Options{
			Addr:     "localhost:6379", // Ganti dengan alamat Redis Anda
			Password: "",               // Tidak ada password
			DB:       0,                // Gunakan database default
		})
	}
	return redisClient
}
