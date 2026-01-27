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

type PatientRepository struct {
	collection *mongo.Collection
	timeout    time.Duration
}

func NewPatientRepository(db *mongo.Database, timeout time.Duration) *PatientRepository {
	return &PatientRepository{
		collection: db.Collection("patients"),
		timeout:    timeout,
	}
}

// Create creates a new patient with clinic isolation
func (r *PatientRepository) Create(ctx context.Context, patient *models.Patient) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	patient.CreatedAt = time.Now().UTC()
	patient.UpdatedAt = patient.CreatedAt
	patient.IsActive = true

	result, err := r.collection.InsertOne(ctx, patient)
	if err != nil {
		return err
	}

	patient.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetByID retrieves a patient with clinic isolation check
func (r *PatientRepository) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Patient, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}

	var patient models.Patient
	err := r.collection.FindOne(ctx, filter).Decode(&patient)
	if err != nil {
		return nil, err
	}
	return &patient, nil
}

// GetByPhone retrieves a patient by phone within a clinic
func (r *PatientRepository) GetByPhone(ctx context.Context, phone string, clinicID primitive.ObjectID) (*models.Patient, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"phone":     phone,
		"clinic_id": clinicID,
	}

	var patient models.Patient
	err := r.collection.FindOne(ctx, filter).Decode(&patient)
	if err != nil {
		return nil, err
	}
	return &patient, nil
}

// List returns paginated patients for a clinic
func (r *PatientRepository) List(ctx context.Context, clinicID primitive.ObjectID, page, pageSize int, search string) ([]models.Patient, int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id": clinicID,
		"is_active": true,
	}

	// Add search filter if provided
	if search != "" {
		filter["$or"] = []bson.M{
			{"first_name": bson.M{"$regex": search, "$options": "i"}},
			{"last_name": bson.M{"$regex": search, "$options": "i"}},
			{"phone": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	skip := (page - 1) * pageSize

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(pageSize)).
		SetSort(bson.D{{Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var patients []models.Patient
	if err = cursor.All(ctx, &patients); err != nil {
		return nil, 0, err
	}

	return patients, total, nil
}

// Update updates a patient with clinic isolation
func (r *PatientRepository) Update(ctx context.Context, patient *models.Patient) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	patient.UpdatedAt = time.Now().UTC()

	filter := bson.M{
		"_id":       patient.ID,
		"clinic_id": patient.ClinicID,
	}

	_, err := r.collection.UpdateOne(ctx, filter, bson.M{"$set": patient})
	return err
}

// Delete soft-deletes a patient
func (r *PatientRepository) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
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

// CountByClinic returns total patients for a clinic
func (r *PatientRepository) CountByClinic(ctx context.Context, clinicID primitive.ObjectID) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	return r.collection.CountDocuments(ctx, bson.M{
		"clinic_id": clinicID,
		"is_active": true,
	})
}

// CountByClinicAndDate returns patients created on a specific date
func (r *PatientRepository) CountByClinicAndDate(ctx context.Context, clinicID primitive.ObjectID, date string) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	startOfDay, _ := time.Parse("2006-01-02", date)
	endOfDay := startOfDay.Add(24 * time.Hour)

	return r.collection.CountDocuments(ctx, bson.M{
		"clinic_id":  clinicID,
		"is_active":  true,
		"created_at": bson.M{"$gte": startOfDay, "$lt": endOfDay},
	})
}
