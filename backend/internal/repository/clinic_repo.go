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

type ClinicRepository struct {
	collection *mongo.Collection
	timeout    time.Duration
}

func NewClinicRepository(db *mongo.Database, timeout time.Duration) *ClinicRepository {
	return &ClinicRepository{
		collection: db.Collection("clinics"),
		timeout:    timeout,
	}
}

func (r *ClinicRepository) Create(ctx context.Context, clinic *models.Clinic) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	clinic.CreatedAt = time.Now().UTC()
	clinic.UpdatedAt = clinic.CreatedAt
	clinic.IsActive = true

	result, err := r.collection.InsertOne(ctx, clinic)
	if err != nil {
		return err
	}

	clinic.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *ClinicRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Clinic, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	var clinic models.Clinic
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&clinic)
	if err != nil {
		return nil, err
	}
	return &clinic, nil
}

func (r *ClinicRepository) GetByName(ctx context.Context, name string) (*models.Clinic, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	var clinic models.Clinic
	err := r.collection.FindOne(ctx, bson.M{"name": name}).Decode(&clinic)
	if err != nil {
		return nil, err
	}
	return &clinic, nil
}

func (r *ClinicRepository) List(ctx context.Context, page, pageSize int) ([]models.Clinic, int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	skip := (page - 1) * pageSize

	total, err := r.collection.CountDocuments(ctx, bson.M{"is_active": true})
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(pageSize)).
		SetSort(bson.D{{Key: "name", Value: 1}})

	cursor, err := r.collection.Find(ctx, bson.M{"is_active": true}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var clinics []models.Clinic
	if err = cursor.All(ctx, &clinics); err != nil {
		return nil, 0, err
	}

	return clinics, total, nil
}

func (r *ClinicRepository) Update(ctx context.Context, clinic *models.Clinic) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	clinic.UpdatedAt = time.Now().UTC()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": clinic.ID},
		bson.M{"$set": clinic},
	)
	return err
}

func (r *ClinicRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
