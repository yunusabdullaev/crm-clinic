package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PlanStepStatus constants
const (
	PlanStepStatusPending   = "pending"
	PlanStepStatusCompleted = "completed"
)

// TreatmentPlanStatus constants
const (
	TreatmentPlanStatusPending    = "pending"
	TreatmentPlanStatusInProgress = "in_progress"
	TreatmentPlanStatusCompleted  = "completed"
)

// PlanStep represents a single step in a treatment plan
type PlanStep struct {
	StepNumber  int                 `bson:"step_number" json:"step_number"`
	Description string              `bson:"description" json:"description"`
	Status      string              `bson:"status" json:"status"` // pending, completed
	VisitID     *primitive.ObjectID `bson:"visit_id,omitempty" json:"visit_id,omitempty"`
	CompletedAt *time.Time          `bson:"completed_at,omitempty" json:"completed_at,omitempty"`
	Notes       string              `bson:"notes,omitempty" json:"notes,omitempty"`
}

// TreatmentPlan represents a multi-step treatment plan for a patient
type TreatmentPlan struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID  primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	PatientID primitive.ObjectID `bson:"patient_id" json:"patient_id"`
	DoctorID  primitive.ObjectID `bson:"doctor_id" json:"doctor_id"`
	Title     string             `bson:"title" json:"title"`
	Steps     []PlanStep         `bson:"steps" json:"steps"`
	Status    string             `bson:"status" json:"status"` // pending, in_progress, completed
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// CreateTreatmentPlanDTO is the input for creating a treatment plan
type CreateTreatmentPlanDTO struct {
	PatientID string              `json:"patient_id" binding:"required"`
	Title     string              `json:"title" binding:"required,min=1,max=200"`
	Steps     []CreatePlanStepDTO `json:"steps" binding:"required,min=1,dive"`
}

// CreatePlanStepDTO is the input for creating a plan step
type CreatePlanStepDTO struct {
	Description string `json:"description" binding:"required,min=1,max=500"`
}

// UpdatePlanStepDTO is the input for updating a plan step
type UpdatePlanStepDTO struct {
	Status  string `json:"status" binding:"required,oneof=pending completed"`
	VisitID string `json:"visit_id,omitempty"`
	Notes   string `json:"notes,omitempty"`
}

// TreatmentPlanResponse is the API response for a treatment plan
type TreatmentPlanResponse struct {
	ID          string             `json:"id"`
	PatientID   string             `json:"patient_id"`
	PatientName string             `json:"patient_name,omitempty"`
	DoctorID    string             `json:"doctor_id"`
	DoctorName  string             `json:"doctor_name,omitempty"`
	Title       string             `json:"title"`
	Steps       []PlanStepResponse `json:"steps"`
	Status      string             `json:"status"`
	Progress    string             `json:"progress"` // e.g., "2/3"
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// PlanStepResponse is the API response for a plan step
type PlanStepResponse struct {
	StepNumber  int        `json:"step_number"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	VisitID     string     `json:"visit_id,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Notes       string     `json:"notes,omitempty"`
}

// ToResponse converts TreatmentPlan to TreatmentPlanResponse
func (tp *TreatmentPlan) ToResponse() TreatmentPlanResponse {
	steps := make([]PlanStepResponse, len(tp.Steps))
	completedCount := 0
	for i, step := range tp.Steps {
		steps[i] = PlanStepResponse{
			StepNumber:  step.StepNumber,
			Description: step.Description,
			Status:      step.Status,
			CompletedAt: step.CompletedAt,
			Notes:       step.Notes,
		}
		if step.VisitID != nil {
			steps[i].VisitID = step.VisitID.Hex()
		}
		if step.Status == PlanStepStatusCompleted {
			completedCount++
		}
	}

	return TreatmentPlanResponse{
		ID:        tp.ID.Hex(),
		PatientID: tp.PatientID.Hex(),
		DoctorID:  tp.DoctorID.Hex(),
		Title:     tp.Title,
		Steps:     steps,
		Status:    tp.Status,
		Progress:  fmt.Sprintf("%d/%d", completedCount, len(tp.Steps)),
		CreatedAt: tp.CreatedAt,
		UpdatedAt: tp.UpdatedAt,
	}
}
