package handler

import (
	"fmt"
	"net/http"

	"medical-crm/internal/middleware"
	"medical-crm/internal/models"
	"medical-crm/internal/service"
	apperrors "medical-crm/pkg/errors"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
	userService *service.UserService
}

func NewAuthHandler(authService *service.AuthService, userService *service.UserService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userService: userService,
	}
}

// Login handles user authentication
// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	var dto models.LoginDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	response, err := h.authService.Login(c.Request.Context(), dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Login failed")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, response)
}

// RefreshToken handles token refresh
// POST /api/v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	var dto models.RefreshTokenDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	response, err := h.authService.RefreshToken(c.Request.Context(), dto.RefreshToken)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Token refresh failed")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, response)
}

// AcceptInvite handles invitation acceptance and user creation
// POST /api/v1/auth/accept-invite
func (h *AuthHandler) AcceptInvite(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	var dto models.AcceptInviteDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	response, err := h.userService.AcceptInvite(c.Request.Context(), dto)
	if err != nil {
		fmt.Printf("AcceptInvite failed: error=%s, phone=%s\n", err.Error(), dto.Phone)
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to accept invitation")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, response)
}
