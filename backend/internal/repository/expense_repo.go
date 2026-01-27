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

type ExpenseRepository struct {
	collection *mongo.Collection
}

func NewExpenseRepository(db *mongo.Database) *ExpenseRepository {
	return &ExpenseRepository{
		collection: db.Collection("expenses"),
	}
}

func (r *ExpenseRepository) Create(ctx context.Context, expense *models.Expense) error {
	expense.CreatedAt = time.Now().UTC()
	result, err := r.collection.InsertOne(ctx, expense)
	if err != nil {
		return err
	}
	expense.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *ExpenseRepository) FindByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Expense, error) {
	var expense models.Expense
	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}
	err := r.collection.FindOne(ctx, filter).Decode(&expense)
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (r *ExpenseRepository) FindByClinic(ctx context.Context, clinicID primitive.ObjectID) ([]models.Expense, error) {
	filter := bson.M{"clinic_id": clinicID}
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var expenses []models.Expense
	if err = cursor.All(ctx, &expenses); err != nil {
		return nil, err
	}
	return expenses, nil
}

func (r *ExpenseRepository) FindByClinicAndMonth(ctx context.Context, clinicID primitive.ObjectID, year, month int) ([]models.Expense, error) {
	// Format: YYYY-MM prefix for date matching
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	endDate := time.Date(year, time.Month(month+1), 0, 0, 0, 0, 0, time.UTC).Format("2006-01-02")

	filter := bson.M{
		"clinic_id": clinicID,
		"date": bson.M{
			"$gte": startDate,
			"$lte": endDate,
		},
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var expenses []models.Expense
	if err = cursor.All(ctx, &expenses); err != nil {
		return nil, err
	}
	return expenses, nil
}

func (r *ExpenseRepository) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}
