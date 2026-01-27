package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	apperrors "medical-crm/pkg/errors"
	"medical-crm/pkg/logger"
)

// Recovery middleware recovers from panics and logs the error
func Recovery(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				requestID := GetRequestID(c)
				stack := string(debug.Stack())
				
				// Log the panic with stack trace
				log.WithRequestID(requestID).ErrorWithStack(
					"Panic recovered",
					nil,
					stack,
				)
				
				// Return a standard error response
				appErr := apperrors.Internal("An unexpected error occurred")
				c.JSON(http.StatusInternalServerError, apperrors.NewErrorResponse(appErr, requestID))
				c.Abort()
			}
		}()
		
		c.Next()
	}
}
