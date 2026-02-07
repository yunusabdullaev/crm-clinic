package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
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
	MongoURI     string
	MongoDB      string
	MongoTimeout time.Duration

	// JWT
	JWTAccessSecret  string
	JWTRefreshSecret string
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration

	// Superadmin seed
	SuperadminEmail    string
	SuperadminPassword string

	// CORS / Frontend
	FrontendURL    string
	AllowedOrigins []string
}

func Load() *Config {
	cfg := &Config{
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

		SuperadminEmail:    getEnv("SUPERADMIN_EMAIL", ""),
		SuperadminPassword: getEnv("SUPERADMIN_PASSWORD", ""),

		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
	}

	// Build allowed origins list
	cfg.AllowedOrigins = buildAllowedOrigins(cfg.FrontendURL, cfg.Environment)

	return cfg
}

// Validate checks critical configuration in production.
// Returns an error if secrets are weak or missing.
func (c *Config) Validate() error {
	if !c.IsProduction() {
		return nil // Skip validation in development
	}

	// JWT secrets must be set and strong in production
	defaultSecrets := []string{
		"change-me-access-secret-32chars!",
		"change-me-refresh-secret-32char!",
	}

	for _, def := range defaultSecrets {
		if c.JWTAccessSecret == def || c.JWTRefreshSecret == def {
			return fmt.Errorf("CRITICAL: JWT secrets must be changed from default values in production. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET env vars")
		}
	}

	if len(c.JWTAccessSecret) < 32 {
		return fmt.Errorf("CRITICAL: JWT_ACCESS_SECRET must be at least 32 characters in production (got %d)", len(c.JWTAccessSecret))
	}
	if len(c.JWTRefreshSecret) < 32 {
		return fmt.Errorf("CRITICAL: JWT_REFRESH_SECRET must be at least 32 characters in production (got %d)", len(c.JWTRefreshSecret))
	}

	return nil
}

// IsProduction returns true if the environment is production
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// SeedEnabled returns true if auto-seed should run (only in development or when credentials are explicitly set)
func (c *Config) SeedEnabled() bool {
	if c.IsProduction() {
		// In production, only seed if both credentials are explicitly set via env vars
		return c.SuperadminEmail != "" && c.SuperadminPassword != ""
	}
	// In development, use defaults if not set
	if c.SuperadminEmail == "" {
		c.SuperadminEmail = "admin@crm.local"
	}
	if c.SuperadminPassword == "" {
		c.SuperadminPassword = "Admin123!"
	}
	return true
}

func buildAllowedOrigins(frontendURL, environment string) []string {
	origins := []string{}

	if frontendURL != "" {
		origins = append(origins, frontendURL)
	}

	// In development, allow localhost variations
	if environment != "production" {
		origins = append(origins,
			"http://localhost:3000",
			"http://localhost:3001",
			"http://127.0.0.1:3000",
		)
	}

	// Allow additional origins from env (comma-separated)
	if extra := os.Getenv("ALLOWED_ORIGINS"); extra != "" {
		for _, origin := range strings.Split(extra, ",") {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				origins = append(origins, origin)
			}
		}
	}

	return origins
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
