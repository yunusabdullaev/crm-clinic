package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	apperrors "medical-crm/pkg/errors"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	UserIDKey           = "user_id"
	UserEmailKey        = "user_email"
	UserRoleKey         = "user_role"
	ClinicIDKey         = "clinic_id"
)

// JWTClaims represents the JWT claims structure
type JWTClaims struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	ClinicID string `json:"clinic_id,omitempty"`
	jwt.RegisteredClaims
}

// Auth middleware validates JWT tokens
func Auth(accessSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := GetRequestID(c)

		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			appErr := apperrors.Unauthorized("Authorization header is required")
			c.JSON(http.StatusUnauthorized, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			appErr := apperrors.Unauthorized("Invalid authorization header format")
			c.JSON(http.StatusUnauthorized, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)

		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, apperrors.TokenInvalid()
			}
			return []byte(accessSecret), nil
		})

		if err != nil {
			var appErr *apperrors.AppError
			if strings.Contains(err.Error(), "expired") {
				appErr = apperrors.TokenExpired()
			} else {
				appErr = apperrors.TokenInvalid()
			}
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok || !token.Valid {
			appErr := apperrors.TokenInvalid()
			c.JSON(http.StatusUnauthorized, apperrors.NewErrorResponse(appErr, requestID))
			c.Abort()
			return
		}

		// Set user info in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(UserEmailKey, claims.Email)
		c.Set(UserRoleKey, claims.Role)
		if claims.ClinicID != "" {
			c.Set(ClinicIDKey, claims.ClinicID)
		}

		c.Next()
	}
}

// Helper functions to get values from context

func GetUserID(c *gin.Context) string {
	if id, exists := c.Get(UserIDKey); exists {
		return id.(string)
	}
	return ""
}

func GetUserEmail(c *gin.Context) string {
	if email, exists := c.Get(UserEmailKey); exists {
		return email.(string)
	}
	return ""
}

func GetUserRole(c *gin.Context) string {
	if role, exists := c.Get(UserRoleKey); exists {
		return role.(string)
	}
	return ""
}

func GetClinicID(c *gin.Context) string {
	if id, exists := c.Get(ClinicIDKey); exists {
		return id.(string)
	}
	return ""
}

func GetClinicObjectID(c *gin.Context) (primitive.ObjectID, error) {
	clinicID := GetClinicID(c)
	if clinicID == "" {
		return primitive.NilObjectID, apperrors.Unauthorized("Clinic ID not found in token")
	}
	return primitive.ObjectIDFromHex(clinicID)
}

func GetUserObjectID(c *gin.Context) (primitive.ObjectID, error) {
	userID := GetUserID(c)
	if userID == "" {
		return primitive.NilObjectID, apperrors.Unauthorized("User ID not found in token")
	}
	return primitive.ObjectIDFromHex(userID)
}
