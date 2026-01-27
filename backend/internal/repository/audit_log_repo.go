package repository

import (
	"context"
	"time"

	"medical-crm/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AuditLogRepository struct {
	collection *mongo.Collection
}

func NewAuditLogRepository(db *mongo.Database) *AuditLogRepository {
	return &AuditLogRepository{
		collection: db.Collection("audit_logs"),
	}
}

// Create inserts a new audit log entry
func (r *AuditLogRepository) Create(ctx context.Context, log *models.AuditLog) error {
	log.CreatedAt = time.Now().UTC()
	result, err := r.collection.InsertOne(ctx, log)
	if err != nil {
		return err
	}
	log.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// CreateAsync creates an audit log entry asynchronously (fire and forget)
func (r *AuditLogRepository) CreateAsync(log *models.AuditLog) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		log.CreatedAt = time.Now().UTC()
		r.collection.InsertOne(ctx, log)
	}()
}

// FindByClinicAndFilters queries audit logs with optional filters
func (r *AuditLogRepository) FindByClinicAndFilters(
	ctx context.Context,
	clinicID primitive.ObjectID,
	doctorID *primitive.ObjectID,
	startDate, endDate string,
	limit int64,
) ([]models.AuditLog, error) {
	filter := bson.M{"clinic_id": clinicID}

	if doctorID != nil {
		filter["actor_user_id"] = *doctorID
	}

	// Date range filter
	if startDate != "" || endDate != "" {
		dateFilter := bson.M{}
		if startDate != "" {
			startTime, err := time.Parse("2006-01-02", startDate)
			if err == nil {
				dateFilter["$gte"] = startTime
			}
		}
		if endDate != "" {
			endTime, err := time.Parse("2006-01-02", endDate)
			if err == nil {
				// End of day
				endTime = endTime.Add(24*time.Hour - time.Second)
				dateFilter["$lte"] = endTime
			}
		}
		if len(dateFilter) > 0 {
			filter["created_at"] = dateFilter
		}
	}

	// Sort by most recent first
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	if limit > 0 {
		opts.SetLimit(limit)
	} else {
		opts.SetLimit(100) // Default limit
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []models.AuditLog
	if err = cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}
