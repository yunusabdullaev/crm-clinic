package service

import (
	"context"
	"time"

	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type AppointmentService struct {
	appointmentRepo *repository.AppointmentRepository
	patientRepo     *repository.PatientRepository
	userRepo        *repository.UserRepository
}

func NewAppointmentService(
	appointmentRepo *repository.AppointmentRepository,
	patientRepo *repository.PatientRepository,
	userRepo *repository.UserRepository,
) *AppointmentService {
	return &AppointmentService{
		appointmentRepo: appointmentRepo,
		patientRepo:     patientRepo,
		userRepo:        userRepo,
	}
}

// Create creates a new appointment with overlap prevention
func (s *AppointmentService) Create(ctx context.Context, dto models.CreateAppointmentDTO, clinicID, creatorID primitive.ObjectID) (*models.Appointment, error) {
	patientID, err := primitive.ObjectIDFromHex(dto.PatientID)
	if err != nil {
		return nil, apperrors.BadRequest("Invalid patient ID")
	}

	doctorID, err := primitive.ObjectIDFromHex(dto.DoctorID)
	if err != nil {
		return nil, apperrors.BadRequest("Invalid doctor ID")
	}

	// Verify patient exists in this clinic
	_, err = s.patientRepo.GetByID(ctx, patientID, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Patient")
	}

	// Verify doctor exists in this clinic
	doctor, err := s.userRepo.GetByIDWithClinicCheck(ctx, doctorID, clinicID)
	if err != nil || doctor.Role != models.RoleDoctor {
		return nil, apperrors.NotFound("Doctor")
	}

	// Normalize start time to 30-minute slot boundary
	startTime := normalizeToSlot(dto.StartTime)

	// Validate appointment time (not in the past)
	if startTime.Before(time.Now().UTC()) {
		return nil, apperrors.BadRequest("Cannot create appointment in the past")
	}

	appointment := &models.Appointment{
		ClinicID:  clinicID,
		PatientID: patientID,
		DoctorID:  doctorID,
		StartTime: startTime,
		Notes:     dto.Notes,
		CreatedBy: creatorID,
	}

	// The unique index on (clinic_id, doctor_id, start_time) will prevent duplicates
	if err := s.appointmentRepo.Create(ctx, appointment); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, apperrors.AppointmentConflict()
		}
		return nil, apperrors.InternalWithErr("Failed to create appointment", err)
	}

	return appointment, nil
}

// GetByID retrieves an appointment by ID
func (s *AppointmentService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Appointment, error) {
	appointment, err := s.appointmentRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Appointment")
	}
	return appointment, nil
}

// ListByDoctor returns a doctor's schedule for a date
func (s *AppointmentService) ListByDoctor(ctx context.Context, clinicID, doctorID primitive.ObjectID, date string) ([]models.AppointmentResponse, error) {
	appointments, err := s.appointmentRepo.ListByDoctor(ctx, clinicID, doctorID, date)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to list appointments", err)
	}

	// Convert to responses with patient names
	responses := make([]models.AppointmentResponse, len(appointments))
	for i, a := range appointments {
		resp := a.ToResponse()

		// Fetch patient name
		patient, err := s.patientRepo.GetByID(ctx, a.PatientID, clinicID)
		if err == nil {
			resp.PatientName = patient.FirstName + " " + patient.LastName
		}

		responses[i] = resp
	}

	return responses, nil
}

// ListByDoctorRange returns a doctor's schedule for a date range
func (s *AppointmentService) ListByDoctorRange(ctx context.Context, clinicID, doctorID primitive.ObjectID, fromDate, toDate string) ([]models.AppointmentResponse, error) {
	appointments, err := s.appointmentRepo.ListByDoctorRange(ctx, clinicID, doctorID, fromDate, toDate)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to list appointments", err)
	}

	// Convert to responses with patient names
	responses := make([]models.AppointmentResponse, len(appointments))
	for i, a := range appointments {
		resp := a.ToResponse()

		// Fetch patient name
		patient, err := s.patientRepo.GetByID(ctx, a.PatientID, clinicID)
		if err == nil {
			resp.PatientName = patient.FirstName + " " + patient.LastName
		}

		responses[i] = resp
	}

	return responses, nil
}

// ListByClinicAndDate returns all appointments for a clinic on a date
func (s *AppointmentService) ListByClinicAndDate(ctx context.Context, clinicID primitive.ObjectID, date string, page, pageSize int) ([]models.AppointmentResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	appointments, total, err := s.appointmentRepo.ListByClinicAndDate(ctx, clinicID, date, page, pageSize)
	if err != nil {
		return nil, 0, apperrors.InternalWithErr("Failed to list appointments", err)
	}

	// Convert to responses with names
	responses := make([]models.AppointmentResponse, len(appointments))
	for i, a := range appointments {
		resp := a.ToResponse()

		// Fetch patient name
		patient, err := s.patientRepo.GetByID(ctx, a.PatientID, clinicID)
		if err == nil {
			resp.PatientName = patient.FirstName + " " + patient.LastName
		}

		// Fetch doctor name
		doctor, err := s.userRepo.GetByIDWithClinicCheck(ctx, a.DoctorID, clinicID)
		if err == nil {
			resp.DoctorName = doctor.FirstName + " " + doctor.LastName
		}

		responses[i] = resp
	}

	return responses, total, nil
}

// ListByDateRange returns appointments for a clinic within a date range with filters
func (s *AppointmentService) ListByDateRange(ctx context.Context, clinicID primitive.ObjectID, fromDate, toDate string, doctorID *primitive.ObjectID, status string, page, pageSize int) ([]models.AppointmentResponse, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	appointments, total, err := s.appointmentRepo.ListByClinicAndDateRange(ctx, clinicID, fromDate, toDate, doctorID, status, page, pageSize)
	if err != nil {
		return nil, 0, apperrors.InternalWithErr("Failed to list appointments", err)
	}

	// Log query for debugging (structured, no sensitive data)
	// Format: clinic_id, from, to, doctor_id, status, count
	// This helps diagnose visibility issues

	// Convert to responses with names
	responses := make([]models.AppointmentResponse, len(appointments))
	for i, a := range appointments {
		resp := a.ToResponse()

		// Fetch patient name
		patient, err := s.patientRepo.GetByID(ctx, a.PatientID, clinicID)
		if err == nil {
			resp.PatientName = patient.FirstName + " " + patient.LastName
		}

		// Fetch doctor name
		doctor, err := s.userRepo.GetByIDWithClinicCheck(ctx, a.DoctorID, clinicID)
		if err == nil {
			resp.DoctorName = doctor.FirstName + " " + doctor.LastName
		}

		responses[i] = resp
	}

	return responses, total, nil
}

// UpdateStatus updates only the appointment status
func (s *AppointmentService) UpdateStatus(ctx context.Context, id, clinicID primitive.ObjectID, status string) error {
	// Verify appointment exists
	_, err := s.appointmentRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return apperrors.NotFound("Appointment")
	}

	return s.appointmentRepo.UpdateStatus(ctx, id, clinicID, status)
}

// Reschedule changes the appointment time with overlap prevention
func (s *AppointmentService) Reschedule(ctx context.Context, id, clinicID primitive.ObjectID, newStartTime time.Time) error {
	appointment, err := s.appointmentRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return apperrors.NotFound("Appointment")
	}

	// Normalize to slot boundary
	newStartTime = normalizeToSlot(newStartTime)

	// Check for conflicts at the new time
	hasConflict, err := s.appointmentRepo.CheckOverlap(ctx, clinicID, appointment.DoctorID, newStartTime, &appointment.ID)
	if err != nil {
		return apperrors.InternalWithErr("Failed to check for conflicts", err)
	}
	if hasConflict {
		return apperrors.AppointmentConflict()
	}

	// Update the appointment
	appointment.StartTime = newStartTime
	appointment.EndTime = newStartTime.Add(models.SlotDuration)
	appointment.Date = newStartTime.UTC().Format("2006-01-02")

	return s.appointmentRepo.Update(ctx, appointment)
}

// Cancel cancels an appointment
func (s *AppointmentService) Cancel(ctx context.Context, id, clinicID primitive.ObjectID) error {
	return s.UpdateStatus(ctx, id, clinicID, models.AppointmentStatusCancelled)
}

// normalizeToSlot rounds time down to nearest 30-minute boundary
func normalizeToSlot(t time.Time) time.Time {
	t = t.UTC()
	minute := t.Minute()
	if minute >= 30 {
		minute = 30
	} else {
		minute = 0
	}
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), minute, 0, 0, time.UTC)
}
