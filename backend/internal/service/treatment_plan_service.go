package service

import (
	"context"

	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type TreatmentPlanService struct {
	planRepo    *repository.TreatmentPlanRepository
	patientRepo *repository.PatientRepository
}

func NewTreatmentPlanService(planRepo *repository.TreatmentPlanRepository, patientRepo *repository.PatientRepository) *TreatmentPlanService {
	return &TreatmentPlanService{
		planRepo:    planRepo,
		patientRepo: patientRepo,
	}
}

// CreatePlan creates a new treatment plan
func (s *TreatmentPlanService) CreatePlan(ctx context.Context, clinicID, doctorID primitive.ObjectID, dto models.CreateTreatmentPlanDTO) (*models.TreatmentPlan, error) {
	// Parse patient ID
	patientID, err := primitive.ObjectIDFromHex(dto.PatientID)
	if err != nil {
		return nil, apperrors.BadRequest("Invalid patient ID")
	}

	// Verify patient exists and belongs to clinic
	patient, err := s.patientRepo.GetByID(ctx, patientID, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("Patient not found")
		}
		return nil, err
	}
	if !patient.IsActive {
		return nil, apperrors.BadRequest("Patient is not active")
	}

	// Create steps
	steps := make([]models.PlanStep, len(dto.Steps))
	for i, stepDTO := range dto.Steps {
		steps[i] = models.PlanStep{
			StepNumber:  i + 1,
			Description: stepDTO.Description,
			Status:      models.PlanStepStatusPending,
		}
	}

	plan := &models.TreatmentPlan{
		ClinicID:  clinicID,
		PatientID: patientID,
		DoctorID:  doctorID,
		Title:     dto.Title,
		Steps:     steps,
		Status:    models.TreatmentPlanStatusPending,
	}

	if err := s.planRepo.Create(ctx, plan); err != nil {
		return nil, err
	}

	return plan, nil
}

// GetPlan gets a treatment plan by ID
func (s *TreatmentPlanService) GetPlan(ctx context.Context, planID, clinicID primitive.ObjectID) (*models.TreatmentPlan, error) {
	plan, err := s.planRepo.GetByID(ctx, planID, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, apperrors.NotFound("Treatment plan not found")
		}
		return nil, err
	}
	return plan, nil
}

// ListByPatient lists all treatment plans for a patient
func (s *TreatmentPlanService) ListByPatient(ctx context.Context, patientID, clinicID primitive.ObjectID) ([]models.TreatmentPlan, error) {
	return s.planRepo.ListByPatient(ctx, patientID, clinicID)
}

// ListByDoctor lists all treatment plans created by a doctor
func (s *TreatmentPlanService) ListByDoctor(ctx context.Context, doctorID, clinicID primitive.ObjectID, status string) ([]models.TreatmentPlan, error) {
	return s.planRepo.ListByDoctor(ctx, doctorID, clinicID, status)
}

// UpdateStepStatus updates the status of a specific step
func (s *TreatmentPlanService) UpdateStepStatus(ctx context.Context, planID, clinicID primitive.ObjectID, stepNumber int, dto models.UpdatePlanStepDTO) error {
	// Get the plan to verify it exists
	plan, err := s.planRepo.GetByID(ctx, planID, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return apperrors.NotFound("Treatment plan not found")
		}
		return err
	}

	// Validate step number
	if stepNumber < 1 || stepNumber > len(plan.Steps) {
		return apperrors.BadRequest("Invalid step number")
	}

	// Parse visit ID if provided
	var visitID *primitive.ObjectID
	if dto.VisitID != "" {
		vid, err := primitive.ObjectIDFromHex(dto.VisitID)
		if err != nil {
			return apperrors.BadRequest("Invalid visit ID")
		}
		visitID = &vid
	}

	// Update step status
	if err := s.planRepo.UpdateStepStatus(ctx, planID, clinicID, stepNumber, dto.Status, visitID, dto.Notes); err != nil {
		return err
	}

	// Update overall plan status
	plan, err = s.planRepo.GetByID(ctx, planID, clinicID)
	if err != nil {
		return err
	}

	newStatus := s.calculatePlanStatus(plan)
	if newStatus != plan.Status {
		plan.Status = newStatus
		if err := s.planRepo.Update(ctx, plan); err != nil {
			return err
		}
	}

	return nil
}

// calculatePlanStatus determines the overall plan status based on step statuses
func (s *TreatmentPlanService) calculatePlanStatus(plan *models.TreatmentPlan) string {
	completedCount := 0
	for _, step := range plan.Steps {
		if step.Status == models.PlanStepStatusCompleted {
			completedCount++
		}
	}

	if completedCount == 0 {
		return models.TreatmentPlanStatusPending
	} else if completedCount == len(plan.Steps) {
		return models.TreatmentPlanStatusCompleted
	}
	return models.TreatmentPlanStatusInProgress
}

// DeletePlan deletes a treatment plan
func (s *TreatmentPlanService) DeletePlan(ctx context.Context, planID, clinicID primitive.ObjectID) error {
	_, err := s.planRepo.GetByID(ctx, planID, clinicID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return apperrors.NotFound("Treatment plan not found")
		}
		return err
	}
	return s.planRepo.Delete(ctx, planID, clinicID)
}
