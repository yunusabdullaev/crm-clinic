package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ClinicService struct {
	clinicRepo     *repository.ClinicRepository
	invitationRepo *repository.InvitationRepository
}

func NewClinicService(clinicRepo *repository.ClinicRepository, invitationRepo *repository.InvitationRepository) *ClinicService {
	return &ClinicService{
		clinicRepo:     clinicRepo,
		invitationRepo: invitationRepo,
	}
}

// Create creates a new clinic
func (s *ClinicService) Create(ctx context.Context, dto models.CreateClinicDTO) (*models.Clinic, error) {
	// Check if clinic name already exists
	existing, _ := s.clinicRepo.GetByName(ctx, dto.Name)
	if existing != nil {
		return nil, apperrors.Conflict("Clinic with this name already exists")
	}

	clinic := &models.Clinic{
		Name:     dto.Name,
		Timezone: dto.Timezone,
		Address:  dto.Address,
		Phone:    dto.Phone,
	}

	if err := s.clinicRepo.Create(ctx, clinic); err != nil {
		return nil, apperrors.InternalWithErr("Failed to create clinic", err)
	}

	return clinic, nil
}

// GetByID retrieves a clinic by ID
func (s *ClinicService) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Clinic, error) {
	clinic, err := s.clinicRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.NotFound("Clinic")
	}
	return clinic, nil
}

// List returns paginated clinics
func (s *ClinicService) List(ctx context.Context, page, pageSize int) ([]models.Clinic, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	return s.clinicRepo.List(ctx, page, pageSize)
}

// InviteBoss creates an invitation for a boss to join a clinic
func (s *ClinicService) InviteBoss(ctx context.Context, clinicID, createdBy primitive.ObjectID, email string) (*models.Invitation, error) {
	// Verify clinic exists
	_, err := s.clinicRepo.GetByID(ctx, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Clinic")
	}

	// Check for existing unused invitation
	existing, _ := s.invitationRepo.GetUnusedByEmail(ctx, email, clinicID)
	if existing != nil {
		return existing, nil // Return existing invitation
	}

	// Generate secure token
	token, err := generateSecureToken(32)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to generate invite token", err)
	}

	invitation := &models.Invitation{
		ClinicID:  clinicID,
		Email:     email,
		Role:      models.RoleBoss,
		Token:     token,
		ExpiresAt: time.Now().UTC().Add(7 * 24 * time.Hour), // 7 days
		CreatedBy: createdBy,
	}

	if err := s.invitationRepo.Create(ctx, invitation); err != nil {
		return nil, apperrors.InternalWithErr("Failed to create invitation", err)
	}

	return invitation, nil
}

// Update updates a clinic (superadmin only)
func (s *ClinicService) Update(ctx context.Context, id primitive.ObjectID, dto models.UpdateClinicDTO) (*models.Clinic, error) {
	clinic, err := s.clinicRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.NotFound("Clinic")
	}

	// Apply updates only for provided fields
	if dto.Name != nil && *dto.Name != "" {
		// Check if name is already taken by another clinic
		existing, _ := s.clinicRepo.GetByName(ctx, *dto.Name)
		if existing != nil && existing.ID != id {
			return nil, apperrors.Conflict("Clinic with this name already exists")
		}
		clinic.Name = *dto.Name
	}
	if dto.Timezone != nil {
		clinic.Timezone = *dto.Timezone
	}
	if dto.Address != nil {
		clinic.Address = *dto.Address
	}
	if dto.Phone != nil {
		clinic.Phone = *dto.Phone
	}
	if dto.IsActive != nil {
		clinic.IsActive = *dto.IsActive
	}

	if err := s.clinicRepo.Update(ctx, clinic); err != nil {
		return nil, apperrors.InternalWithErr("Failed to update clinic", err)
	}

	return clinic, nil
}

// Delete deletes a clinic (superadmin only)
func (s *ClinicService) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := s.clinicRepo.GetByID(ctx, id)
	if err != nil {
		return apperrors.NotFound("Clinic")
	}

	if err := s.clinicRepo.Delete(ctx, id); err != nil {
		return apperrors.InternalWithErr("Failed to delete clinic", err)
	}

	return nil
}

// generateSecureToken generates a cryptographically secure random token
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
