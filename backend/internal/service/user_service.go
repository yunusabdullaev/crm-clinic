package service

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"
)

type UserService struct {
	userRepo       *repository.UserRepository
	invitationRepo *repository.InvitationRepository
	authService    *AuthService
}

func NewUserService(
	userRepo *repository.UserRepository,
	invitationRepo *repository.InvitationRepository,
	authService *AuthService,
) *UserService {
	return &UserService{
		userRepo:       userRepo,
		invitationRepo: invitationRepo,
		authService:    authService,
	}
}

// AcceptInvite accepts an invitation and creates a user account
func (s *UserService) AcceptInvite(ctx context.Context, dto models.AcceptInviteDTO) (*models.AuthResponse, error) {
	// Get invitation by token
	invitation, err := s.invitationRepo.GetByToken(ctx, dto.Token)
	if err != nil {
		return nil, apperrors.NotFound("Invitation")
	}

	// Check if invitation is expired
	if invitation.IsExpired() {
		return nil, apperrors.InviteExpired()
	}

	// Check if invitation is already used
	if invitation.IsUsed() {
		return nil, apperrors.InviteUsed()
	}

	// Check if user already exists
	existingUser, _ := s.userRepo.GetByEmail(ctx, invitation.Email)
	if existingUser != nil {
		return nil, apperrors.Conflict("User with this email already exists")
	}

	// Hash password
	passwordHash, err := s.authService.HashPassword(dto.Password)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Email:        invitation.Email,
		PasswordHash: passwordHash,
		FirstName:    dto.FirstName,
		LastName:     dto.LastName,
		Role:         invitation.Role,
		ClinicID:     &invitation.ClinicID,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, apperrors.InternalWithErr("Failed to create user", err)
	}

	// Mark invitation as used
	if err := s.invitationRepo.MarkUsed(ctx, invitation.ID); err != nil {
		// Log error but don't fail the request
	}

	// Generate tokens
	return s.authService.generateTokens(user)
}

// CreateUser creates a new user (by Boss for Doctor/Receptionist)
func (s *UserService) CreateUser(ctx context.Context, dto models.CreateUserDTO, clinicID, creatorID primitive.ObjectID, creatorRole string) (*models.User, error) {
	// Validate role permissions
	if !models.CanCreateRole(creatorRole, dto.Role) {
		return nil, apperrors.Forbidden("You cannot create users with this role")
	}

	// Check if email already exists
	existingUser, _ := s.userRepo.GetByEmail(ctx, dto.Email)
	if existingUser != nil {
		return nil, apperrors.Conflict("User with this email already exists")
	}

	// Hash password
	passwordHash, err := s.authService.HashPassword(dto.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        dto.Email,
		PasswordHash: passwordHash,
		FirstName:    dto.FirstName,
		LastName:     dto.LastName,
		Role:         dto.Role,
		ClinicID:     &clinicID,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, apperrors.InternalWithErr("Failed to create user", err)
	}

	return user, nil
}

// GetByID retrieves a user by ID with clinic check
func (s *UserService) GetByID(ctx context.Context, id, clinicID primitive.ObjectID) (*models.User, error) {
	user, err := s.userRepo.GetByIDWithClinicCheck(ctx, id, clinicID)
	if err != nil {
		return nil, apperrors.NotFound("User")
	}
	return user, nil
}

// ListByClinic returns users for a clinic
func (s *UserService) ListByClinic(ctx context.Context, clinicID primitive.ObjectID, page, pageSize int) ([]models.User, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	return s.userRepo.ListByClinic(ctx, clinicID, page, pageSize)
}

// ListDoctors returns all doctors for a clinic
func (s *UserService) ListDoctors(ctx context.Context, clinicID primitive.ObjectID) ([]models.User, error) {
	return s.userRepo.ListByClinicAndRole(ctx, clinicID, models.RoleDoctor)
}

// DeactivateUser deactivates a user
func (s *UserService) DeactivateUser(ctx context.Context, id, clinicID primitive.ObjectID) error {
	user, err := s.userRepo.GetByIDWithClinicCheck(ctx, id, clinicID)
	if err != nil {
		return apperrors.NotFound("User")
	}

	user.IsActive = false
	user.UpdatedAt = time.Now().UTC()

	return s.userRepo.Update(ctx, user)
}

// CreateSuperadmin creates the initial superadmin user
func (s *UserService) CreateSuperadmin(ctx context.Context, email, password string) (*models.User, error) {
	// Check if superadmin already exists
	existing, _ := s.userRepo.GetSuperadmin(ctx)
	if existing != nil {
		return existing, nil // Return existing superadmin
	}

	passwordHash, err := s.authService.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        email,
		PasswordHash: passwordHash,
		FirstName:    "Super",
		LastName:     "Admin",
		Role:         models.RoleSuperadmin,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, apperrors.InternalWithErr("Failed to create superadmin", err)
	}

	return user, nil
}
