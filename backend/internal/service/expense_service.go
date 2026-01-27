package service

import (
	"context"

	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ExpenseService struct {
	repo *repository.ExpenseRepository
}

func NewExpenseService(repo *repository.ExpenseRepository) *ExpenseService {
	return &ExpenseService{repo: repo}
}

func (s *ExpenseService) Create(ctx context.Context, clinicID, createdBy primitive.ObjectID, dto models.CreateExpenseDTO) (*models.Expense, error) {
	expense := &models.Expense{
		ClinicID:  clinicID,
		Category:  dto.Category,
		Amount:    dto.Amount,
		Date:      dto.Date,
		Note:      dto.Note,
		CreatedBy: createdBy,
	}

	if err := s.repo.Create(ctx, expense); err != nil {
		return nil, apperrors.InternalWithErr("failed to create expense", err)
	}
	return expense, nil
}

func (s *ExpenseService) List(ctx context.Context, clinicID primitive.ObjectID) ([]models.Expense, error) {
	expenses, err := s.repo.FindByClinic(ctx, clinicID)
	if err != nil {
		return nil, apperrors.InternalWithErr("failed to list expenses", err)
	}
	return expenses, nil
}

func (s *ExpenseService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Expense, error) {
	expense, err := s.repo.FindByID(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("Expense")
		}
		return nil, apperrors.InternalWithErr("failed to get expense", err)
	}
	return expense, nil
}

func (s *ExpenseService) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	// Verify exists first
	_, err := s.repo.FindByID(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return apperrors.NotFound("Expense")
		}
		return apperrors.InternalWithErr("failed to get expense", err)
	}

	if err := s.repo.Delete(ctx, id, clinicID); err != nil {
		return apperrors.InternalWithErr("failed to delete expense", err)
	}
	return nil
}

func (s *ExpenseService) GetMonthlyExpenses(ctx context.Context, clinicID primitive.ObjectID, year, month int) ([]models.Expense, error) {
	expenses, err := s.repo.FindByClinicAndMonth(ctx, clinicID, year, month)
	if err != nil {
		return nil, apperrors.InternalWithErr("failed to get monthly expenses", err)
	}
	return expenses, nil
}
