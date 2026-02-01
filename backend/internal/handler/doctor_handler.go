package handler

import (
	"net/http"
	"strconv"
	"time"

	"medical-crm/internal/middleware"
	"medical-crm/internal/models"
	"medical-crm/internal/service"
	apperrors "medical-crm/pkg/errors"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DoctorHandler struct {
	appointmentService   *service.AppointmentService
	visitService         *service.VisitService
	serviceService       *service.ServiceService
	auditService         *service.AuditService
	treatmentPlanService *service.TreatmentPlanService
}

func NewDoctorHandler(
	appointmentService *service.AppointmentService,
	visitService *service.VisitService,
	serviceService *service.ServiceService,
	auditService *service.AuditService,
	treatmentPlanService *service.TreatmentPlanService,
) *DoctorHandler {
	return &DoctorHandler{
		appointmentService:   appointmentService,
		visitService:         visitService,
		serviceService:       serviceService,
		auditService:         auditService,
		treatmentPlanService: treatmentPlanService,
	}
}

// GetSchedule returns doctor's schedule for a date range
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

	// Support both single date and date range
	today := time.Now().UTC().Format("2006-01-02")
	from := c.DefaultQuery("from", c.DefaultQuery("date", today))
	to := c.DefaultQuery("to", from)

	appointments, err := h.appointmentService.ListByDoctorRange(c.Request.Context(), clinicID, doctorID, from, to)
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
		"from":         from,
		"to":           to,
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

// SaveVisitDraft saves visit progress/draft without completing
// PUT /api/v1/doctor/visits/:id/draft
func (h *DoctorHandler) SaveVisitDraft(c *gin.Context) {
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

	var dto models.SaveVisitDraftDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	visit, err := h.visitService.SaveDraft(c.Request.Context(), visitID, clinicID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to save visit draft")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

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

// CreateTreatmentPlan creates a new treatment plan for a patient
// POST /api/v1/doctor/treatment-plans
func (h *DoctorHandler) CreateTreatmentPlan(c *gin.Context) {
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

	var dto models.CreateTreatmentPlanDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.BadRequest("Invalid request body")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	plan, err := h.treatmentPlanService.CreatePlan(c.Request.Context(), clinicID, doctorID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create treatment plan")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, plan.ToResponse())
}

// ListTreatmentPlansByPatient lists treatment plans for a specific patient
// GET /api/v1/doctor/patients/:id/treatment-plans
func (h *DoctorHandler) ListTreatmentPlansByPatient(c *gin.Context) {
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

	plans, err := h.treatmentPlanService.ListByPatient(c.Request.Context(), patientID, clinicID)
	if err != nil {
		appErr := apperrors.Internal("Failed to list treatment plans")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.TreatmentPlanResponse, len(plans))
	for i, plan := range plans {
		responses[i] = plan.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"treatment_plans": responses})
}

// ListDoctorTreatmentPlans lists treatment plans created by the doctor
// GET /api/v1/doctor/treatment-plans
func (h *DoctorHandler) ListDoctorTreatmentPlans(c *gin.Context) {
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

	status := c.Query("status")

	plans, err := h.treatmentPlanService.ListByDoctor(c.Request.Context(), doctorID, clinicID, status)
	if err != nil {
		appErr := apperrors.Internal("Failed to list treatment plans")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.TreatmentPlanResponse, len(plans))
	for i, plan := range plans {
		responses[i] = plan.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"treatment_plans": responses})
}

// UpdateTreatmentPlanStep updates the status of a treatment plan step
// PUT /api/v1/doctor/treatment-plans/:id/steps/:step
func (h *DoctorHandler) UpdateTreatmentPlanStep(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	planID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid treatment plan ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	stepNumber, err := strconv.Atoi(c.Param("step"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid step number")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.UpdatePlanStepDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.BadRequest("Invalid request body")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if err := h.treatmentPlanService.UpdateStepStatus(c.Request.Context(), planID, clinicID, stepNumber, dto); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to update treatment plan step")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Treatment plan step updated"})
}

// GetPatientVisits returns all visits for a specific patient
// GET /api/v1/doctor/patients/:id/visits
func (h *DoctorHandler) GetPatientVisits(c *gin.Context) {
	requestID := c.GetString("request_id")
	clinicIDStr := middleware.GetClinicID(c)
	if clinicIDStr == "" {
		appErr := apperrors.Unauthorized("Clinic not found in context")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}
	clinicID, err := primitive.ObjectIDFromHex(clinicIDStr)
	if err != nil {
		appErr := apperrors.BadRequest("Invalid clinic ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	patientIDStr := c.Param("id")
	patientID, err := primitive.ObjectIDFromHex(patientIDStr)
	if err != nil {
		appErr := apperrors.BadRequest("Invalid patient ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	visits, err := h.visitService.ListByPatient(c.Request.Context(), clinicID, patientID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to get patient visits")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"visits": visits})
}
