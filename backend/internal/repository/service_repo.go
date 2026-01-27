package repository

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"medical-crm/internal/models"
)

type ServiceRepository struct {
	collection *mongo.Collection
	timeout    time.Duration
}

func NewServiceRepository(db *mongo.Database, timeout time.Duration) *ServiceRepository {
	return &ServiceRepository{
		collection: db.Collection("services"),
		timeout:    timeout,
	}
}

func (r *ServiceRepository) Create(ctx context.Context, service *models.Service) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	service.CreatedAt = time.Now().UTC()
	service.UpdatedAt = service.CreatedAt
	service.IsActive = true

	if service.Duration == 0 {
		service.Duration = 30 // Default 30 minutes
	}

	result, err := r.collection.InsertOne(ctx, service)
	if err != nil {
		return err
	}

	service.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *ServiceRepository) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Service, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}

	var service models.Service
	err := r.collection.FindOne(ctx, filter).Decode(&service)
	if err != nil {
		return nil, err
	}
	return &service, nil
}

func (r *ServiceRepository) List(ctx context.Context, clinicID primitive.ObjectID, activeOnly bool) ([]models.Service, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{"clinic_id": clinicID}
	if activeOnly {
		filter["is_active"] = true
	}

	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var services []models.Service
	if err = cursor.All(ctx, &services); err != nil {
		return nil, err
	}

	return services, nil
}

func (r *ServiceRepository) Update(ctx context.Context, service *models.Service) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	service.UpdatedAt = time.Now().UTC()

	filter := bson.M{
		"_id":       service.ID,
		"clinic_id": service.ClinicID,
	}

	_, err := r.collection.UpdateOne(ctx, filter, bson.M{"$set": service})
	return err
}

func (r *ServiceRepository) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}

	_, err := r.collection.UpdateOne(
		ctx,
		filter,
		bson.M{"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now().UTC(),
		}},
	)
	return err
}

// GetMultipleByIDs fetches multiple services by their IDs with clinic isolation
func (r *ServiceRepository) GetMultipleByIDs(ctx context.Context, ids []primitive.ObjectID, clinicID primitive.ObjectID) ([]models.Service, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"_id":       bson.M{"$in": ids},
		"clinic_id": clinicID,
		"is_active": true,
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var services []models.Service
	if err = cursor.All(ctx, &services); err != nil {
		return nil, err
	}

	return services, nil
}
