package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"medical-crm/internal/middleware"
	"medical-crm/internal/models"
	"medical-crm/internal/service"
	apperrors "medical-crm/pkg/errors"
)

type SuperadminHandler struct {
	clinicService *service.ClinicService
}

func NewSuperadminHandler(clinicService *service.ClinicService) *SuperadminHandler {
	return &SuperadminHandler{
		clinicService: clinicService,
	}
}

// CreateClinic creates a new clinic
// POST /api/v1/admin/clinics
func (h *SuperadminHandler) CreateClinic(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	var dto models.CreateClinicDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	clinic, err := h.clinicService.Create(c.Request.Context(), dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create clinic")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, clinic.ToResponse())
}

// ListClinics returns all clinics
// GET /api/v1/admin/clinics
func (h *SuperadminHandler) ListClinics(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	clinics, total, err := h.clinicService.List(c.Request.Context(), page, pageSize)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list clinics")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.ClinicResponse, len(clinics))
	for i, clinic := range clinics {
		responses[i] = clinic.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{
		"clinics":   responses,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetClinic returns a clinic by ID
// GET /api/v1/admin/clinics/:id
func (h *SuperadminHandler) GetClinic(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid clinic ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	clinic, err := h.clinicService.GetByID(c.Request.Context(), id)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to get clinic")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, clinic.ToResponse())
}

// InviteBoss creates an invitation for a boss to join a clinic
// POST /api/v1/admin/clinics/:id/invite
func (h *SuperadminHandler) InviteBoss(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid clinic ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CreateInviteDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	invitation, err := h.clinicService.InviteBoss(c.Request.Context(), clinicID, userID, dto.Email)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create invitation")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Use environment variable for base URL in production
	baseURL := c.GetHeader("X-Frontend-URL")
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}

	c.JSON(http.StatusCreated, invitation.ToResponse(baseURL))
}
