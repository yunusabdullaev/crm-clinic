package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Service represents a medical service offered by the clinic
type Service struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID    primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Price       float64            `bson:"price" json:"price"` // In clinic's currency
	Duration    int                `bson:"duration" json:"duration"` // In minutes
	IsActive    bool               `bson:"is_active" json:"is_active"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy   primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// CreateServiceDTO is the input for creating a service
type CreateServiceDTO struct {
	Name        string  `json:"name" binding:"required,min=1,max=100"`
	Description string  `json:"description,omitempty" binding:"max=500"`
	Price       float64 `json:"price" binding:"required,gte=0"`
	Duration    int     `json:"duration,omitempty" binding:"omitempty,gte=5,lte=480"` // 5 min to 8 hours
}

// UpdateServiceDTO is the input for updating a service
type UpdateServiceDTO struct {
	Name        string   `json:"name,omitempty" binding:"omitempty,min=1,max=100"`
	Description string   `json:"description,omitempty" binding:"max=500"`
	Price       *float64 `json:"price,omitempty" binding:"omitempty,gte=0"`
	Duration    *int     `json:"duration,omitempty" binding:"omitempty,gte=5,lte=480"`
	IsActive    *bool    `json:"is_active,omitempty"`
}

// ServiceResponse is the API response for a service
type ServiceResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Price       float64   `json:"price"`
	Duration    int       `json:"duration"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// ToResponse converts Service to ServiceResponse
func (s *Service) ToResponse() ServiceResponse {
	return ServiceResponse{
		ID:          s.ID.Hex(),
		Name:        s.Name,
		Description: s.Description,
		Price:       s.Price,
		Duration:    s.Duration,
		IsActive:    s.IsActive,
		CreatedAt:   s.CreatedAt,
	}
}
