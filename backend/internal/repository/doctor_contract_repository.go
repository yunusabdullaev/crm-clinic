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

type DoctorContractRepository struct {
	collection *mongo.Collection
}

func NewDoctorContractRepository(db *mongo.Database) *DoctorContractRepository {
	return &DoctorContractRepository{
		collection: db.Collection("doctor_contracts"),
	}
}

func (r *DoctorContractRepository) Create(ctx context.Context, contract *models.DoctorContract) error {
	contract.CreatedAt = time.Now().UTC()
	contract.UpdatedAt = time.Now().UTC()
	result, err := r.collection.InsertOne(ctx, contract)
	if err != nil {
		return err
	}
	contract.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *DoctorContractRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.DoctorContract, error) {
	var contract models.DoctorContract
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&contract)
	if err != nil {
		return nil, err
	}
	return &contract, nil
}

func (r *DoctorContractRepository) FindByIDAndClinic(ctx context.Context, id, clinicID primitive.ObjectID) (*models.DoctorContract, error) {
	var contract models.DoctorContract
	err := r.collection.FindOne(ctx, bson.M{"_id": id, "clinic_id": clinicID}).Decode(&contract)
	if err != nil {
		return nil, err
	}
	return &contract, nil
}

// FindActiveByDoctor finds the currently active contract for a doctor at a specific date
func (r *DoctorContractRepository) FindActiveByDoctor(ctx context.Context, clinicID, doctorID primitive.ObjectID, date string) (*models.DoctorContract, error) {
	var contract models.DoctorContract
	filter := bson.M{
		"clinic_id":  clinicID,
		"doctor_id":  doctorID,
		"is_active":  true,
		"start_date": bson.M{"$lte": date},
		"$or": []bson.M{
			{"end_date": ""},
			{"end_date": bson.M{"$exists": false}},
			{"end_date": bson.M{"$gte": date}},
		},
	}
	// Get the most recent contract if multiple exist
	opts := options.FindOne().SetSort(bson.D{{Key: "start_date", Value: -1}})
	err := r.collection.FindOne(ctx, filter, opts).Decode(&contract)
	if err != nil {
		return nil, err
	}
	return &contract, nil
}

func (r *DoctorContractRepository) FindByClinic(ctx context.Context, clinicID primitive.ObjectID) ([]models.DoctorContract, error) {
	cursor, err := r.collection.Find(ctx, bson.M{"clinic_id": clinicID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var contracts []models.DoctorContract
	if err := cursor.All(ctx, &contracts); err != nil {
		return nil, err
	}
	return contracts, nil
}

func (r *DoctorContractRepository) FindByDoctorAndClinic(ctx context.Context, doctorID, clinicID primitive.ObjectID) ([]models.DoctorContract, error) {
	cursor, err := r.collection.Find(ctx, bson.M{"doctor_id": doctorID, "clinic_id": clinicID}, options.Find().SetSort(bson.D{{Key: "start_date", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var contracts []models.DoctorContract
	if err := cursor.All(ctx, &contracts); err != nil {
		return nil, err
	}
	return contracts, nil
}

func (r *DoctorContractRepository) Update(ctx context.Context, contract *models.DoctorContract) error {
	contract.UpdatedAt = time.Now().UTC()
	_, err := r.collection.ReplaceOne(ctx, bson.M{"_id": contract.ID}, contract)
	return err
}

func (r *DoctorContractRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
