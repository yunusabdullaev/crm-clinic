package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"medical-crm/internal/middleware"
	"medical-crm/internal/models"
	"medical-crm/internal/repository"
	"medical-crm/internal/service"
	apperrors "medical-crm/pkg/errors"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BossHandler struct {
	userService     *service.UserService
	serviceService  *service.ServiceService
	reportService   *service.ReportService
	contractService *service.DoctorContractService
	expenseService  *service.ExpenseService
	salaryService   *service.StaffSalaryService
	auditService    *service.AuditService
	userRepo        *repository.UserRepository
}

func NewBossHandler(
	userService *service.UserService,
	serviceService *service.ServiceService,
	reportService *service.ReportService,
	contractService *service.DoctorContractService,
	expenseService *service.ExpenseService,
	salaryService *service.StaffSalaryService,
	auditService *service.AuditService,
	userRepo *repository.UserRepository,
) *BossHandler {
	return &BossHandler{
		userService:     userService,
		serviceService:  serviceService,
		reportService:   reportService,
		contractService: contractService,
		expenseService:  expenseService,
		salaryService:   salaryService,
		auditService:    auditService,
		userRepo:        userRepo,
	}
}

// ==================== User Management ====================

// CreateUser creates a new user (doctor or receptionist)
// POST /api/v1/boss/users
func (h *BossHandler) CreateUser(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userRole := middleware.GetUserRole(c)

	var dto models.CreateUserDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	user, err := h.userService.CreateUser(c.Request.Context(), dto, clinicID, userID, userRole)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, user.ToResponse())
}

// ListUsers returns all users in the clinic
// GET /api/v1/boss/users
func (h *BossHandler) ListUsers(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	users, total, err := h.userService.ListByClinic(c.Request.Context(), clinicID, page, pageSize)
	if err != nil {
		appErr := apperrors.Internal("Failed to list users")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.UserResponse, len(users))
	for i, user := range users {
		responses[i] = user.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{
		"users":     responses,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// DeactivateUser deactivates a user
// DELETE /api/v1/boss/users/:id
func (h *BossHandler) DeactivateUser(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid user ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if err := h.userService.DeactivateUser(c.Request.Context(), userID, clinicID); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to deactivate user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deactivated successfully"})
}

// ==================== Service Management ====================

// CreateService creates a new service
// POST /api/v1/boss/services
func (h *BossHandler) CreateService(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CreateServiceDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	svc, err := h.serviceService.Create(c.Request.Context(), dto, clinicID, userID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create service")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, svc.ToResponse())
}

// ListServices returns all services
// GET /api/v1/boss/services
func (h *BossHandler) ListServices(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	activeOnly := c.DefaultQuery("active_only", "false") == "true"

	services, err := h.serviceService.List(c.Request.Context(), clinicID, activeOnly)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list services")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"services": services})
}

// UpdateService updates a service
// PUT /api/v1/boss/services/:id
func (h *BossHandler) UpdateService(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	serviceID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid service ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.UpdateServiceDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	svc, err := h.serviceService.Update(c.Request.Context(), serviceID, clinicID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to update service")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, svc.ToResponse())
}

// DeleteService deactivates a service
// DELETE /api/v1/boss/services/:id
func (h *BossHandler) DeleteService(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	serviceID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid service ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if err := h.serviceService.Delete(c.Request.Context(), serviceID, clinicID); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to delete service")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Service deleted successfully"})
}

// ImportServices bulk imports services from Excel data
// POST /api/v1/boss/services/import
func (h *BossHandler) ImportServices(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var req struct {
		Services []models.CreateServiceDTO `json:"services" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		appErr := apperrors.Validation("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	if len(req.Services) == 0 {
		appErr := apperrors.Validation("No services provided")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	imported := 0
	var errors []string
	for i, dto := range req.Services {
		if dto.Duration == 0 {
			dto.Duration = 30 // Default duration
		}
		_, err := h.serviceService.Create(c.Request.Context(), dto, clinicID, userID)
		if err != nil {
			errors = append(errors, "Row "+(strconv.Itoa(i+1))+": "+err.Error())
		} else {
			imported++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"imported": imported,
		"errors":   errors,
	})
}

// ==================== Reports ====================

// GetDailyReport returns daily statistics
// GET /api/v1/boss/reports/daily
func (h *BossHandler) GetDailyReport(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	date := c.DefaultQuery("date", time.Now().UTC().Format("2006-01-02"))

	report, err := h.reportService.GetDailyReport(c.Request.Context(), clinicID, date)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to generate report")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetMonthlyReport returns monthly statistics
// GET /api/v1/boss/reports/monthly
func (h *BossHandler) GetMonthlyReport(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	now := time.Now().UTC()
	year, _ := strconv.Atoi(c.DefaultQuery("year", strconv.Itoa(now.Year())))
	month, _ := strconv.Atoi(c.DefaultQuery("month", strconv.Itoa(int(now.Month()))))

	report, err := h.reportService.GetMonthlyReport(c.Request.Context(), clinicID, year, month)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to generate report")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, report)
}

// ListDoctors returns all doctors
// GET /api/v1/boss/doctors
func (h *BossHandler) ListDoctors(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	doctors, err := h.userService.ListDoctors(c.Request.Context(), clinicID)
	if err != nil {
		appErr := apperrors.Internal("Failed to list doctors")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.UserResponse, len(doctors))
	for i, doctor := range doctors {
		responses[i] = doctor.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"doctors": responses})
}

// ==================== Doctor Contracts ====================

// CreateContract creates a new doctor contract
// POST /api/v1/boss/contracts
func (h *BossHandler) CreateContract(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CreateDoctorContractDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.BadRequest("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	contract, err := h.contractService.Create(c.Request.Context(), clinicID, userID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create contract")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, contract.ToResponse())
}

// ListContracts returns all contracts for the clinic
// GET /api/v1/boss/contracts
func (h *BossHandler) ListContracts(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	contracts, err := h.contractService.List(c.Request.Context(), clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list contracts")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.DoctorContractResponse, len(contracts))
	for i, contract := range contracts {
		responses[i] = contract.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"contracts": responses})
}

// GetContract returns a specific contract
// GET /api/v1/boss/contracts/:id
func (h *BossHandler) GetContract(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	contractID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid contract ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	contract, err := h.contractService.GetByID(c.Request.Context(), contractID, clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to get contract")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, contract.ToResponse())
}

// UpdateContract updates a contract
// PUT /api/v1/boss/contracts/:id
func (h *BossHandler) UpdateContract(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	contractID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid contract ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.UpdateDoctorContractDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.BadRequest("Invalid request body: " + err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	contract, err := h.contractService.Update(c.Request.Context(), contractID, clinicID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to update contract")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, contract.ToResponse())
}

// DeleteContract deletes a contract
// DELETE /api/v1/boss/contracts/:id
func (h *BossHandler) DeleteContract(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	contractID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid contract ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	err = h.contractService.Delete(c.Request.Context(), contractID, clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to delete contract")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contract deleted"})
}

// ==================== Expense Management ====================

// CreateExpense creates a new clinic expense
func (h *BossHandler) CreateExpense(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}
	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CreateExpenseDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation(err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	expense, err := h.expenseService.Create(c.Request.Context(), clinicID, userID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create expense")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, gin.H{"expense": expense.ToResponse()})
}

// ListExpenses returns all expenses for the clinic
func (h *BossHandler) ListExpenses(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	expenses, err := h.expenseService.List(c.Request.Context(), clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list expenses")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.ExpenseResponse, len(expenses))
	for i, e := range expenses {
		responses[i] = e.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"expenses": responses})
}

// DeleteExpense deletes an expense
func (h *BossHandler) DeleteExpense(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	expenseID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid expense ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	err = h.expenseService.Delete(c.Request.Context(), expenseID, clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to delete expense")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted"})
}

// ==================== Staff Salary Management ====================

// CreateSalary creates a new staff salary
func (h *BossHandler) CreateSalary(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}
	userID, err := middleware.GetUserObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Invalid user")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.CreateStaffSalaryDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation(err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	salary, err := h.salaryService.Create(c.Request.Context(), clinicID, userID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to create salary")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusCreated, gin.H{"salary": salary.ToResponse()})
}

// ListSalaries returns all staff salaries for the clinic
func (h *BossHandler) ListSalaries(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	salaries, err := h.salaryService.List(c.Request.Context(), clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to list salaries")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	responses := make([]models.StaffSalaryResponse, len(salaries))
	for i, s := range salaries {
		responses[i] = s.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"salaries": responses})
}

// UpdateSalary updates a staff salary
func (h *BossHandler) UpdateSalary(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	salaryID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid salary ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	var dto models.UpdateStaffSalaryDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		appErr := apperrors.Validation(err.Error())
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	salary, err := h.salaryService.Update(c.Request.Context(), salaryID, clinicID, dto)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to update salary")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"salary": salary.ToResponse()})
}

// DeleteSalary deletes a staff salary
func (h *BossHandler) DeleteSalary(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	salaryID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		appErr := apperrors.BadRequest("Invalid salary ID")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	err = h.salaryService.Delete(c.Request.Context(), salaryID, clinicID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		appErr := apperrors.Internal("Failed to delete salary")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Salary deleted"})
}

// ==================== Audit Logs ====================

// GetAuditLogs returns audit logs for the clinic with optional filters
func (h *BossHandler) GetAuditLogs(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	clinicID, err := middleware.GetClinicObjectID(c)
	if err != nil {
		appErr := apperrors.Unauthorized("Clinic not found in token")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Parse optional doctor_id filter
	var doctorID *primitive.ObjectID
	if doctorIDStr := c.Query("doctor_id"); doctorIDStr != "" {
		id, err := primitive.ObjectIDFromHex(doctorIDStr)
		if err != nil {
			appErr := apperrors.BadRequest("Invalid doctor_id")
			c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
			return
		}
		doctorID = &id
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Parse limit
	limit := int64(100)
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.ParseInt(limitStr, 10, 64); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	logs, err := h.auditService.Query(c.Request.Context(), clinicID, doctorID, startDate, endDate, limit)
	if err != nil {
		appErr := apperrors.Internal("Failed to fetch audit logs")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Enrich with actor names
	responses := make([]models.AuditLogResponse, len(logs))
	for i, log := range logs {
		responses[i] = log.ToResponse()
		// Fetch actor name
		if user, err := h.userRepo.GetByID(context.Background(), log.ActorID); err == nil && user != nil {
			responses[i].ActorName = user.FirstName + " " + user.LastName
		}
	}

	c.JSON(http.StatusOK, gin.H{"audit_logs": responses})
}
