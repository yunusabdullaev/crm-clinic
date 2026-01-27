package service

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"
	"medical-crm/pkg/logger"
)

type DoctorContractService struct {
	repo     *repository.DoctorContractRepository
	userRepo *repository.UserRepository
	log      *logger.Logger
}

func NewDoctorContractService(repo *repository.DoctorContractRepository, userRepo *repository.UserRepository, log *logger.Logger) *DoctorContractService {
	return &DoctorContractService{
		repo:     repo,
		userRepo: userRepo,
		log:      log,
	}
}

func (s *DoctorContractService) Create(ctx context.Context, clinicID, createdBy primitive.ObjectID, dto models.CreateDoctorContractDTO) (*models.DoctorContract, error) {
	doctorID, err := primitive.ObjectIDFromHex(dto.DoctorID)
	if err != nil {
		return nil, apperrors.BadRequest("invalid doctor_id format")
	}

	// Verify doctor exists and belongs to the clinic
	doctor, err := s.userRepo.GetByIDWithClinicCheck(ctx, doctorID, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("doctor not found")
		}
		s.log.Error("failed to find doctor", err)
		return nil, apperrors.Internal("failed to verify doctor")
	}
	if doctor.Role != "doctor" {
		return nil, apperrors.BadRequest("user is not a doctor")
	}

	contract := &models.DoctorContract{
		ClinicID:        clinicID,
		DoctorID:        doctorID,
		SharePercentage: dto.SharePercentage,
		StartDate:       dto.StartDate,
		EndDate:         dto.EndDate,
		IsActive:        true,
		Notes:           dto.Notes,
		CreatedBy:       createdBy,
	}

	if err := s.repo.Create(ctx, contract); err != nil {
		s.log.Error("failed to create doctor contract", err)
		return nil, apperrors.Internal("failed to create contract")
	}

	s.log.Infof("doctor contract created: contract_id=%s doctor_id=%s share=%.2f", contract.ID.Hex(), dto.DoctorID, dto.SharePercentage)
	return contract, nil
}

func (s *DoctorContractService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.DoctorContract, error) {
	contract, err := s.repo.FindByIDAndClinic(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("contract not found")
		}
		return nil, apperrors.Internal("failed to get contract")
	}
	return contract, nil
}

func (s *DoctorContractService) List(ctx context.Context, clinicID primitive.ObjectID) ([]models.DoctorContract, error) {
	contracts, err := s.repo.FindByClinic(ctx, clinicID)
	if err != nil {
		s.log.Error("failed to list contracts", err)
		return nil, apperrors.Internal("failed to list contracts")
	}
	return contracts, nil
}

func (s *DoctorContractService) GetActiveForDoctor(ctx context.Context, clinicID, doctorID primitive.ObjectID, date string) (*models.DoctorContract, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	contract, err := s.repo.FindActiveByDoctor(ctx, clinicID, doctorID, date)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("no active contract found for doctor")
		}
		return nil, apperrors.Internal("failed to get active contract")
	}
	return contract, nil
}

func (s *DoctorContractService) Update(ctx context.Context, id, clinicID primitive.ObjectID, dto models.UpdateDoctorContractDTO) (*models.DoctorContract, error) {
	contract, err := s.repo.FindByIDAndClinic(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("contract not found")
		}
		return nil, apperrors.Internal("failed to get contract")
	}

	if dto.SharePercentage != nil {
		contract.SharePercentage = *dto.SharePercentage
	}
	if dto.EndDate != nil {
		contract.EndDate = *dto.EndDate
	}
	if dto.IsActive != nil {
		contract.IsActive = *dto.IsActive
	}
	if dto.Notes != nil {
		contract.Notes = *dto.Notes
	}

	if err := s.repo.Update(ctx, contract); err != nil {
		s.log.Error("failed to update contract", err)
		return nil, apperrors.Internal("failed to update contract")
	}

	s.log.Infof("doctor contract updated: contract_id=%s", id.Hex())
	return contract, nil
}

func (s *DoctorContractService) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	contract, err := s.repo.FindByIDAndClinic(ctx, id, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return apperrors.NotFound("contract not found")
		}
		return apperrors.Internal("failed to get contract")
	}

	if err := s.repo.Delete(ctx, contract.ID); err != nil {
		s.log.Error("failed to delete contract", err)
		return apperrors.Internal("failed to delete contract")
	}

	s.log.Infof("doctor contract deleted: contract_id=%s", id.Hex())
	return nil
}
