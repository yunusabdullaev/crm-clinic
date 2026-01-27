package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"medical-crm/config"
	"medical-crm/internal/database"
	"medical-crm/internal/router"
	"medical-crm/pkg/logger"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env file if exists
	_ = godotenv.Load()

	// Load configuration
	cfg := config.Load()

	// Initialize logger
	log := logger.New(cfg.ServiceName, cfg.Environment)
	log.Infof("Starting %s in %s mode", cfg.ServiceName, cfg.Environment)

	// Check if this is a seed command
	if len(os.Args) > 1 && os.Args[1] == "seed" {
		runSeed(cfg, log)
		return
	}

	// Connect to MongoDB
	db, mongoClient, err := database.Connect(cfg.MongoURI, cfg.MongoDB, cfg.MongoTimeout, log)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB", err)
	}

	// Create indexes
	log.Info("Creating database indexes...")
	if err := router.CreateIndexes(db, log); err != nil {
		log.Fatal("Failed to create indexes", err)
	}

	// Auto-seed superadmin if not exists
	seedSuperadmin(cfg, db, log)

	// Setup router
	r := router.Setup(cfg, db, mongoClient, log)

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      r,
		ReadTimeout:  cfg.ServerReadTimeout,
		WriteTimeout: cfg.ServerWriteTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Infof("Server starting on port %s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown server gracefully
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown", err)
	}

	// Disconnect from MongoDB
	database.Disconnect(mongoClient, log)

	log.Info("Server stopped")
}

// seedSuperadmin creates the superadmin user if it doesn't exist
func seedSuperadmin(cfg *config.Config, db *mongo.Database, log *logger.Logger) {
	ctx := context.Background()

	// Check if superadmin exists
	var existingAdmin bson.M
	err := db.Collection("users").FindOne(ctx, bson.M{"email": cfg.SuperadminEmail}).Decode(&existingAdmin)
	if err == nil {
		log.Info("Superadmin already exists")
		return
	}
	if err != mongo.ErrNoDocuments {
		log.Error("Error checking for superadmin", err)
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.SuperadminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Error("Failed to hash superadmin password", err)
		return
	}

	// Create superadmin
	admin := bson.M{
		"email":         cfg.SuperadminEmail,
		"password_hash": string(hash),
		"first_name":    "Super",
		"last_name":     "Admin",
		"role":          "superadmin",
		"is_active":     true,
		"created_at":    time.Now().UTC(),
		"updated_at":    time.Now().UTC(),
	}

	_, err = db.Collection("users").InsertOne(ctx, admin)
	if err != nil {
		log.Error("Failed to create superadmin", err)
		return
	}
	log.Infof("Created superadmin: %s", cfg.SuperadminEmail)
}

// runSeed creates the initial superadmin and sample data
func runSeed(cfg *config.Config, log *logger.Logger) {
	log.Info("Running seed command...")

	// Connect to MongoDB
	db, mongoClient, err := database.Connect(cfg.MongoURI, cfg.MongoDB, cfg.MongoTimeout, log)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB", err)
	}
	defer database.Disconnect(mongoClient, log)

	// Create indexes first
	if err := router.CreateIndexes(db, log); err != nil {
		log.Fatal("Failed to create indexes", err)
	}

	ctx := context.Background()

	// Check if superadmin exists
	var existingAdmin bson.M
	err = db.Collection("users").FindOne(ctx, bson.M{"email": cfg.SuperadminEmail}).Decode(&existingAdmin)
	if err == nil {
		log.Info("Superadmin already exists, skipping creation")
	} else if err == mongo.ErrNoDocuments {
		// Hash password
		hash, err := bcrypt.GenerateFromPassword([]byte(cfg.SuperadminPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Failed to hash password", err)
		}

		// Create superadmin
		admin := bson.M{
			"email":         cfg.SuperadminEmail,
			"password_hash": string(hash),
			"first_name":    "Super",
			"last_name":     "Admin",
			"role":          "superadmin",
			"is_active":     true,
			"created_at":    time.Now().UTC(),
			"updated_at":    time.Now().UTC(),
		}

		_, err = db.Collection("users").InsertOne(ctx, admin)
		if err != nil {
			log.Fatal("Failed to create superadmin", err)
		}
		log.Infof("Created superadmin: %s", cfg.SuperadminEmail)
	}

	// Check if sample clinic exists
	var existingClinic bson.M
	err = db.Collection("clinics").FindOne(ctx, bson.M{"name": "Demo Clinic"}).Decode(&existingClinic)
	if err == nil {
		log.Info("Demo clinic already exists, skipping creation")
	} else if err == mongo.ErrNoDocuments {
		// Create demo clinic
		clinic := bson.M{
			"name":       "Demo Clinic",
			"timezone":   "UTC",
			"address":    "123 Medical Ave",
			"phone":      "+1234567890",
			"is_active":  true,
			"created_at": time.Now().UTC(),
			"updated_at": time.Now().UTC(),
		}

		_, err = db.Collection("clinics").InsertOne(ctx, clinic)
		if err != nil {
			log.Fatal("Failed to create demo clinic", err)
		}
		log.Info("Created demo clinic: Demo Clinic")
	}

	fmt.Println("\n✅ Seed completed successfully!")
	fmt.Printf("\nSuperadmin credentials:\n")
	fmt.Printf("  Email: %s\n", cfg.SuperadminEmail)
	fmt.Printf("  Password: %s\n", cfg.SuperadminPassword)
	fmt.Println("\nYou can now login and create clinics.")
}
