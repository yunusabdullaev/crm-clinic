package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	apperrors "medical-crm/pkg/errors"
)

// RBAC middleware checks if user has required role
func RBAC(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := GetRequestID(c)
		userRole := GetUserRole(c)

		if userRole == "" {
			appErr := apperrors.Unauthorized("Role not found in token")
			c.JSON(http.StatusUnauthorized, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		// Check if user's role is in allowed roles
		allowed := false
		for _, role := range allowedRoles {
			if userRole == role {
				allowed = true
				break
			}
		}

		if !allowed {
			appErr := apperrors.Forbidden("You do not have permission to access this resource")
			c.JSON(http.StatusForbidden, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		c.Next()
	}
}

// SuperadminOnly restricts access to superadmin only
func SuperadminOnly() gin.HandlerFunc {
	return RBAC("superadmin")
}

// BossOnly restricts access to boss only
func BossOnly() gin.HandlerFunc {
	return RBAC("boss")
}

// DoctorOnly restricts access to doctors only
func DoctorOnly() gin.HandlerFunc {
	return RBAC("doctor")
}

// ReceptionistOnly restricts access to receptionists only
func ReceptionistOnly() gin.HandlerFunc {
	return RBAC("receptionist")
}

// BossOrReceptionist allows both boss and receptionist
func BossOrReceptionist() gin.HandlerFunc {
	return RBAC("boss", "receptionist")
}

// ClinicStaff allows all clinic staff (boss, doctor, receptionist)
func ClinicStaff() gin.HandlerFunc {
	return RBAC("boss", "doctor", "receptionist")
}
