package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Expense represents a clinic expense (rent, utilities, supplies, etc.)
type Expense struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID  primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	Category  string             `bson:"category" json:"category"` // rent, utilities, supplies, marketing, other
	Amount    float64            `bson:"amount" json:"amount"`
	Date      string             `bson:"date" json:"date"` // YYYY-MM-DD
	Note      string             `bson:"note,omitempty" json:"note,omitempty"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// CreateExpenseDTO is the input for creating an expense
type CreateExpenseDTO struct {
	Category string  `json:"category" binding:"required,oneof=rent utilities supplies marketing salary other"`
	Amount   float64 `json:"amount" binding:"required,gt=0"`
	Date     string  `json:"date" binding:"required"`
	Note     string  `json:"note"`
}

// ExpenseResponse is the API response for an expense
type ExpenseResponse struct {
	ID        string  `json:"id"`
	ClinicID  string  `json:"clinic_id"`
	Category  string  `json:"category"`
	Amount    float64 `json:"amount"`
	Date      string  `json:"date"`
	Note      string  `json:"note,omitempty"`
	CreatedAt string  `json:"created_at"`
}

// ToResponse converts an Expense to its response format
func (e *Expense) ToResponse() ExpenseResponse {
	return ExpenseResponse{
		ID:        e.ID.Hex(),
		ClinicID:  e.ClinicID.Hex(),
		Category:  e.Category,
		Amount:    e.Amount,
		Date:      e.Date,
		Note:      e.Note,
		CreatedAt: e.CreatedAt.Format(time.RFC3339),
	}
}
