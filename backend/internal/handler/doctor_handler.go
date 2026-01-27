package handler

import (
	"net/http"
	"time"

	"medical-crm/internal/middleware"
	"medical-crm/internal/models"
	"medical-crm/internal/service"
	apperrors "medical-crm/pkg/errors"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DoctorHandler struct {
	appointmentService *service.AppointmentService
	visitService       *service.VisitService
	serviceService     *service.ServiceService
	auditService       *service.AuditService
}

func NewDoctorHandler(
	appointmentService *service.AppointmentService,
	visitService *service.VisitService,
	serviceService *service.ServiceService,
	auditService *service.AuditService,
) *DoctorHandler {
	return &DoctorHandler{
		appointmentService: appointmentService,
		visitService:       visitService,
		serviceService:     serviceService,
		auditService:       auditService,
	}
}

// GetSchedule returns doctor's schedule for a date
// GET /api/v1/doctor/schedule
func (h *DoctorHandler) GetSchedule(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	doctorID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	date := c.DefaultQuery("date", time.Now().UTC().Format("2006-01-02"))

	appointments, err := h.appointmentService.ListByDoctor(c.Request.Context(), clinicID, doctorID, date)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to get schedule")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"date":         date,
		"appointments": appointments,
	})
}

// StartVisit starts a new visit
// POST /api/v1/doctor/visits
func (h *DoctorHandler) StartVisit(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	doctorID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.StartVisitDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	visit, err := h.visitService.StartVisit(c.Request.Context(), dto, clinicID, doctorID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to start visit")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Log audit event async
	h.auditService.LogAsync(clinicID, doctorID, visit.ID, models.AuditActionVisitStarted, "visit", requestID, map[string]interface{}{
		"patient_id": visit.PatientID.Hex(),
	})

	c.JSON(http.StatusCreated, visit.ToResponse())
}

// GetVisit returns a visit by ID
// GET /api/v1/doctor/visits/:id
func (h *DoctorHandler) GetVisit(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	visitID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid visit ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	visit, err := h.visitService.GetByID(c.Request.Context(), visitID, clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to get visit")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, visit.ToResponse())
}

// CompleteVisit completes a visit with diagnosis and services
// PUT /api/v1/doctor/visits/:id/complete
func (h *DoctorHandler) CompleteVisit(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	doctorID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	visitID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid visit ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CompleteVisitDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	visit, err := h.visitService.CompleteVisit(c.Request.Context(), visitID, clinicID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to complete visit")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Log audit event async
	h.auditService.LogAsync(clinicID, doctorID, visitID, models.AuditActionVisitFinished, "visit", requestID, map[string]interface{}{
		"total":          visit.Total,
		"doctor_earning": visit.DoctorEarning,
		"diagnosis":      visit.Diagnosis,
	})

	c.JSON(http.StatusOK, visit.ToResponse())
}

// ListTodayVisits returns doctor's visits for today
// GET /api/v1/doctor/visits
func (h *DoctorHandler) ListTodayVisits(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	doctorID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	date := c.DefaultQuery("date", time.Now().UTC().Format("2006-01-02"))

	visits, err := h.visitService.ListByDoctor(c.Request.Context(), clinicID, doctorID, date)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list visits")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"date":   date,
		"visits": visits,
	})
}

// ListServices returns available services for visits
// GET /api/v1/doctor/services
func (h *DoctorHandler) ListServices(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	services, err := h.serviceService.List(c.Request.Context(), clinicID, true)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list services")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"services": services})
}

// UpdateAppointmentStatus updates an appointment status
// PUT /api/v1/doctor/appointments/:id/status
func (h *DoctorHandler) UpdateAppointmentStatus(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	doctorID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	appointmentID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid appointment ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.UpdateAppointmentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if err := h.appointmentService.UpdateStatus(c.Request.Context(), appointmentID, clinicID, dto.Status); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to update appointment status")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Log audit event async
	h.auditService.LogAsync(clinicID, doctorID, appointmentID, models.AuditActionAppointmentStatusChanged, "appointment", requestID, map[string]interface{}{
		"new_status": dto.Status,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Appointment status updated"})
}
