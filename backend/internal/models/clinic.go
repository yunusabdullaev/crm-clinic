package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Clinic represents a medical clinic (tenant)
type Clinic struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Timezone  string             `bson:"timezone" json:"timezone"` // e.g., "America/New_York"
	Address   string             `bson:"address,omitempty" json:"address,omitempty"`
	Phone     string             `bson:"phone,omitempty" json:"phone,omitempty"`
	IsActive  bool               `bson:"is_active" json:"is_active"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// CreateClinicDTO is the input for creating a clinic
type CreateClinicDTO struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Timezone string `json:"timezone" binding:"required"`
	Address  string `json:"address,omitempty"`
	Phone    string `json:"phone,omitempty"`
}

// ClinicResponse is the API response for a clinic
type ClinicResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Timezone  string    `json:"timezone"`
	Address   string    `json:"address,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// ToResponse converts Clinic to ClinicResponse
func (c *Clinic) ToResponse() ClinicResponse {
	return ClinicResponse{
		ID:        c.ID.Hex(),
		Name:      c.Name,
		Timezone:  c.Timezone,
		Address:   c.Address,
		Phone:     c.Phone,
		IsActive:  c.IsActive,
		CreatedAt: c.CreatedAt,
	}
}
