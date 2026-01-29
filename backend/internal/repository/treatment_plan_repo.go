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

type TreatmentPlanRepository struct {
	collection *mongo.Collection
}

func NewTreatmentPlanRepository(db *mongo.Database) *TreatmentPlanRepository {
	return &TreatmentPlanRepository{
		collection: db.Collection("treatment_plans"),
	}
}

// Create creates a new treatment plan
func (r *TreatmentPlanRepository) Create(ctx context.Context, plan *models.TreatmentPlan) error {
	plan.CreatedAt = time.Now().UTC()
	plan.UpdatedAt = time.Now().UTC()
	result, err := r.collection.InsertOne(ctx, plan)
	if err != nil {
		return err
	}
	plan.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// GetByID gets a treatment plan by ID
func (r *TreatmentPlanRepository) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.TreatmentPlan, error) {
	var plan models.TreatmentPlan
	filter := bson.M{"_id": id, "clinic_id": clinicID}
	err := r.collection.FindOne(ctx, filter).Decode(&plan)
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

// ListByPatient lists all treatment plans for a patient
func (r *TreatmentPlanRepository) ListByPatient(ctx context.Context, patientID, clinicID primitive.ObjectID) ([]models.TreatmentPlan, error) {
	filter := bson.M{
		"patient_id": patientID,
		"clinic_id":  clinicID,
	}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var plans []models.TreatmentPlan
	if err = cursor.All(ctx, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

// ListByDoctor lists all treatment plans created by a doctor
func (r *TreatmentPlanRepository) ListByDoctor(ctx context.Context, doctorID, clinicID primitive.ObjectID, status string) ([]models.TreatmentPlan, error) {
	filter := bson.M{
		"doctor_id": doctorID,
		"clinic_id": clinicID,
	}
	if status != "" {
		filter["status"] = status
	}
	opts := options.Find().SetSort(bson.D{{Key: "updated_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var plans []models.TreatmentPlan
	if err = cursor.All(ctx, &plans); err != nil {
		return nil, err
	}
	return plans, nil
}

// Update updates a treatment plan
func (r *TreatmentPlanRepository) Update(ctx context.Context, plan *models.TreatmentPlan) error {
	plan.UpdatedAt = time.Now().UTC()
	filter := bson.M{"_id": plan.ID, "clinic_id": plan.ClinicID}
	update := bson.M{
		"$set": bson.M{
			"title":      plan.Title,
			"steps":      plan.Steps,
			"status":     plan.Status,
			"updated_at": plan.UpdatedAt,
		},
	}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// UpdateStepStatus updates the status of a specific step
func (r *TreatmentPlanRepository) UpdateStepStatus(ctx context.Context, planID, clinicID primitive.ObjectID, stepNumber int, status string, visitID *primitive.ObjectID, notes string) error {
	filter := bson.M{
		"_id":               planID,
		"clinic_id":         clinicID,
		"steps.step_number": stepNumber,
	}

	updateFields := bson.M{
		"steps.$.status": status,
		"steps.$.notes":  notes,
		"updated_at":     time.Now().UTC(),
	}

	if status == models.PlanStepStatusCompleted {
		now := time.Now().UTC()
		updateFields["steps.$.completed_at"] = now
	}

	if visitID != nil {
		updateFields["steps.$.visit_id"] = visitID
	}

	update := bson.M{"$set": updateFields}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// Delete deletes a treatment plan
func (r *TreatmentPlanRepository) Delete(ctx context.Context, id, clinicID primitive.ObjectID) error {
	filter := bson.M{"_id": id, "clinic_id": clinicID}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}
