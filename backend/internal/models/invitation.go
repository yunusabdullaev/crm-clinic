package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Invitation represents an email invitation
type Invitation struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID  primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	Email     string             `bson:"email" json:"email"`
	Role      string             `bson:"role" json:"role"` // The role the user will have
	Token     string             `bson:"token" json:"token"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	UsedAt    *time.Time         `bson:"used_at,omitempty" json:"used_at,omitempty"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy primitive.ObjectID `bson:"created_by" json:"created_by"` // User who created the invite
}

// CreateInviteDTO is the input for creating an invitation
type CreateInviteDTO struct {
	Email string `json:"email" binding:"required,email"`
}

// InviteResponse is the API response for an invitation
type InviteResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Token     string    `json:"token,omitempty"` // Only included for copy-link fallback
	ExpiresAt time.Time `json:"expires_at"`
	InviteURL string    `json:"invite_url"`
}

// ToResponse converts Invitation to InviteResponse
func (i *Invitation) ToResponse(baseURL string) InviteResponse {
	return InviteResponse{
		ID:        i.ID.Hex(),
		Email:     i.Email,
		Role:      i.Role,
		Token:     i.Token,
		ExpiresAt: i.ExpiresAt,
		InviteURL: baseURL + "/invite/accept?token=" + i.Token,
	}
}

// IsExpired checks if the invitation has expired
func (i *Invitation) IsExpired() bool {
	return time.Now().UTC().After(i.ExpiresAt)
}

// IsUsed checks if the invitation has been used
func (i *Invitation) IsUsed() bool {
	return i.UsedAt != nil
}
