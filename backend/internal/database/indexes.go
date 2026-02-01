package database

import (
	"context"
	"time"

	"medical-crm/pkg/logger"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// IndexDefinition represents a MongoDB index
type IndexDefinition struct {
	Collection string
	Keys       bson.D
	Unique     bool
	Name       string
	Sparse     bool
}

// GetIndexes returns all required indexes for the application
func GetIndexes() []IndexDefinition {
	return []IndexDefinition{
		// Clinics
		{
			Collection: "clinics",
			Keys:       bson.D{{Key: "name", Value: 1}},
			Unique:     true,
			Name:       "idx_clinics_name_unique",
		},

		// Users - phone-based authentication
		{
			Collection: "users",
			Keys:       bson.D{{Key: "phone", Value: 1}},
			Unique:     true,
			Name:       "idx_users_phone_unique",
		},
		{
			Collection: "users",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "role", Value: 1}},
			Unique:     false,
			Name:       "idx_users_clinic_role",
		},
		{
			Collection: "users",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}},
			Unique:     false,
			Name:       "idx_users_clinic",
		},

		// Invitations
		{
			Collection: "invitations",
			Keys:       bson.D{{Key: "token", Value: 1}},
			Unique:     true,
			Name:       "idx_invitations_token_unique",
		},
		{
			Collection: "invitations",
			Keys:       bson.D{{Key: "email", Value: 1}, {Key: "clinic_id", Value: 1}},
			Unique:     false,
			Name:       "idx_invitations_email_clinic",
		},

		// Patients
		{
			Collection: "patients",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "phone", Value: 1}},
			Unique:     true,
			Name:       "idx_patients_clinic_phone_unique",
		},
		{
			Collection: "patients",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "last_name", Value: 1}, {Key: "first_name", Value: 1}},
			Unique:     false,
			Name:       "idx_patients_clinic_name",
		},
		{
			Collection: "patients",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "created_at", Value: -1}},
			Unique:     false,
			Name:       "idx_patients_clinic_created",
		},

		// Appointments - CRITICAL for overlap prevention
		{
			Collection: "appointments",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "doctor_id", Value: 1}, {Key: "start_time", Value: 1}},
			Unique:     true,
			Name:       "idx_appointments_clinic_doctor_time_unique",
		},
		{
			Collection: "appointments",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "date", Value: 1}},
			Unique:     false,
			Name:       "idx_appointments_clinic_date",
		},
		{
			Collection: "appointments",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "patient_id", Value: 1}},
			Unique:     false,
			Name:       "idx_appointments_clinic_patient",
		},
		{
			Collection: "appointments",
			Keys:       bson.D{{Key: "doctor_id", Value: 1}, {Key: "date", Value: 1}},
			Unique:     false,
			Name:       "idx_appointments_doctor_date",
		},
		// Index for date range queries with sorting
		{
			Collection: "appointments",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "start_time", Value: -1}, {Key: "doctor_id", Value: 1}},
			Unique:     false,
			Name:       "idx_appointments_clinic_start_time_doctor",
		},

		// Services
		{
			Collection: "services",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}},
			Unique:     false,
			Name:       "idx_services_clinic",
		},
		{
			Collection: "services",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "name", Value: 1}},
			Unique:     true,
			Name:       "idx_services_clinic_name_unique",
		},

		// Visits
		{
			Collection: "visits",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "doctor_id", Value: 1}, {Key: "date", Value: 1}},
			Unique:     false,
			Name:       "idx_visits_clinic_doctor_date",
		},
		{
			Collection: "visits",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "created_at", Value: -1}},
			Unique:     false,
			Name:       "idx_visits_clinic_created",
		},
		{
			Collection: "visits",
			Keys:       bson.D{{Key: "clinic_id", Value: 1}, {Key: "patient_id", Value: 1}},
			Unique:     false,
			Name:       "idx_visits_clinic_patient",
		},
		{
			Collection: "visits",
			Keys:       bson.D{{Key: "appointment_id", Value: 1}},
			Unique:     true,
			Sparse:     true,
			Name:       "idx_visits_appointment_unique",
		},
	}
}

// CreateIndexes creates all required indexes (idempotent)
func CreateIndexes(db *mongo.Database, log *logger.Logger) error {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	indexes := GetIndexes()

	for _, idx := range indexes {
		collection := db.Collection(idx.Collection)

		indexModel := mongo.IndexModel{
			Keys: idx.Keys,
			Options: options.Index().
				SetUnique(idx.Unique).
				SetName(idx.Name).
				SetBackground(true),
		}

		if idx.Sparse {
			indexModel.Options.SetSparse(true)
		}

		_, err := collection.Indexes().CreateOne(ctx, indexModel)
		if err != nil {
			// Check if it's a duplicate key error (index already exists with same name)
			if mongo.IsDuplicateKeyError(err) {
				log.Debugf("Index %s already exists on %s", idx.Name, idx.Collection)
				continue
			}
			log.Error("Failed to create index", err)
			return err
		}

		log.Infof("Created index %s on %s", idx.Name, idx.Collection)
	}

	log.Info("All indexes created successfully")
	return nil
}
