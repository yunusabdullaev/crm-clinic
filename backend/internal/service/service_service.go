package service

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"
)

type ServiceService struct {
	serviceRepo *repository.ServiceRepository
}

func NewServiceService(serviceRepo *repository.ServiceRepository) *ServiceService {
	return &ServiceService{
		serviceRepo: serviceRepo,
	}
}

// Create creates a new service
func (s *ServiceService) Create(ctx context.Context, dto models.CreateServiceDTO, clinicID, creatorID primitive.ObjectID) (*models.Service, error) {
	service := &models.Service{
		ClinicID:    clinicID,
		Name:        dto.Name,
		Description: dto.Description,
		Price:       dto.Price,
		Duration:    dto.Duration,
		CreatedBy:   creatorID,
	}

	if service.Duration == 0 {
		service.Duration = 30
	}

	if err := s.serviceRepo.Create(ctx, service); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, apperrors.Conflict("Service with this name already exists")
		}
		return nil, apperrors.InternalWithErr("Failed to create service", err)
	}

	return service, nil
}

// GetByID retrieves a service by ID
func (s *ServiceService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Service, error) {
	service, err := s.serviceRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Service")
	}
	return service, nil
}

// List returns all services for a clinic
func (s *ServiceService) List(ctx context.Context, clinicID primitive.ObjectID, activeOnly bool) ([]models.ServiceResponse, error) {
	services, err := s.serviceRepo.List(ctx, clinicID, activeOnly)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to list services", err)
	}

	responses := make([]models.ServiceResponse, len(services))
	for i, svc := range services {
		responses[i] = svc.ToResponse()
	}

	return responses, nil
}

// Update updates a service
func (s *ServiceService) Update(ctx context.Context, id, clinicID primitive.ObjectID, dto models.UpdateServiceDTO) (*models.Service, error) {
	service, err := s.serviceRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("Service")
	}

	if dto.Name != "" {
		service.Name = dto.Name
	}
	if dto.Description != "" {
		service.Description = dto.Description
	}
	if dto.Price != nil {
		service.Price = *dto.Price
	}
	if dto.Duration != nil {
		service.Duration = *dto.Duration
	}
	if dto.IsActive != nil {
		service.IsActive = *dto.IsActive
	}

	if err := s.serviceRepo.Update(ctx, service); err != nil {
		return nil, apperrors.InternalWithErr("Failed to update service", err)
	}

	return service, nil
}

// Delete soft-deletes a service
func (s *ServiceService) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	_, err := s.serviceRepo.GetByID(ctx, id, clinicID)
	if err != nil {
		return apperrors.NotFound("Service")
	}

	return s.serviceRepo.Delete(ctx, id, clinicID)
}
