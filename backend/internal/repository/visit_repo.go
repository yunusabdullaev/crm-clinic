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

type VisitRepository struct {
	collection *mongo.Collection
	timeout    time.Duration
}

func NewVisitRepository(db *mongo.Database, timeout time.Duration) *VisitRepository {
	return &VisitRepository{
		collection: db.Collection("visits"),
		timeout:    timeout,
	}
}

func (r *VisitRepository) Create(ctx context.Context, visit *models.Visit) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	visit.CreatedAt = time.Now().UTC()
	visit.UpdatedAt = visit.CreatedAt
	visit.Status = models.VisitStatusStarted
	visit.Date = visit.CreatedAt.Format("2006-01-02")

	if visit.Services == nil {
		visit.Services = []models.VisitService{}
	}

	result, err := r.collection.InsertOne(ctx, visit)
	if err != nil {
		return err
	}

	visit.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *VisitRepository) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}

	var visit models.Visit
	err := r.collection.FindOne(ctx, filter).Decode(&visit)
	if err != nil {
		return nil, err
	}
	return &visit, nil
}

func (r *VisitRepository) GetByAppointment(ctx context.Context, appointmentID, clinicID primitive.ObjectID) (*models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"appointment_id": appointmentID,
		"clinic_id":      clinicID,
	}

	var visit models.Visit
	err := r.collection.FindOne(ctx, filter).Decode(&visit)
	if err != nil {
		return nil, err
	}
	return &visit, nil
}

func (r *VisitRepository) Update(ctx context.Context, visit *models.Visit) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	visit.UpdatedAt = time.Now().UTC()

	filter := bson.M{
		"_id":       visit.ID,
		"clinic_id": visit.ClinicID,
	}

	_, err := r.collection.UpdateOne(ctx, filter, bson.M{"$set": visit})
	return err
}

// ListByDoctor returns visits for a doctor on a specific date
func (r *VisitRepository) ListByDoctor(ctx context.Context, clinicID, doctorID primitive.ObjectID, date string) ([]models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id": clinicID,
		"doctor_id": doctorID,
		"date":      date,
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var visits []models.Visit
	if err = cursor.All(ctx, &visits); err != nil {
		return nil, err
	}

	return visits, nil
}

// ListByClinicAndDate returns visits for reporting
func (r *VisitRepository) ListByClinicAndDate(ctx context.Context, clinicID primitive.ObjectID, date string) ([]models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id": clinicID,
		"date":      date,
		"status":    models.VisitStatusCompleted,
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var visits []models.Visit
	if err = cursor.All(ctx, &visits); err != nil {
		return nil, err
	}

	return visits, nil
}

// ListByClinicAndMonth returns visits for a specific month
func (r *VisitRepository) ListByClinicAndMonth(ctx context.Context, clinicID primitive.ObjectID, year int, month int) ([]models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	// Create date range for the month
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0)

	filter := bson.M{
		"clinic_id":  clinicID,
		"status":     models.VisitStatusCompleted,
		"created_at": bson.M{"$gte": startDate, "$lt": endDate},
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var visits []models.Visit
	if err = cursor.All(ctx, &visits); err != nil {
		return nil, err
	}

	return visits, nil
}

// AggregateRevenueByDoctor aggregates revenue by doctor for a date range
func (r *VisitRepository) AggregateRevenueByDoctor(ctx context.Context, clinicID primitive.ObjectID, startDate, endDate string) (map[string]float64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"clinic_id": clinicID,
			"status":    models.VisitStatusCompleted,
			"date":      bson.M{"$gte": startDate, "$lte": endDate},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":           "$doctor_id",
			"total_revenue": bson.M{"$sum": "$total"},
			"total_earning": bson.M{"$sum": "$doctor_earning"},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[string]float64)
	for cursor.Next(ctx) {
		var doc struct {
			ID           primitive.ObjectID `bson:"_id"`
			TotalRevenue float64            `bson:"total_revenue"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return nil, err
		}
		result[doc.ID.Hex()] = doc.TotalRevenue
	}

	return result, nil
}

// CountByDoctorAndDate counts visits for a doctor on a date
func (r *VisitRepository) CountByDoctorAndDate(ctx context.Context, clinicID, doctorID primitive.ObjectID, date string) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	return r.collection.CountDocuments(ctx, bson.M{
		"clinic_id": clinicID,
		"doctor_id": doctorID,
		"date":      date,
		"status":    models.VisitStatusCompleted,
	})
}

// GetIncompleteByPatient checks if patient has any incomplete (started but not completed) visits
func (r *VisitRepository) GetIncompleteByPatient(ctx context.Context, clinicID, patientID primitive.ObjectID) (*models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id":  clinicID,
		"patient_id": patientID,
		"status":     models.VisitStatusStarted,
	}

	var visit models.Visit
	err := r.collection.FindOne(ctx, filter).Decode(&visit)
	if err != nil {
		return nil, err
	}
	return &visit, nil
}

// GetOlderIncompleteVisit finds an incomplete visit for a patient that is older than the given visit ID
func (r *VisitRepository) GetOlderIncompleteVisit(ctx context.Context, clinicID, patientID, currentVisitID primitive.ObjectID) (*models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id":  clinicID,
		"patient_id": patientID,
		"status":     models.VisitStatusStarted,
		"_id":        bson.M{"$ne": currentVisitID}, // Exclude current visit
	}

	// Sort by created_at ascending to get the oldest incomplete visit
	opts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: 1}})

	var visit models.Visit
	err := r.collection.FindOne(ctx, filter, opts).Decode(&visit)
	if err != nil {
		return nil, err
	}

	// Check if found visit was created before current visit
	if visit.ID.Timestamp().Before(currentVisitID.Timestamp()) {
		return &visit, nil
	}

	return nil, mongo.ErrNoDocuments
}

// ListByPatient returns all visits for a specific patient
func (r *VisitRepository) ListByPatient(ctx context.Context, clinicID, patientID primitive.ObjectID) ([]models.Visit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id":  clinicID,
		"patient_id": patientID,
	}

	// Sort by created_at descending (newest first)
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var visits []models.Visit
	if err := cursor.All(ctx, &visits); err != nil {
		return nil, err
	}

	return visits, nil
}
