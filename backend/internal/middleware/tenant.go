package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	apperrors "medical-crm/pkg/errors"
)

// TenantIsolation ensures users can only access their own clinic's data
// Superadmin is exempt from this check
func TenantIsolation() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := GetRequestID(c)
		userRole := GetUserRole(c)

		// Superadmin can access all clinics
		if userRole == "superadmin" {
			c.Next()
			return
		}

		// Other roles must have a clinic_id in their token
		clinicID := GetClinicID(c)
		if clinicID == "" {
			appErr := apperrors.Forbidden("Access denied: no clinic association found")
			c.JSON(http.StatusForbidden, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		// Verify that if a clinic_id is specified in the URL, it matches the user's clinic
		if urlClinicID := c.Param("clinic_id"); urlClinicID != "" && urlClinicID != clinicID {
			appErr := apperrors.Forbidden("Access denied: cross-clinic access not allowed")
			c.JSON(http.StatusForbidden, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireClinicID ensures the request has a clinic context
func RequireClinicID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := GetRequestID(c)
		userRole := GetUserRole(c)

		// Superadmin doesn't need clinic_id for some operations
		if userRole == "superadmin" {
			c.Next()
			return
		}

		clinicID := GetClinicID(c)
		if clinicID == "" {
			appErr := apperrors.BadRequest("Clinic context is required")
			c.JSON(http.StatusBadRequest, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		c.Next()
	}
}
