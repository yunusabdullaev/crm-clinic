package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment string
	ServiceName string

	// Server
	ServerPort         string
	ServerReadTimeout  time.Duration
	ServerWriteTimeout time.Duration

	// MongoDB
	MongoURI      string
	MongoDB       string
	MongoTimeout  time.Duration

	// JWT
	JWTAccessSecret  string
	JWTRefreshSecret string
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration

	// Superadmin seed
	SuperadminEmail    string
	SuperadminPassword string
}

func Load() *Config {
	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		ServiceName: getEnv("SERVICE_NAME", "medical-crm"),

		ServerPort:         getEnv("SERVER_PORT", "8080"),
		ServerReadTimeout:  getDurationEnv("SERVER_READ_TIMEOUT", 30*time.Second),
		ServerWriteTimeout: getDurationEnv("SERVER_WRITE_TIMEOUT", 30*time.Second),

		MongoURI:     getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:      getEnv("MONGO_DB", "medical_crm"),
		MongoTimeout: getDurationEnv("MONGO_TIMEOUT", 10*time.Second),

		JWTAccessSecret:  getEnv("JWT_ACCESS_SECRET", "change-me-access-secret-32chars!"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "change-me-refresh-secret-32char!"),
		JWTAccessTTL:     getDurationEnv("JWT_ACCESS_TTL", 15*time.Minute),
		JWTRefreshTTL:    getDurationEnv("JWT_REFRESH_TTL", 7*24*time.Hour),

		SuperadminEmail:    getEnv("SUPERADMIN_EMAIL", "admin@crm.local"),
		SuperadminPassword: getEnv("SUPERADMIN_PASSWORD", "Admin123!"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if seconds, err := strconv.Atoi(value); err == nil {
			return time.Duration(seconds) * time.Second
		}
	}
	return defaultValue
}
