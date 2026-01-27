package service

import (
	"context"

	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type StaffSalaryService struct {
	repo     *repository.StaffSalaryRepository
	userRepo *repository.UserRepository
}

func NewStaffSalaryService(repo *repository.StaffSalaryRepository, userRepo *repository.UserRepository) *StaffSalaryService {
	return &StaffSalaryService{
		repo:     repo,
		userRepo: userRepo,
	}
}

func (s *StaffSalaryService) Create(ctx context.Context, clinicID, createdBy primitive.ObjectID, dto models.CreateStaffSalaryDTO) (*models.StaffSalary, error) {
	userID, err := primitive.ObjectIDFromHex(dto.UserID)
	if err != nil {
		return nil, apperrors.BadRequest("invalid user_id format")
	}

	// Verify user exists and belongs to clinic
	user, err := s.userRepo.GetByIDWithClinicCheck(ctx, userID, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("User")
		}
		return nil, apperrors.InternalWithErr("failed to verify user", err)
	}

	// Only non-doctor staff should have salaries (doctors use contracts)
	if user.Role == "doctor" {
		return nil, apperrors.BadRequest("doctors use contracts, not salaries")
	}

	salary := &models.StaffSalary{
		ClinicID:      clinicID,
		UserID:        userID,
		MonthlyAmount: dto.MonthlyAmount,
		EffectiveFrom: dto.EffectiveFrom,
		IsActive:      true,
		CreatedBy:     createdBy,
	}

	if err := s.repo.Create(ctx, salary); err != nil {
		return nil, apperrors.InternalWithErr("failed to create salary", err)
	}
	return salary, nil
}

func (s *StaffSalaryService) List(ctx context.Context, clinicID primitive.ObjectID) ([]models.StaffSalary, error) {
	salaries, err := s.repo.FindByClinic(ctx, clinicID)
	if err != nil {
		return nil, apperrors.InternalWithErr("failed to list salaries", err)
	}
	return salaries, nil
}

func (s *StaffSalaryService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.StaffSalary, error) {
	salary, err := s.repo.FindByID(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("Salary")
		}
		return nil, apperrors.InternalWithErr("failed to get salary", err)
	}
	return salary, nil
}

func (s *StaffSalaryService) Update(ctx context.Context, id, clinicID primitive.ObjectID, dto models.UpdateStaffSalaryDTO) (*models.StaffSalary, error) {
	salary, err := s.repo.FindByID(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("Salary")
		}
		return nil, apperrors.InternalWithErr("failed to get salary", err)
	}

	if dto.MonthlyAmount != nil {
		salary.MonthlyAmount = *dto.MonthlyAmount
	}
	if dto.IsActive != nil {
		salary.IsActive = *dto.IsActive
	}

	if err := s.repo.Update(ctx, salary); err != nil {
		return nil, apperrors.InternalWithErr("failed to update salary", err)
	}
	return salary, nil
}

func (s *StaffSalaryService) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	_, err := s.repo.FindByID(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return apperrors.NotFound("Salary")
		}
		return apperrors.InternalWithErr("failed to get salary", err)
	}

	if err := s.repo.Delete(ctx, id, clinicID); err != nil {
		return apperrors.InternalWithErr("failed to delete salary", err)
	}
	return nil
}

func (s *StaffSalaryService) GetActiveSalaries(ctx context.Context, clinicID primitive.ObjectID) ([]models.StaffSalary, error) {
	salaries, err := s.repo.FindActiveByClinic(ctx, clinicID)
	if err != nil {
		return nil, apperrors.InternalWithErr("failed to get active salaries", err)
	}
	return salaries, nil
}
