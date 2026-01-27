package repository

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"medical-crm/internal/models"
)

type InvitationRepository struct {
	collection *mongo.Collection
	timeout    time.Duration
}

func NewInvitationRepository(db *mongo.Database, timeout time.Duration) *InvitationRepository {
	return &InvitationRepository{
		collection: db.Collection("invitations"),
		timeout:    timeout,
	}
}

func (r *InvitationRepository) Create(ctx context.Context, invitation *models.Invitation) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	invitation.CreatedAt = time.Now().UTC()

	result, err := r.collection.InsertOne(ctx, invitation)
	if err != nil {
		return err
	}

	invitation.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *InvitationRepository) GetByToken(ctx context.Context, token string) (*models.Invitation, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	var invitation models.Invitation
	err := r.collection.FindOne(ctx, bson.M{"token": token}).Decode(&invitation)
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

func (r *InvitationRepository) MarkUsed(ctx context.Context, id primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	now := time.Now().UTC()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"used_at": now}},
	)
	return err
}

func (r *InvitationRepository) GetUnusedByEmail(ctx context.Context, email string, clinicID primitive.ObjectID) (*models.Invitation, error) {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	filter := bson.M{
		"email":     email,
		"clinic_id": clinicID,
		"used_at":   nil,
		"expires_at": bson.M{"$gt": time.Now().UTC()},
	}

	var invitation models.Invitation
	err := r.collection.FindOne(ctx, filter).Decode(&invitation)
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}
