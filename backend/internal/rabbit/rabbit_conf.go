package rabbit

import (
	"fmt"

	"cetasense-v2.0/config"
	amqp "github.com/rabbitmq/amqp091-go"
)

// RabbitMQ configuration variables
// These should be set in your environment or .env file

func NewChannel(cfg *config.Config) (*amqp.Connection, *amqp.Channel, error) {
	url := fmt.Sprintf("amqp://%s:%s@%s:%s/%s", cfg.RabbitMQUser, cfg.RabbitMQPassword, cfg.RabbitMQHost, cfg.RabbitMQPort, cfg.RabbitMQVHost)
	fmt.Println("Connecting to RabbitMQ at", url)
	if cfg.RabbitMQHost == "" || cfg.RabbitMQPort == "" || cfg.RabbitMQVHost == "" || cfg.RabbitMQUser == "" || cfg.RabbitMQPassword == "" || cfg.RabbitMQQueueName == "" {
		return nil, nil, fmt.Errorf("missing RabbitMQ environment variables")
	}
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}
	fmt.Println("Connected to RabbitMQ")
	defer func() {
		if err != nil {
			conn.Close()
			fmt.Println("Connection to RabbitMQ closed due to error")
		}
	}()
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("failed to open a channel: %w", err)
	}
	fmt.Println("Channel opened successfully")
	_, err = ch.QueueDeclare(
		cfg.RabbitMQQueueName, // name
		true,                  // durable
		false,                 // delete when unused
		false,                 // exclusive
		false,                 // no-wait
		nil,                   // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, nil, fmt.Errorf("failed to declare a queue: %w", err)
	}
	fmt.Println("Queue declared successfully")
	return conn, ch, nil
}
