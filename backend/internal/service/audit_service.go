package service

import (
	"context"
	"medical-crm/internal/models"
	"medical-crm/internal/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuditService struct {
	repo *repository.AuditLogRepository
}

func NewAuditService(repo *repository.AuditLogRepository) *AuditService {
	return &AuditService{repo: repo}
}

// LogAsync logs an audit event asynchronously (fire and forget)
func (s *AuditService) LogAsync(
	clinicID, actorID, entityID primitive.ObjectID,
	action models.AuditAction,
	entityType string,
	requestID string,
	meta map[string]interface{},
) {
	log := &models.AuditLog{
		ClinicID:   clinicID,
		ActorID:    actorID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Meta:       meta,
		RequestID:  requestID,
	}
	s.repo.CreateAsync(log)
}

// Query retrieves audit logs with filters
func (s *AuditService) Query(
	ctx context.Context,
	clinicID primitive.ObjectID,
	doctorID *primitive.ObjectID,
	startDate, endDate string,
	limit int64,
) ([]models.AuditLog, error) {
	return s.repo.FindByClinicAndFilters(ctx, clinicID, doctorID, startDate, endDate, limit)
}
