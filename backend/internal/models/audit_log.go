package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuditAction represents the type of action being logged
type AuditAction string

const (
	AuditActionAppointmentStatusChanged AuditAction = "APPOINTMENT_STATUS_CHANGED"
	AuditActionVisitStarted             AuditAction = "VISIT_STARTED"
	AuditActionVisitFinished            AuditAction = "VISIT_FINISHED"
)

// AuditLog records doctor activities for tracking and compliance
type AuditLog struct {
	ID         primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	ClinicID   primitive.ObjectID     `bson:"clinic_id" json:"clinic_id"`
	ActorID    primitive.ObjectID     `bson:"actor_user_id" json:"actor_user_id"`
	Action     AuditAction            `bson:"action" json:"action"`
	EntityType string                 `bson:"entity_type" json:"entity_type"` // appointment, visit
	EntityID   primitive.ObjectID     `bson:"entity_id" json:"entity_id"`
	Meta       map[string]interface{} `bson:"meta,omitempty" json:"meta,omitempty"`
	RequestID  string                 `bson:"request_id" json:"request_id"`
	CreatedAt  time.Time              `bson:"created_at" json:"created_at"`
}

// AuditLogResponse is the API response for an audit log entry
type AuditLogResponse struct {
	ID         string                 `json:"id"`
	ClinicID   string                 `json:"clinic_id"`
	ActorID    string                 `json:"actor_user_id"`
	ActorName  string                 `json:"actor_name,omitempty"` // Populated when joined
	Action     string                 `json:"action"`
	EntityType string                 `json:"entity_type"`
	EntityID   string                 `json:"entity_id"`
	Meta       map[string]interface{} `json:"meta,omitempty"`
	RequestID  string                 `json:"request_id"`
	CreatedAt  string                 `json:"created_at"`
}

// ToResponse converts an AuditLog to its response format
func (a *AuditLog) ToResponse() AuditLogResponse {
	return AuditLogResponse{
		ID:         a.ID.Hex(),
		ClinicID:   a.ClinicID.Hex(),
		ActorID:    a.ActorID.Hex(),
		Action:     string(a.Action),
		EntityType: a.EntityType,
		EntityID:   a.EntityID.Hex(),
		Meta:       a.Meta,
		RequestID:  a.RequestID,
		CreatedAt:  a.CreatedAt.Format(time.RFC3339),
	}
}
