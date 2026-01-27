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

type StaffSalaryRepository struct {
	collection *mongo.Collection
}

func NewStaffSalaryRepository(db *mongo.Database) *StaffSalaryRepository {
	return &StaffSalaryRepository{
		collection: db.Collection("staff_salaries"),
	}
}

func (r *StaffSalaryRepository) Create(ctx context.Context, salary *models.StaffSalary) error {
	salary.CreatedAt = time.Now().UTC()
	salary.UpdatedAt = salary.CreatedAt
	result, err := r.collection.InsertOne(ctx, salary)
	if err != nil {
		return err
	}
	salary.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *StaffSalaryRepository) FindByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.StaffSalary, error) {
	var salary models.StaffSalary
	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}
	err := r.collection.FindOne(ctx, filter).Decode(&salary)
	if err != nil {
		return nil, err
	}
	return &salary, nil
}

func (r *StaffSalaryRepository) FindByClinic(ctx context.Context, clinicID primitive.ObjectID) ([]models.StaffSalary, error) {
	filter := bson.M{"clinic_id": clinicID}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var salaries []models.StaffSalary
	if err = cursor.All(ctx, &salaries); err != nil {
		return nil, err
	}
	return salaries, nil
}

func (r *StaffSalaryRepository) FindActiveByClinic(ctx context.Context, clinicID primitive.ObjectID) ([]models.StaffSalary, error) {
	filter := bson.M{
		"clinic_id": clinicID,
		"is_active": true,
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var salaries []models.StaffSalary
	if err = cursor.All(ctx, &salaries); err != nil {
		return nil, err
	}
	return salaries, nil
}

func (r *StaffSalaryRepository) Update(ctx context.Context, salary *models.StaffSalary) error {
	salary.UpdatedAt = time.Now().UTC()
	filter := bson.M{
		"_id":       salary.ID,
		"clinic_id": salary.ClinicID,
	}
	_, err := r.collection.ReplaceOne(ctx, filter, salary)
	return err
}

func (r *StaffSalaryRepository) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}
