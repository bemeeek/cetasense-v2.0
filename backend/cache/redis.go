package cache

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
)

type Client struct {
	rdb *redis.Client
}

func NewClient(addr string, db int) *Client {
	return &Client{
		rdb: redis.NewClient(&redis.Options{
			Addr:         addr,
			Password:     "", // No password set
			DB:           db, // Use default DB
			DialTimeout:  1 * time.Second,
			ReadTimeout:  1 * time.Second,
			WriteTimeout: 1 * time.Second,
		}),
	}
}

func (c *Client) Get(ctx context.Context, key string) ([]byte, error) {
	return c.rdb.Get(ctx, key).Bytes()
}

func (c *Client) Set(ctx context.Context, key string, val []byte, ttl time.Duration) error {
	return c.rdb.Set(ctx, key, val, ttl).Err()
}

func (c *Client) Del(ctx context.Context, key string) error {
	return c.rdb.Del(ctx, key).Err()
}

func (c *Client) Keys(ctx context.Context, pattern string) ([]string, error) {
	return c.rdb.Keys(ctx, pattern).Result()
}
