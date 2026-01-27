package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AppointmentStatus constants
const (
	AppointmentStatusScheduled = "scheduled"
	AppointmentStatusConfirmed = "confirmed"
	AppointmentStatusInProgress = "in_progress"
	AppointmentStatusCompleted = "completed"
	AppointmentStatusCancelled = "cancelled"
	AppointmentStatusNoShow    = "no_show"
)

// Appointment represents a scheduled appointment
type Appointment struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ClinicID  primitive.ObjectID `bson:"clinic_id" json:"clinic_id"`
	PatientID primitive.ObjectID `bson:"patient_id" json:"patient_id"`
	DoctorID  primitive.ObjectID `bson:"doctor_id" json:"doctor_id"`
	Date      string             `bson:"date" json:"date"`           // YYYY-MM-DD format for indexing
	StartTime time.Time          `bson:"start_time" json:"start_time"` // Full datetime in UTC
	EndTime   time.Time          `bson:"end_time" json:"end_time"`     // StartTime + 30 minutes
	Status    string             `bson:"status" json:"status"`
	Notes     string             `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// CreateAppointmentDTO is the input for creating an appointment
type CreateAppointmentDTO struct {
	PatientID string    `json:"patient_id" binding:"required"`
	DoctorID  string    `json:"doctor_id" binding:"required"`
	StartTime time.Time `json:"start_time" binding:"required"`
	Notes     string    `json:"notes,omitempty"`
}

// UpdateAppointmentDTO is the input for updating an appointment
type UpdateAppointmentDTO struct {
	Status    string    `json:"status,omitempty" binding:"omitempty,oneof=scheduled confirmed in_progress completed cancelled no_show"`
	StartTime *time.Time `json:"start_time,omitempty"`
	Notes     string    `json:"notes,omitempty"`
}

// RescheduleAppointmentDTO is the input for rescheduling
type RescheduleAppointmentDTO struct {
	StartTime time.Time `json:"start_time" binding:"required"`
}

// AppointmentResponse is the API response for an appointment
type AppointmentResponse struct {
	ID          string    `json:"id"`
	PatientID   string    `json:"patient_id"`
	PatientName string    `json:"patient_name,omitempty"`
	DoctorID    string    `json:"doctor_id"`
	DoctorName  string    `json:"doctor_name,omitempty"`
	Date        string    `json:"date"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Status      string    `json:"status"`
	Notes       string    `json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// ToResponse converts Appointment to AppointmentResponse
func (a *Appointment) ToResponse() AppointmentResponse {
	return AppointmentResponse{
		ID:        a.ID.Hex(),
		PatientID: a.PatientID.Hex(),
		DoctorID:  a.DoctorID.Hex(),
		Date:      a.Date,
		StartTime: a.StartTime,
		EndTime:   a.EndTime,
		Status:    a.Status,
		Notes:     a.Notes,
		CreatedAt: a.CreatedAt,
	}
}

// ValidAppointmentStatuses returns valid statuses
func ValidAppointmentStatuses() []string {
	return []string{
		AppointmentStatusScheduled,
		AppointmentStatusConfirmed,
		AppointmentStatusInProgress,
		AppointmentStatusCompleted,
		AppointmentStatusCancelled,
		AppointmentStatusNoShow,
	}
}

// SlotDuration is the fixed appointment duration (30 minutes)
const SlotDuration = 30 * time.Minute
