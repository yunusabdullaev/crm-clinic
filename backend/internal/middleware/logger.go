package middleware

import (
	"time"

	"medical-crm/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Logger middleware logs all requests with structured fields
func Logger(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		if raw != "" {
			path = path + "?" + raw
		}

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)
		latencyMs := latency.Milliseconds()

		// Get context values
		requestID := GetRequestID(c)
		clinicID := GetClinicID(c)
		userID := GetUserID(c)
		role := GetUserRole(c)

		// Create contextual logger
		reqLog := log.WithRequestID(requestID)
		if clinicID != "" {
			reqLog = reqLog.WithClinic(clinicID)
		}
		if userID != "" {
			reqLog = reqLog.WithUser(userID, role)
		}

		// Log the request
		reqLog.RequestLog(
			c.Request.Method,
			path,
			c.Writer.Status(),
			latencyMs,
			c.ClientIP(),
			c.Request.UserAgent(),
		)
	}
}
