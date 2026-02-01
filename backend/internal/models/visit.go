package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VisitStatus constants
const (
	VisitStatusStarted   = "started"
	VisitStatusCompleted = "completed"
)

// PaymentType constants
const (
	PaymentTypeCash = "cash"
	PaymentTypeCard = "card"
)

// ValidPaymentTypes returns valid payment types
func ValidPaymentTypes() []string {
	return []string{PaymentTypeCash, PaymentTypeCard}
}

// VisitService represents a service performed during a visit
type VisitService struct {
	ServiceID   primitive.ObjectID `bson:"service_id" json:"service_id"`
	ServiceName string             `bson:"service_name" json:"service_name"`
	Price       float64            `bson:"price" json:"price"`
	Quantity    int                `bson:"quantity" json:"quantity"`
	Subtotal    float64            `bson:"subtotal" json:"subtotal"` // Price * Quantity
}

// VisitPlanStep represents a simple step in visit draft treatment plan
type VisitPlanStep struct {
	Description string `bson:"description" json:"description"`
	Completed   bool   `bson:"completed" json:"completed"`
}

// Visit represents a patient visit/consultation
type Visit struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	ClinicID       primitive.ObjectID  `bson:"clinic_id" json:"clinic_id"`
	AppointmentID  *primitive.ObjectID `bson:"appointment_id,omitempty" json:"appointment_id,omitempty"`
	PatientID      primitive.ObjectID  `bson:"patient_id" json:"patient_id"`
	DoctorID       primitive.ObjectID  `bson:"doctor_id" json:"doctor_id"`
	Date           string              `bson:"date" json:"date"` // YYYY-MM-DD format
	Status         string              `bson:"status" json:"status"`
	Diagnosis      string              `bson:"diagnosis,omitempty" json:"diagnosis,omitempty"`
	Notes          string              `bson:"notes,omitempty" json:"notes,omitempty"`
	Comment        string              `bson:"comment,omitempty" json:"comment,omitempty"`
	AffectedTeeth  []string            `bson:"affected_teeth,omitempty" json:"affected_teeth,omitempty"`
	PlanSteps      []VisitPlanStep     `bson:"plan_steps,omitempty" json:"plan_steps,omitempty"`
	XRayImages     []string            `bson:"xray_images,omitempty" json:"xray_images,omitempty"`
	Services       []VisitService      `bson:"services" json:"services"`
	Subtotal       float64             `bson:"subtotal" json:"subtotal"`                               // Sum of all services
	DiscountType   string              `bson:"discount_type,omitempty" json:"discount_type,omitempty"` // "percentage" or "fixed"
	DiscountValue  float64             `bson:"discount_value" json:"discount_value"`
	DiscountAmount float64             `bson:"discount_amount" json:"discount_amount"`               // Calculated discount
	Total          float64             `bson:"total" json:"total"`                                   // Subtotal - DiscountAmount
	DoctorShare    float64             `bson:"doctor_share" json:"doctor_share"`                     // Percentage of total
	DoctorEarning  float64             `bson:"doctor_earning" json:"doctor_earning"`                 // Calculated earning
	PaymentType    string              `bson:"payment_type,omitempty" json:"payment_type,omitempty"` // "cash" or "card"
	CreatedAt      time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time           `bson:"updated_at" json:"updated_at"`
	CompletedAt    *time.Time          `bson:"completed_at,omitempty" json:"completed_at,omitempty"`
}

// StartVisitDTO is the input for starting a visit
type StartVisitDTO struct {
	AppointmentID string `json:"appointment_id,omitempty"`
	PatientID     string `json:"patient_id" binding:"required"`
}

// AddVisitServiceDTO is the input for adding a service to a visit
type AddVisitServiceDTO struct {
	ServiceID string `json:"service_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,gte=1"`
}

// CompleteVisitDTO is the input for completing a visit
type CompleteVisitDTO struct {
	Diagnosis     string               `json:"diagnosis,omitempty"`
	Notes         string               `json:"notes,omitempty"`
	Services      []AddVisitServiceDTO `json:"services" binding:"required,dive"`
	DiscountType  string               `json:"discount_type,omitempty" binding:"omitempty,oneof=percentage fixed"`
	DiscountValue float64              `json:"discount_value,omitempty" binding:"omitempty,gte=0"`
	PaymentType   string               `json:"payment_type" binding:"required,oneof=cash card"`
	AffectedTeeth []string             `json:"affected_teeth,omitempty"`
	XRayImages    []string             `json:"xray_images,omitempty"`
	// DoctorShare is now determined by the active doctor contract, not submitted by the doctor
}

// SaveVisitDraftDTO is the input for saving visit draft/progress
type SaveVisitDraftDTO struct {
	Diagnosis     string               `json:"diagnosis,omitempty"`
	Services      []AddVisitServiceDTO `json:"services,omitempty"`
	DiscountType  string               `json:"discount_type,omitempty" binding:"omitempty,oneof=percentage fixed"`
	DiscountValue float64              `json:"discount_value,omitempty" binding:"omitempty,gte=0"`
	PaymentType   string               `json:"payment_type,omitempty" binding:"omitempty,oneof=cash card"`
	AffectedTeeth []string             `json:"affected_teeth,omitempty"`
	PlanSteps     []VisitPlanStep      `json:"plan_steps,omitempty"`
	Comment       string               `json:"comment,omitempty"`
	XRayImages    []string             `json:"xray_images,omitempty"`
}

// VisitResponse is the API response for a visit
type VisitResponse struct {
	ID             string          `json:"id"`
	AppointmentID  string          `json:"appointment_id,omitempty"`
	PatientID      string          `json:"patient_id"`
	PatientName    string          `json:"patient_name,omitempty"`
	DoctorID       string          `json:"doctor_id"`
	DoctorName     string          `json:"doctor_name,omitempty"`
	Date           string          `json:"date"`
	Status         string          `json:"status"`
	Diagnosis      string          `json:"diagnosis,omitempty"`
	Notes          string          `json:"notes,omitempty"`
	Comment        string          `json:"comment,omitempty"`
	AffectedTeeth  []string        `json:"affected_teeth,omitempty"`
	PlanSteps      []VisitPlanStep `json:"plan_steps,omitempty"`
	XRayImages     []string        `json:"xray_images,omitempty"`
	Services       []VisitService  `json:"services"`
	Subtotal       float64         `json:"subtotal"`
	DiscountType   string          `json:"discount_type,omitempty"`
	DiscountValue  float64         `json:"discount_value"`
	DiscountAmount float64         `json:"discount_amount"`
	Total          float64         `json:"total"`
	TotalAmount    float64         `json:"total_amount"`
	DoctorShare    float64         `json:"doctor_share"`
	DoctorEarning  float64         `json:"doctor_earning"`
	PaymentType    string          `json:"payment_type,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	CompletedAt    *time.Time      `json:"completed_at,omitempty"`
}

// ToResponse converts Visit to VisitResponse
func (v *Visit) ToResponse() VisitResponse {
	resp := VisitResponse{
		ID:             v.ID.Hex(),
		PatientID:      v.PatientID.Hex(),
		DoctorID:       v.DoctorID.Hex(),
		Date:           v.Date,
		Status:         v.Status,
		Diagnosis:      v.Diagnosis,
		Notes:          v.Notes,
		Comment:        v.Comment,
		AffectedTeeth:  v.AffectedTeeth,
		PlanSteps:      v.PlanSteps,
		XRayImages:     v.XRayImages,
		Services:       v.Services,
		Subtotal:       v.Subtotal,
		DiscountType:   v.DiscountType,
		DiscountValue:  v.DiscountValue,
		DiscountAmount: v.DiscountAmount,
		Total:          v.Total,
		TotalAmount:    v.Total,
		DoctorShare:    v.DoctorShare,
		DoctorEarning:  v.DoctorEarning,
		PaymentType:    v.PaymentType,
		CreatedAt:      v.CreatedAt,
		CompletedAt:    v.CompletedAt,
	}
	if v.AppointmentID != nil {
		resp.AppointmentID = v.AppointmentID.Hex()
	}
	return resp
}

// CalculateTotal calculates the visit totals
func (v *Visit) CalculateTotal() {
	v.Subtotal = 0
	for i := range v.Services {
		v.Services[i].Subtotal = v.Services[i].Price * float64(v.Services[i].Quantity)
		v.Subtotal += v.Services[i].Subtotal
	}

	// Calculate discount
	switch v.DiscountType {
	case "percentage":
		v.DiscountAmount = v.Subtotal * (v.DiscountValue / 100)
	case "fixed":
		v.DiscountAmount = v.DiscountValue
	default:
		v.DiscountAmount = 0
	}

	// Ensure discount doesn't exceed subtotal
	if v.DiscountAmount > v.Subtotal {
		v.DiscountAmount = v.Subtotal
	}

	v.Total = v.Subtotal - v.DiscountAmount
	if v.Total < 0 {
		v.Total = 0
	}

	// Calculate doctor earning
	v.DoctorEarning = v.Total * (v.DoctorShare / 100)
}
