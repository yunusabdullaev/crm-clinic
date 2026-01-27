package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"medical-crm/internal/middleware"
	"medical-crm/internal/models"
	"medical-crm/internal/service"
	apperrors "medical-crm/pkg/errors"
)

type ReceptionistHandler struct {
	patientService     *service.PatientService
	appointmentService *service.AppointmentService
	userService        *service.UserService
}

func NewReceptionistHandler(
	patientService *service.PatientService,
	appointmentService *service.AppointmentService,
	userService *service.UserService,
) *ReceptionistHandler {
	return &ReceptionistHandler{
		patientService:     patientService,
		appointmentService: appointmentService,
		userService:        userService,
	}
}

// ==================== Patient Management ====================

// CreatePatient creates a new patient
// POST /api/v1/patients
func (h *ReceptionistHandler) CreatePatient(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CreatePatientDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	patient, err := h.patientService.Create(c.Request.Context(), dto, clinicID, userID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create patient")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, patient.ToResponse())
}

// ListPatients returns paginated patients
// GET /api/v1/patients
func (h *ReceptionistHandler) ListPatients(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")

	response, err := h.patientService.List(c.Request.Context(), clinicID, page, pageSize, search)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list patients")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetPatient returns a patient by ID
// GET /api/v1/patients/:id
func (h *ReceptionistHandler) GetPatient(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	patientID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid patient ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	patient, err := h.patientService.GetByID(c.Request.Context(), patientID, clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to get patient")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, patient.ToResponse())
}

// UpdatePatient updates a patient
// PUT /api/v1/patients/:id
func (h *ReceptionistHandler) UpdatePatient(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	patientID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid patient ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.UpdatePatientDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	patient, err := h.patientService.Update(c.Request.Context(), patientID, clinicID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to update patient")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, patient.ToResponse())
}

// DeletePatient soft-deletes a patient
// DELETE /api/v1/patients/:id
func (h *ReceptionistHandler) DeletePatient(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	patientID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid patient ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if err := h.patientService.Delete(c.Request.Context(), patientID, clinicID); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to delete patient")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Patient deleted successfully"})
}

// ==================== Appointment Management ====================

// CreateAppointment creates a new appointment
// POST /api/v1/appointments
func (h *ReceptionistHandler) CreateAppointment(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CreateAppointmentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	appointment, err := h.appointmentService.Create(c.Request.Context(), dto, clinicID, userID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create appointment")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, appointment.ToResponse())
}

// ListAppointments returns appointments for a date
// GET /api/v1/appointments
func (h *ReceptionistHandler) ListAppointments(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	date := c.DefaultQuery("date", time.Now().UTC().Format("2006-01-02"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	appointments, total, err := h.appointmentService.ListByClinicAndDate(c.Request.Context(), clinicID, date, page, pageSize)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list appointments")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"appointments": appointments,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	})
}

// GetAppointment returns an appointment by ID
// GET /api/v1/appointments/:id
func (h *ReceptionistHandler) GetAppointment(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	appointmentID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid appointment ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	appointment, err := h.appointmentService.GetByID(c.Request.Context(), appointmentID, clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to get appointment")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, appointment.ToResponse())
}

// RescheduleAppointment reschedules an appointment
// PUT /api/v1/appointments/:id/reschedule
func (h *ReceptionistHandler) RescheduleAppointment(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	appointmentID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid appointment ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.RescheduleAppointmentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if err := h.appointmentService.Reschedule(c.Request.Context(), appointmentID, clinicID, dto.StartTime); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to reschedule appointment")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Appointment rescheduled successfully"})
}

// CancelAppointment cancels an appointment
// PUT /api/v1/appointments/:id/cancel
func (h *ReceptionistHandler) CancelAppointment(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	appointmentID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid appointment ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if err := h.appointmentService.Cancel(c.Request.Context(), appointmentID, clinicID); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to cancel appointment")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Appointment cancelled successfully"})
}

// ListDoctors returns all doctors for appointment selection
// GET /api/v1/doctors
func (h *ReceptionistHandler) ListDoctors(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	doctors, err := h.userService.ListDoctors(c.Request.Context(), clinicID)
	if err != nil {
		appErr := apperrors.Internal("Failed to list doctors")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.UserResponse, len(doctors))
	for i, doctor := range doctors {
		responses[i] = doctor.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"doctors": responses})
}
