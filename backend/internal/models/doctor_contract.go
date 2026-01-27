package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DoctorContract represents a contract between a clinic and a doctor
// that defines the doctor's share percentage for visits
type DoctorContract struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID        primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	DoctorID        primitive.ObjectID `bson:"doctor_id" json:"doctor_id"`
	SharePercentage float64            `bson:"share_percentage" json:"share_percentage"`     // 0-100
	StartDate       string             `bson:"start_date" json:"start_date"`                 // YYYY-MM-DD
	EndDate         string             `bson:"end_date,omitempty" json:"end_date,omitempty"` // YYYY-MM-DD, empty = ongoing
	IsActive        bool               `bson:"is_active" json:"is_active"`
	Notes           string             `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy       primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// CreateDoctorContractDTO is the data transfer object for creating a contract
type CreateDoctorContractDTO struct {
	DoctorID        string  `json:"doctor_id" binding:"required"`
	SharePercentage float64 `json:"share_percentage" binding:"required,min=0,max=100"`
	StartDate       string  `json:"start_date" binding:"required"`
	EndDate         string  `json:"end_date"`
	Notes           string  `json:"notes"`
}

// UpdateDoctorContractDTO is the data transfer object for updating a contract
type UpdateDoctorContractDTO struct {
	SharePercentage *float64 `json:"share_percentage" binding:"omitempty,min=0,max=100"`
	EndDate         *string  `json:"end_date"`
	IsActive        *bool    `json:"is_active"`
	Notes           *string  `json:"notes"`
}

// DoctorContractResponse is the response format for doctor contracts
type DoctorContractResponse struct {
	ID              string  `json:"id"`
	ClinicID        string  `json:"clinic_id"`
	DoctorID        string  `json:"doctor_id"`
	DoctorName      string  `json:"doctor_name,omitempty"` // Populated when joined with user data
	SharePercentage float64 `json:"share_percentage"`
	StartDate       string  `json:"start_date"`
	EndDate         string  `json:"end_date,omitempty"`
	IsActive        bool    `json:"is_active"`
	Notes           string  `json:"notes,omitempty"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

// ToResponse converts a DoctorContract to its response format
func (dc *DoctorContract) ToResponse() DoctorContractResponse {
	return DoctorContractResponse{
		ID:              dc.ID.Hex(),
		ClinicID:        dc.ClinicID.Hex(),
		DoctorID:        dc.DoctorID.Hex(),
		SharePercentage: dc.SharePercentage,
		StartDate:       dc.StartDate,
		EndDate:         dc.EndDate,
		IsActive:        dc.IsActive,
		Notes:           dc.Notes,
		CreatedAt:       dc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       dc.UpdatedAt.Format(time.RFC3339),
	}
}
