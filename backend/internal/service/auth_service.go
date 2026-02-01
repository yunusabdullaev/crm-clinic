package service

import (
	"context"
	"time"

	"medical-crm/internal/middleware"
	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo      *repository.UserRepository
	accessSecret  string
	refreshSecret string
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewAuthService(
	userRepo *repository.UserRepository,
	accessSecret, refreshSecret string,
	accessTTL, refreshTTL time.Duration,
) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		accessSecret:  accessSecret,
		refreshSecret: refreshSecret,
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

// Login authenticates a user and returns tokens
func (s *AuthService) Login(ctx context.Context, dto models.LoginDTO) (*models.AuthResponse, error) {
	user, err := s.userRepo.GetByPhone(ctx, dto.Phone)
	if err != nil {
		return nil, apperrors.InvalidCredentials()
	}

	if !user.IsActive {
		return nil, apperrors.Forbidden("Account is deactivated")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(dto.Password)); err != nil {
		return nil, apperrors.InvalidCredentials()
	}

	return s.generateTokens(user)
}

// RefreshToken generates new tokens using a refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	claims := &middleware.JWTClaims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.refreshSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, apperrors.TokenInvalid()
	}

	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return nil, apperrors.TokenInvalid()
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.TokenInvalid()
	}

	if !user.IsActive {
		return nil, apperrors.Forbidden("Account is deactivated")
	}

	return s.generateTokens(user)
}

// HashPassword hashes a password
func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", apperrors.InternalWithErr("Failed to hash password", err)
	}
	return string(hash), nil
}

// generateTokens creates access and refresh tokens
func (s *AuthService) generateTokens(user *models.User) (*models.AuthResponse, error) {
	now := time.Now()

	// Access token claims
	accessClaims := middleware.JWTClaims{
		UserID: user.ID.Hex(),
		Email:  user.Phone,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	if user.ClinicID != nil {
		accessClaims.ClinicID = user.ClinicID.Hex()
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.accessSecret))
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to generate access token", err)
	}

	// Refresh token claims
	refreshClaims := middleware.JWTClaims{
		UserID: user.ID.Hex(),
		Email:  user.Phone,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	if user.ClinicID != nil {
		refreshClaims.ClinicID = user.ClinicID.Hex()
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(s.refreshSecret))
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to generate refresh token", err)
	}

	return &models.AuthResponse{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(s.accessTTL.Seconds()),
		User:         user.ToResponse(),
	}, nil
}
