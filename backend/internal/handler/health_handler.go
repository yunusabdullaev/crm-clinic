package handler

import (
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"medical-crm/internal/database"
)

type HealthHandler struct {
	mongoClient *mongo.Client
	startTime   time.Time
}

func NewHealthHandler(mongoClient *mongo.Client) *HealthHandler {
	return &HealthHandler{
		mongoClient: mongoClient,
		startTime:   time.Now(),
	}
}

// Health returns basic health status
// GET /health
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"uptime":    time.Since(h.startTime).String(),
	})
}

// Ready checks if the service is ready to accept traffic
// GET /ready
func (h *HealthHandler) Ready(c *gin.Context) {
	// Check MongoDB connection
	if err := database.HealthCheck(h.mongoClient, 5*time.Second); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "not_ready",
			"error":   "Database connection failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"checks": gin.H{
			"database": "ok",
		},
	})
}

// Metrics returns Prometheus-compatible metrics
// GET /metrics
func (h *HealthHandler) Metrics(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	uptime := time.Since(h.startTime).Seconds()

	// Simple Prometheus-format metrics
	metrics := fmt.Sprintf(`# HELP medical_crm_uptime_seconds The uptime of the service in seconds
# TYPE medical_crm_uptime_seconds gauge
medical_crm_uptime_seconds %.2f

# HELP medical_crm_go_goroutines Number of goroutines
# TYPE medical_crm_go_goroutines gauge
medical_crm_go_goroutines %d

# HELP medical_crm_go_alloc_bytes Number of bytes allocated and still in use
# TYPE medical_crm_go_alloc_bytes gauge
medical_crm_go_alloc_bytes %d

# HELP medical_crm_go_sys_bytes Number of bytes obtained from system
# TYPE medical_crm_go_sys_bytes gauge
medical_crm_go_sys_bytes %d

# HELP medical_crm_go_gc_runs_total Total number of completed GC cycles
# TYPE medical_crm_go_gc_runs_total counter
medical_crm_go_gc_runs_total %d
`, uptime, runtime.NumGoroutine(), m.Alloc, m.Sys, m.NumGC)

	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(metrics))
}
