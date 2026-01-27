package database

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"medical-crm/pkg/logger"
)

// Connect establishes a connection to MongoDB with retry logic
func Connect(uri, dbName string, timeout time.Duration, log *logger.Logger) (*mongo.Database, *mongo.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	clientOpts := options.Client().
		ApplyURI(uri).
		SetMaxPoolSize(100).
		SetMinPoolSize(10).
		SetMaxConnIdleTime(30 * time.Second).
		SetServerSelectionTimeout(timeout)

	var client *mongo.Client
	var err error

	// Retry logic
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		client, err = mongo.Connect(ctx, clientOpts)
		if err != nil {
			log.Warnf("MongoDB connection attempt %d failed: %v", i+1, err)
			time.Sleep(time.Duration(i+1) * time.Second)
			continue
		}

		// Ping to verify connection
		if err = client.Ping(ctx, readpref.Primary()); err != nil {
			log.Warnf("MongoDB ping attempt %d failed: %v", i+1, err)
			time.Sleep(time.Duration(i+1) * time.Second)
			continue
		}

		log.Info("Connected to MongoDB successfully")
		return client.Database(dbName), client, nil
	}

	return nil, nil, err
}

// Disconnect closes the MongoDB connection
func Disconnect(client *mongo.Client, log *logger.Logger) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Disconnect(ctx); err != nil {
		log.Error("Error disconnecting from MongoDB", err)
	} else {
		log.Info("Disconnected from MongoDB")
	}
}

// HealthCheck performs a health check on the database
func HealthCheck(client *mongo.Client, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return client.Ping(ctx, readpref.Primary())
}
