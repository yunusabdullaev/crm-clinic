package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Role constants
const (
	RoleSuperadmin  = "superadmin"
	RoleBoss        = "boss"
	RoleDoctor      = "doctor"
	RoleReceptionist = "receptionist"
)

// User represents a system user
type User struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Email        string              `bson:"email" json:"email"`
	PasswordHash string              `bson:"password_hash" json:"-"` // Never expose
	FirstName    string              `bson:"first_name" json:"first_name"`
	LastName     string              `bson:"last_name" json:"last_name"`
	Role         string              `bson:"role" json:"role"`
	ClinicID     *primitive.ObjectID `bson:"clinic_id,omitempty" json:"clinic_id,omitempty"` // nil for superadmin
	IsActive     bool                `bson:"is_active" json:"is_active"`
	CreatedAt    time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time           `bson:"updated_at" json:"updated_at"`
}

// CreateUserDTO is the input for creating a user (by Boss)
type CreateUserDTO struct {
	Email     string `json:"email" binding:"required,email"`
	FirstName string `json:"first_name" binding:"required,min=1,max=50"`
	LastName  string `json:"last_name" binding:"required,min=1,max=50"`
	Role      string `json:"role" binding:"required,oneof=doctor receptionist"`
	Password  string `json:"password" binding:"required,min=8"`
}

// LoginDTO is the input for login
type LoginDTO struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AcceptInviteDTO is the input for accepting an invitation
type AcceptInviteDTO struct {
	Token     string `json:"token" binding:"required"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required,min=1,max=50"`
	LastName  string `json:"last_name" binding:"required,min=1,max=50"`
}

// RefreshTokenDTO is the input for refreshing tokens
type RefreshTokenDTO struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// UserResponse is the API response for a user
type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Role      string    `json:"role"`
	ClinicID  string    `json:"clinic_id,omitempty"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() UserResponse {
	resp := UserResponse{
		ID:        u.ID.Hex(),
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Role:      u.Role,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
	}
	if u.ClinicID != nil {
		resp.ClinicID = u.ClinicID.Hex()
	}
	return resp
}

// AuthResponse is the response for successful authentication
type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	User         UserResponse `json:"user"`
}

// ValidRoles returns the list of valid roles
func ValidRoles() []string {
	return []string{RoleSuperadmin, RoleBoss, RoleDoctor, RoleReceptionist}
}

// IsValidRole checks if a role is valid
func IsValidRole(role string) bool {
	for _, r := range ValidRoles() {
		if r == role {
			return true
		}
	}
	return false
}

// CanCreateRole checks if a user with the given role can create users with targetRole
func CanCreateRole(userRole, targetRole string) bool {
	switch userRole {
	case RoleSuperadmin:
		return targetRole == RoleBoss
	case RoleBoss:
		return targetRole == RoleDoctor || targetRole == RoleReceptionist
	default:
		return false
	}
}
