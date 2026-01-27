package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// StaffSalary represents a staff member's monthly salary
type StaffSalary struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID      primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	UserID        primitive.ObjectID `bson:"user_id" json:"user_id"`
	MonthlyAmount float64            `bson:"monthly_amount" json:"monthly_amount"`
	EffectiveFrom string             `bson:"effective_from" json:"effective_from"` // YYYY-MM-DD
	IsActive      bool               `bson:"is_active" json:"is_active"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy     primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// CreateStaffSalaryDTO is the input for creating a staff salary
type CreateStaffSalaryDTO struct {
	UserID        string  `json:"user_id" binding:"required"`
	MonthlyAmount float64 `json:"monthly_amount" binding:"required,gt=0"`
	EffectiveFrom string  `json:"effective_from" binding:"required"`
}

// UpdateStaffSalaryDTO is the input for updating a staff salary
type UpdateStaffSalaryDTO struct {
	MonthlyAmount *float64 `json:"monthly_amount" binding:"omitempty,gt=0"`
	IsActive      *bool    `json:"is_active"`
}

// StaffSalaryResponse is the API response for a staff salary
type StaffSalaryResponse struct {
	ID            string  `json:"id"`
	ClinicID      string  `json:"clinic_id"`
	UserID        string  `json:"user_id"`
	UserName      string  `json:"user_name,omitempty"` // Populated when joined
	MonthlyAmount float64 `json:"monthly_amount"`
	EffectiveFrom string  `json:"effective_from"`
	IsActive      bool    `json:"is_active"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

// ToResponse converts a StaffSalary to its response format
func (s *StaffSalary) ToResponse() StaffSalaryResponse {
	return StaffSalaryResponse{
		ID:            s.ID.Hex(),
		ClinicID:      s.ClinicID.Hex(),
		UserID:        s.UserID.Hex(),
		MonthlyAmount: s.MonthlyAmount,
		EffectiveFrom: s.EffectiveFrom,
		IsActive:      s.IsActive,
		CreatedAt:     s.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     s.UpdatedAt.Format(time.RFC3339),
	}
}
