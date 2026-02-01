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

type VisitService struct {
	visitRepo       *repository.VisitRepository
	appointmentRepo *repository.AppointmentRepository
	patientRepo     *repository.PatientRepository
	serviceRepo     *repository.ServiceRepository
	userRepo        *repository.UserRepository
	contractRepo    *repository.DoctorContractRepository
}

func NewVisitService(
	visitRepo *repository.VisitRepository,
	appointmentRepo *repository.AppointmentRepository,
	patientRepo *repository.PatientRepository,
	serviceRepo *repository.ServiceRepository,
	userRepo *repository.UserRepository,
	contractRepo *repository.DoctorContractRepository,
) *VisitService {
	return &VisitService{
		visitRepo:       visitRepo,
		appointmentRepo: appointmentRepo,
		patientRepo:     patientRepo,
		serviceRepo:     serviceRepo,
		userRepo:        userRepo,
		contractRepo:    contractRepo,
	}
}

// StartVisit creates a new visit from an appointment or walk-in
func (s *VisitService) StartVisit(ctx context.Context, dto models.StartVisitDTO, clinicID, doctorID primitive.ObjectID) (*models.Visit, error) {
	patientID, err := primitive.ObjectIDFromHex(dto.PatientID)
	if err != nil {
		return nil, apperrors.BadRequest("Invalid patient ID")
	}

	// Verify patient exists
	_, err = s.patientRepo.GetByID(ctx, patientID, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Patient")
	}

	visit := &models.Visit{
		ClinicID:  clinicID,
		PatientID: patientID,
		DoctorID:  doctorID,
		Services:  []models.VisitService{},
	}

	// Link to appointment if provided
	if dto.AppointmentID != "" {
		appointmentID, err := primitive.ObjectIDFromHex(dto.AppointmentID)
		if err != nil {
			return nil, apperrors.BadRequest("Invalid appointment ID")
		}

		// Verify appointment exists and update its status
		appointment, err := s.appointmentRepo.GetByID(ctx, appointmentID, clinicID)
		if err != nil {
			return nil, apperrors.NotFound("Appointment")
		}

		// Verify the appointment is for this doctor
		if appointment.DoctorID != doctorID {
			return nil, apperrors.Forbidden("This appointment is for another doctor")
		}

		visit.AppointmentID = &appointmentID

		// Update appointment status to in_progress
		if err := s.appointmentRepo.UpdateStatus(ctx, appointmentID, clinicID, models.AppointmentStatusInProgress); err != nil {
			return nil, apperrors.InternalWithErr("Failed to update appointment status", err)
		}
	}

	if err := s.visitRepo.Create(ctx, visit); err != nil {
		return nil, apperrors.InternalWithErr("Failed to create visit", err)
	}

	return visit, nil
}

// GetByID retrieves a visit by ID
func (s *VisitService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Visit, error) {
	visit, err := s.visitRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Visit")
	}
	return visit, nil
}

// CompleteVisit completes a visit with diagnosis and services
func (s *VisitService) CompleteVisit(ctx context.Context, id, clinicID primitive.ObjectID, dto models.CompleteVisitDTO) (*models.Visit, error) {
	visit, err := s.visitRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Visit")
	}

	if visit.Status == models.VisitStatusCompleted {
		return nil, apperrors.BadRequest("Visit is already completed")
	}

	// Get services and calculate totals
	visit.Services = []models.VisitService{}
	serviceIDs := make([]primitive.ObjectID, 0, len(dto.Services))
	serviceQuantities := make(map[string]int)

	for _, svc := range dto.Services {
		serviceID, err := primitive.ObjectIDFromHex(svc.ServiceID)
		if err != nil {
			return nil, apperrors.BadRequest("Invalid service ID: " + svc.ServiceID)
		}
		serviceIDs = append(serviceIDs, serviceID)
		serviceQuantities[svc.ServiceID] = svc.Quantity
	}

	// Fetch all services at once
	services, err := s.serviceRepo.GetMultipleByIDs(ctx, serviceIDs, clinicID)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to fetch services", err)
	}

	if len(services) != len(serviceIDs) {
		return nil, apperrors.BadRequest("One or more services not found")
	}

	for _, svc := range services {
		quantity := serviceQuantities[svc.ID.Hex()]
		visit.Services = append(visit.Services, models.VisitService{
			ServiceID:   svc.ID,
			ServiceName: svc.Name,
			Price:       svc.Price,
			Quantity:    quantity,
		})
	}

	// Set discount
	visit.DiscountType = dto.DiscountType
	visit.DiscountValue = dto.DiscountValue

	// Validate discount
	if visit.DiscountType == "fixed" {
		// Calculate subtotal first to validate
		subtotal := 0.0
		for _, svc := range visit.Services {
			subtotal += svc.Price * float64(svc.Quantity)
		}
		if visit.DiscountValue > subtotal {
			return nil, apperrors.InvalidDiscount("Discount cannot exceed subtotal")
		}
	} else if visit.DiscountType == "percentage" {
		if visit.DiscountValue > 100 {
			return nil, apperrors.InvalidDiscount("Percentage discount cannot exceed 100%")
		}
	}

	// Get doctor share from active contract
	today := time.Now().Format("2006-01-02")
	contract, err := s.contractRepo.FindActiveByDoctor(ctx, clinicID, visit.DoctorID, today)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// No active contract found, default to 0% share
			visit.DoctorShare = 0
		} else {
			return nil, apperrors.InternalWithErr("Failed to fetch doctor contract", err)
		}
	} else {
		visit.DoctorShare = contract.SharePercentage
	}

	// Calculate totals
	visit.CalculateTotal()

	// Validate total is not negative
	if visit.Total < 0 {
		return nil, apperrors.InvalidDiscount("Total cannot be negative")
	}

	// Update visit status
	visit.Diagnosis = dto.Diagnosis
	visit.Notes = dto.Notes
	visit.AffectedTeeth = dto.AffectedTeeth
	visit.XRayImages = dto.XRayImages
	visit.PaymentType = dto.PaymentType
	visit.Status = models.VisitStatusCompleted
	now := time.Now().UTC()
	visit.CompletedAt = &now

	if err := s.visitRepo.Update(ctx, visit); err != nil {
		return nil, apperrors.InternalWithErr("Failed to complete visit", err)
	}

	// Update appointment status if linked
	if visit.AppointmentID != nil {
		if err := s.appointmentRepo.UpdateStatus(ctx, *visit.AppointmentID, clinicID, models.AppointmentStatusCompleted); err != nil {
			// Log error but don't fail the visit
		}
	}

	return visit, nil
}

// ListByDoctor returns visits for a doctor on a date
func (s *VisitService) ListByDoctor(ctx context.Context, clinicID, doctorID primitive.ObjectID, date string) ([]models.VisitResponse, error) {
	visits, err := s.visitRepo.ListByDoctor(ctx, clinicID, doctorID, date)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to list visits", err)
	}

	responses := make([]models.VisitResponse, len(visits))
	for i, v := range visits {
		resp := v.ToResponse()

		// Fetch patient name
		patient, err := s.patientRepo.GetByID(ctx, v.PatientID, clinicID)
		if err == nil {
			resp.PatientName = patient.FirstName + " " + patient.LastName
		}

		responses[i] = resp
	}

	return responses, nil
}

// SaveDraft saves visit progress/draft without completing
func (s *VisitService) SaveDraft(ctx context.Context, id, clinicID primitive.ObjectID, dto models.SaveVisitDraftDTO) (*models.Visit, error) {
	visit, err := s.visitRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Visit")
	}

	if visit.Status == models.VisitStatusCompleted {
		return nil, apperrors.BadRequest("Cannot edit completed visit")
	}

	// Update diagnosis
	if dto.Diagnosis != "" {
		visit.Diagnosis = dto.Diagnosis
	}

	// Update comment
	visit.Comment = dto.Comment

	// Update affected teeth
	if dto.AffectedTeeth != nil {
		visit.AffectedTeeth = dto.AffectedTeeth
	}

	// Update plan steps
	if dto.PlanSteps != nil {
		visit.PlanSteps = dto.PlanSteps
	}

	// Update X-ray images
	if dto.XRayImages != nil {
		visit.XRayImages = dto.XRayImages
	}

	// Update discount
	if dto.DiscountType != "" {
		visit.DiscountType = dto.DiscountType
		visit.DiscountValue = dto.DiscountValue
	}

	// Update payment type
	if dto.PaymentType != "" {
		visit.PaymentType = dto.PaymentType
	}

	// Update services if provided
	if len(dto.Services) > 0 {
		visit.Services = []models.VisitService{}
		serviceIDs := make([]primitive.ObjectID, 0, len(dto.Services))
		serviceQuantities := make(map[string]int)

		for _, svc := range dto.Services {
			serviceID, err := primitive.ObjectIDFromHex(svc.ServiceID)
			if err != nil {
				continue // Skip invalid service IDs
			}
			serviceIDs = append(serviceIDs, serviceID)
			serviceQuantities[svc.ServiceID] = svc.Quantity
		}

		if len(serviceIDs) > 0 {
			services, err := s.serviceRepo.GetMultipleByIDs(ctx, serviceIDs, clinicID)
			if err == nil {
				for _, svc := range services {
					quantity := serviceQuantities[svc.ID.Hex()]
					if quantity <= 0 {
						quantity = 1
					}
					visit.Services = append(visit.Services, models.VisitService{
						ServiceID:   svc.ID,
						ServiceName: svc.Name,
						Price:       svc.Price,
						Quantity:    quantity,
					})
				}
			}
		}

		// Calculate totals
		visit.CalculateTotal()
	}

	visit.UpdatedAt = time.Now().UTC()

	if err := s.visitRepo.Update(ctx, visit); err != nil {
		return nil, apperrors.InternalWithErr("Failed to save visit draft", err)
	}

	return visit, nil
}
