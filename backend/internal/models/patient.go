package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Patient represents a patient record
type Patient struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID  primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	FirstName string             `bson:"first_name" json:"first_name"`
	LastName  string             `bson:"last_name" json:"last_name"`
	Phone     string             `bson:"phone" json:"phone"`
	DOB       *time.Time         `bson:"dob,omitempty" json:"dob,omitempty"`
	Gender    string             `bson:"gender,omitempty" json:"gender,omitempty"` // male, female, other
	Address   string             `bson:"address,omitempty" json:"address,omitempty"`
	Notes     string             `bson:"notes,omitempty" json:"notes,omitempty"`
	IsActive  bool               `bson:"is_active" json:"is_active"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// CreatePatientDTO is the input for creating a patient
type CreatePatientDTO struct {
	FirstName string     `json:"first_name" binding:"required,min=1,max=50"`
	LastName  string     `json:"last_name" binding:"required,min=1,max=50"`
	Phone     string     `json:"phone" binding:"required,min=5,max=20"`
	DOB       *time.Time `json:"dob,omitempty"`
	Gender    string     `json:"gender,omitempty" binding:"omitempty,oneof=male female other"`
	Address   string     `json:"address,omitempty"`
	Notes     string     `json:"notes,omitempty"`
}

// UpdatePatientDTO is the input for updating a patient
type UpdatePatientDTO struct {
	FirstName string     `json:"first_name,omitempty" binding:"omitempty,min=1,max=50"`
	LastName  string     `json:"last_name,omitempty" binding:"omitempty,min=1,max=50"`
	Phone     string     `json:"phone,omitempty" binding:"omitempty,min=5,max=20"`
	DOB       *time.Time `json:"dob,omitempty"`
	Gender    string     `json:"gender,omitempty" binding:"omitempty,oneof=male female other"`
	Address   string     `json:"address,omitempty"`
	Notes     string     `json:"notes,omitempty"`
}

// PatientResponse is the API response for a patient
type PatientResponse struct {
	ID        string     `json:"id"`
	FirstName string     `json:"first_name"`
	LastName  string     `json:"last_name"`
	FullName  string     `json:"full_name"`
	Phone     string     `json:"phone"`
	DOB       *time.Time `json:"dob,omitempty"`
	Gender    string     `json:"gender,omitempty"`
	Address   string     `json:"address,omitempty"`
	Notes     string     `json:"notes,omitempty"`
	IsActive  bool       `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
}

// ToResponse converts Patient to PatientResponse
func (p *Patient) ToResponse() PatientResponse {
	return PatientResponse{
		ID:        p.ID.Hex(),
		FirstName: p.FirstName,
		LastName:  p.LastName,
		FullName:  p.FirstName + " " + p.LastName,
		Phone:     p.Phone,
		DOB:       p.DOB,
		Gender:    p.Gender,
		Address:   p.Address,
		Notes:     p.Notes,
		IsActive:  p.IsActive,
		CreatedAt: p.CreatedAt,
	}
}

// PaginatedPatientsResponse is the paginated list of patients
type PaginatedPatientsResponse struct {
	Patients   []PatientResponse `json:"patients"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
	TotalPages int               `json:"total_pages"`
}
