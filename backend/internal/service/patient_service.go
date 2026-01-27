package service

import (
	"context"

	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type PatientService struct {
	patientRepo *repository.PatientRepository
}

func NewPatientService(patientRepo *repository.PatientRepository) *PatientService {
	return &PatientService{
		patientRepo: patientRepo,
	}
}

// Create creates a new patient
func (s *PatientService) Create(ctx context.Context, dto models.CreatePatientDTO, clinicID, creatorID primitive.ObjectID) (*models.Patient, error) {
	// Check for duplicate phone number
	existing, err := s.patientRepo.GetByPhone(ctx, dto.Phone, clinicID)
	if err == nil && existing != nil {
		return nil, apperrors.Conflict("Patient with this phone number already exists")
	}

	patient := &models.Patient{
		ClinicID:  clinicID,
		FirstName: dto.FirstName,
		LastName:  dto.LastName,
		Phone:     dto.Phone,
		DOB:       dto.DOB,
		Gender:    dto.Gender,
		Address:   dto.Address,
		Notes:     dto.Notes,
		CreatedBy: creatorID,
	}

	if err := s.patientRepo.Create(ctx, patient); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, apperrors.Conflict("Patient with this phone number already exists")
		}
		return nil, apperrors.InternalWithErr("Failed to create patient", err)
	}

	return patient, nil
}

// GetByID retrieves a patient by ID
func (s *PatientService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Patient, error) {
	patient, err := s.patientRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Patient")
	}
	return patient, nil
}

// List returns paginated patients
func (s *PatientService) List(ctx context.Context, clinicID primitive.ObjectID, page, pageSize int, search string) (*models.PaginatedPatientsResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	patients, total, err := s.patientRepo.List(ctx, clinicID, page, pageSize, search)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to list patients", err)
	}

	// Convert to response
	responses := make([]models.PatientResponse, len(patients))
	for i, p := range patients {
		responses[i] = p.ToResponse()
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return &models.PaginatedPatientsResponse{
		Patients:   responses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// Update updates a patient
func (s *PatientService) Update(ctx context.Context, id, clinicID primitive.ObjectID, dto models.UpdatePatientDTO) (*models.Patient, error) {
	patient, err := s.patientRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Patient")
	}

	// Update fields if provided
	if dto.FirstName != "" {
		patient.FirstName = dto.FirstName
	}
	if dto.LastName != "" {
		patient.LastName = dto.LastName
	}
	if dto.Phone != "" {
		// Check for duplicate phone
		existing, _ := s.patientRepo.GetByPhone(ctx, dto.Phone, clinicID)
		if existing != nil && existing.ID != patient.ID {
			return nil, apperrors.Conflict("Patient with this phone number already exists")
		}
		patient.Phone = dto.Phone
	}
	if dto.DOB != nil {
		patient.DOB = dto.DOB
	}
	if dto.Gender != "" {
		patient.Gender = dto.Gender
	}

	if dto.Address != "" {
		patient.Address = dto.Address
	}
	if dto.Notes != "" {
		patient.Notes = dto.Notes
	}

	if err := s.patientRepo.Update(ctx, patient); err != nil {
		return nil, apperrors.InternalWithErr("Failed to update patient", err)
	}

	return patient, nil
}

// Delete soft-deletes a patient
func (s *PatientService) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	// Verify patient exists
	_, err := s.patientRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return apperrors.NotFound("Patient")
	}

	if err := s.patientRepo.Delete(ctx, id, clinicID); err != nil {
		return apperrors.InternalWithErr("Failed to delete patient", err)
	}

	return nil
}
