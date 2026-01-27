package service

import (
	"context"
	"time"

	"medical-crm/internal/repository"
	apperrors "medical-crm/pkg/errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DailyReport represents daily statistics
type DailyReport struct {
	Date           string          `json:"date"`
	PatientsCount  int64           `json:"patients_count"`
	VisitsCount    int             `json:"visits_count"`
	TotalRevenue   float64         `json:"total_revenue"`
	TotalDiscount  float64         `json:"total_discount"`
	DoctorEarnings []DoctorEarning `json:"doctor_earnings"`
}

// MonthlyReport represents monthly statistics with financial summary
type MonthlyReport struct {
	Year           int             `json:"year"`
	Month          int             `json:"month"`
	PatientsCount  int64           `json:"patients_count"`
	VisitsCount    int             `json:"visits_count"`
	TotalRevenue   float64         `json:"total_revenue"`
	TotalDiscount  float64         `json:"total_discount"`
	DoctorEarnings []DoctorEarning `json:"doctor_earnings"`
	// Financial summary
	TotalExpenses       float64            `json:"total_expenses"`
	ExpensesByCategory  map[string]float64 `json:"expenses_by_category"`
	TotalSalaries       float64            `json:"total_salaries"`
	TotalDoctorEarnings float64            `json:"total_doctor_earnings"`
	GrossProfit         float64            `json:"gross_profit"`
	NetProfit           float64            `json:"net_profit"`
}

type DoctorEarning struct {
	DoctorID   string  `json:"doctor_id"`
	DoctorName string  `json:"doctor_name"`
	Revenue    float64 `json:"revenue"`
	Earning    float64 `json:"earning"`
	VisitCount int     `json:"visit_count"`
}

type ReportService struct {
	visitRepo   *repository.VisitRepository
	patientRepo *repository.PatientRepository
	userRepo    *repository.UserRepository
	expenseRepo *repository.ExpenseRepository
	salaryRepo  *repository.StaffSalaryRepository
}

func NewReportService(
	visitRepo *repository.VisitRepository,
	patientRepo *repository.PatientRepository,
	userRepo *repository.UserRepository,
	expenseRepo *repository.ExpenseRepository,
	salaryRepo *repository.StaffSalaryRepository,
) *ReportService {
	return &ReportService{
		visitRepo:   visitRepo,
		patientRepo: patientRepo,
		userRepo:    userRepo,
		expenseRepo: expenseRepo,
		salaryRepo:  salaryRepo,
	}
}

// GetDailyReport generates a daily report for a clinic
func (s *ReportService) GetDailyReport(ctx context.Context, clinicID primitive.ObjectID, date string) (*DailyReport, error) {
	// Get patients created today
	patientsCount, err := s.patientRepo.CountByClinicAndDate(ctx, clinicID, date)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to count patients", err)
	}

	// Get completed visits for the day
	visits, err := s.visitRepo.ListByClinicAndDate(ctx, clinicID, date)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to get visits", err)
	}

	// Calculate totals and group by doctor
	doctorStats := make(map[string]*DoctorEarning)
	totalRevenue := 0.0
	totalDiscount := 0.0

	for _, v := range visits {
		totalRevenue += v.Total
		totalDiscount += v.DiscountAmount

		doctorID := v.DoctorID.Hex()
		if _, exists := doctorStats[doctorID]; !exists {
			doctorStats[doctorID] = &DoctorEarning{
				DoctorID: doctorID,
			}
		}
		doctorStats[doctorID].Revenue += v.Total
		doctorStats[doctorID].Earning += v.DoctorEarning
		doctorStats[doctorID].VisitCount++
	}

	// Fetch doctor names
	doctorEarnings := make([]DoctorEarning, 0, len(doctorStats))
	for _, de := range doctorStats {
		doctorOID, _ := primitive.ObjectIDFromHex(de.DoctorID)
		doctor, err := s.userRepo.GetByIDWithClinicCheck(ctx, doctorOID, clinicID)
		if err == nil {
			de.DoctorName = doctor.FirstName + " " + doctor.LastName
		}
		doctorEarnings = append(doctorEarnings, *de)
	}

	return &DailyReport{
		Date:           date,
		PatientsCount:  patientsCount,
		VisitsCount:    len(visits),
		TotalRevenue:   totalRevenue,
		TotalDiscount:  totalDiscount,
		DoctorEarnings: doctorEarnings,
	}, nil
}

// GetMonthlyReport generates a monthly report for a clinic
func (s *ReportService) GetMonthlyReport(ctx context.Context, clinicID primitive.ObjectID, year, month int) (*MonthlyReport, error) {
	// Get visits for the month
	visits, err := s.visitRepo.ListByClinicAndMonth(ctx, clinicID, year, month)
	if err != nil {
		return nil, apperrors.InternalWithErr("Failed to get visits", err)
	}

	// Count patients created in the month
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0)

	// Count patients (simplified - just use total for now)
	patientsCount, err := s.patientRepo.CountByClinic(ctx, clinicID)
	if err != nil {
		patientsCount = 0
	}

	// Calculate totals and group by doctor
	doctorStats := make(map[string]*DoctorEarning)
	totalRevenue := 0.0
	totalDiscount := 0.0

	for _, v := range visits {
		// Only count visits in the date range
		if v.CreatedAt.Before(startDate) || v.CreatedAt.After(endDate) {
			continue
		}

		totalRevenue += v.Total
		totalDiscount += v.DiscountAmount

		doctorID := v.DoctorID.Hex()
		if _, exists := doctorStats[doctorID]; !exists {
			doctorStats[doctorID] = &DoctorEarning{
				DoctorID: doctorID,
			}
		}
		doctorStats[doctorID].Revenue += v.Total
		doctorStats[doctorID].Earning += v.DoctorEarning
		doctorStats[doctorID].VisitCount++
	}

	// Fetch doctor names and calculate total doctor earnings
	doctorEarnings := make([]DoctorEarning, 0, len(doctorStats))
	totalDoctorEarnings := 0.0
	for _, de := range doctorStats {
		doctorOID, _ := primitive.ObjectIDFromHex(de.DoctorID)
		doctor, err := s.userRepo.GetByIDWithClinicCheck(ctx, doctorOID, clinicID)
		if err == nil {
			de.DoctorName = doctor.FirstName + " " + doctor.LastName
		}
		totalDoctorEarnings += de.Earning
		doctorEarnings = append(doctorEarnings, *de)
	}

	// Fetch expenses for the month
	expenses, err := s.expenseRepo.FindByClinicAndMonth(ctx, clinicID, year, month)
	if err != nil {
		expenses = nil // Continue even if expenses fail
	}

	// Calculate total expenses and group by category
	totalExpenses := 0.0
	expensesByCategory := make(map[string]float64)
	for _, exp := range expenses {
		totalExpenses += exp.Amount
		expensesByCategory[exp.Category] += exp.Amount
	}

	// Fetch active salaries
	salaries, err := s.salaryRepo.FindActiveByClinic(ctx, clinicID)
	if err != nil {
		salaries = nil
	}

	// Calculate total salaries (only count active salaries effective before end of month)
	totalSalaries := 0.0
	for _, sal := range salaries {
		if sal.IsActive {
			totalSalaries += sal.MonthlyAmount
		}
	}

	// Calculate profit
	grossProfit := totalRevenue - totalDoctorEarnings
	netProfit := grossProfit - totalExpenses - totalSalaries

	return &MonthlyReport{
		Year:                year,
		Month:               month,
		PatientsCount:       patientsCount,
		VisitsCount:         len(visits),
		TotalRevenue:        totalRevenue,
		TotalDiscount:       totalDiscount,
		DoctorEarnings:      doctorEarnings,
		TotalExpenses:       totalExpenses,
		ExpensesByCategory:  expensesByCategory,
		TotalSalaries:       totalSalaries,
		TotalDoctorEarnings: totalDoctorEarnings,
		GrossProfit:         grossProfit,
		NetProfit:           netProfit,
	}, nil
}
