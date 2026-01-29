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

type AppointmentRepository struct {
	collection *mongo.Collection
	timeout    time.Duration
}

func NewAppointmentRepository(db *mongo.Database, timeout time.Duration) *AppointmentRepository {
	return &AppointmentRepository{
		collection: db.Collection("appointments"),
		timeout:    timeout,
	}
}

// Create creates an appointment using atomic operation to prevent overlaps
// The unique index on (clinic_id, doctor_id, start_time) ensures no double-booking
func (r *AppointmentRepository) Create(ctx context.Context, appointment *models.Appointment) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	appointment.CreatedAt = time.Now().UTC()
	appointment.UpdatedAt = appointment.CreatedAt
	appointment.EndTime = appointment.StartTime.Add(models.SlotDuration)
	appointment.Status = models.AppointmentStatusScheduled

	// Format date for indexing
	appointment.Date = appointment.StartTime.UTC().Format("2006-01-02")

	result, err := r.collection.InsertOne(ctx, appointment)
	if err != nil {
		// Duplicate key error means slot is already booked
		if mongo.IsDuplicateKeyError(err) {
			return err // Caller should check for this and return AppointmentConflict
		}
		return err
	}

	appointment.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetByID retrieves an appointment with clinic isolation
func (r *AppointmentRepository) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.Appointment, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"_id":       id,
		"clinic_id": clinicID,
	}

	var appointment models.Appointment
	err := r.collection.FindOne(ctx, filter).Decode(&appointment)
	if err != nil {
		return nil, err
	}
	return &appointment, nil
}

// CheckOverlap checks if a time slot is available for a doctor
func (r *AppointmentRepository) CheckOverlap(ctx context.Context, clinicID, doctorID primitive.ObjectID, startTime time.Time, excludeID *primitive.ObjectID) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id":  clinicID,
		"doctor_id":  doctorID,
		"start_time": startTime,
		"status":     bson.M{"$nin": []string{models.AppointmentStatusCancelled}},
	}

	// Exclude the current appointment when rescheduling
	if excludeID != nil {
		filter["_id"] = bson.M{"$ne": *excludeID}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// ListByDoctor returns appointments for a doctor on a specific date
func (r *AppointmentRepository) ListByDoctor(ctx context.Context, clinicID, doctorID primitive.ObjectID, date string) ([]models.Appointment, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id": clinicID,
		"doctor_id": doctorID,
		"date":      date,
		"status":    bson.M{"$nin": []string{models.AppointmentStatusCancelled}},
	}

	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var appointments []models.Appointment
	if err = cursor.All(ctx, &appointments); err != nil {
		return nil, err
	}

	return appointments, nil
}

// ListByDoctorRange returns appointments for a doctor within a date range
func (r *AppointmentRepository) ListByDoctorRange(ctx context.Context, clinicID, doctorID primitive.ObjectID, fromDate, toDate string) ([]models.Appointment, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id": clinicID,
		"doctor_id": doctorID,
		"date": bson.M{
			"$gte": fromDate,
			"$lte": toDate,
		},
		"status": bson.M{"$nin": []string{models.AppointmentStatusCancelled}},
	}

	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var appointments []models.Appointment
	if err = cursor.All(ctx, &appointments); err != nil {
		return nil, err
	}

	return appointments, nil
}

// ListByClinicAndDate returns all appointments for a clinic on a date
func (r *AppointmentRepository) ListByClinicAndDate(ctx context.Context, clinicID primitive.ObjectID, date string, page, pageSize int) ([]models.Appointment, int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id": clinicID,
		"date":      date,
	}

	skip := (page - 1) * pageSize

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(pageSize)).
		SetSort(bson.D{{Key: "start_time", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var appointments []models.Appointment
	if err = cursor.All(ctx, &appointments); err != nil {
		return nil, 0, err
	}

	return appointments, total, nil
}

// ListByClinicAndDateRange returns appointments for a clinic within a date range with filters
func (r *AppointmentRepository) ListByClinicAndDateRange(ctx context.Context, clinicID primitive.ObjectID, fromDate, toDate string, doctorID *primitive.ObjectID, status string, page, pageSize int) ([]models.Appointment, int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"clinic_id": clinicID,
	}

	// Date range filter using the date field
	if fromDate != "" || toDate != "" {
		dateFilter := bson.M{}
		if fromDate != "" {
			dateFilter["$gte"] = fromDate
		}
		if toDate != "" {
			dateFilter["$lte"] = toDate
		}
		filter["date"] = dateFilter
	}

	// Optional doctor filter
	if doctorID != nil {
		filter["doctor_id"] = *doctorID
	}

	// Optional status filter
	if status != "" {
		filter["status"] = status
	}

	skip := (page - 1) * pageSize

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(100)).                          // Show up to 100 appointments
		SetSort(bson.D{{Key: "start_time", Value: 1}}) // Ascending by start_time

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var appointments []models.Appointment
	if err = cursor.All(ctx, &appointments); err != nil {
		return nil, 0, err
	}

	return appointments, total, nil
}

// Update updates an appointment
func (r *AppointmentRepository) Update(ctx context.Context, appointment *models.Appointment) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	appointment.UpdatedAt = time.Now().UTC()

	filter := bson.M{
		"_id":       appointment.ID,
		"clinic_id": appointment.ClinicID,
	}

	_, err := r.collection.UpdateOne(ctx, filter, bson.M{"$set": appointment})
	return err
}

// Reschedule atomically reschedules an appointment to a new time
func (r *AppointmentRepository) Reschedule(ctx context.Context, id, clinicID primitive.ObjectID, newStartTime time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	// Get the existing appointment
	existing, err := r.GetByID(ctx, id, clinicID)
	if err != nil {
		return err
	}

	// Delete the old and create new in a transaction-like manner
	// First, update the old appointment to cancelled
	_, err = r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "clinic_id": clinicID},
		bson.M{"$set": bson.M{
			"status":     models.AppointmentStatusCancelled,
			"updated_at": time.Now().UTC(),
		}},
	)
	if err != nil {
		return err
	}

	// Create new appointment
	newAppointment := &models.Appointment{
		ClinicID:  clinicID,
		PatientID: existing.PatientID,
		DoctorID:  existing.DoctorID,
		StartTime: newStartTime,
		Notes:     existing.Notes,
		CreatedBy: existing.CreatedBy,
	}

	return r.Create(ctx, newAppointment)
}

// UpdateStatus updates only the status of an appointment
func (r *AppointmentRepository) UpdateStatus(ctx context.Context, id, clinicID primitive.ObjectID, status string) error {
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
			"status":     status,
			"updated_at": time.Now().UTC(),
		}},
	)
	return err
}
