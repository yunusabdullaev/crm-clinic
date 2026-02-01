package router

import (
	"medical-crm/config"
	"medical-crm/internal/database"
	"medical-crm/internal/handler"
	"medical-crm/internal/middleware"
	"medical-crm/internal/repository"
	"medical-crm/internal/service"
	"medical-crm/pkg/logger"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// Setup creates and configures the Gin router
func Setup(cfg *config.Config, db *mongo.Database, mongoClient *mongo.Client, log *logger.Logger) *gin.Engine {
	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global middleware (order matters!)
	r.Use(middleware.RequestID())
	r.Use(middleware.Recovery(log))
	r.Use(middleware.Logger(log))

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID, X-Frontend-URL")
		c.Header("Access-Control-Expose-Headers", "X-Request-ID")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Initialize repositories
	clinicRepo := repository.NewClinicRepository(db, cfg.MongoTimeout)
	userRepo := repository.NewUserRepository(db, cfg.MongoTimeout)
	invitationRepo := repository.NewInvitationRepository(db, cfg.MongoTimeout)
	patientRepo := repository.NewPatientRepository(db, cfg.MongoTimeout)
	appointmentRepo := repository.NewAppointmentRepository(db, cfg.MongoTimeout)
	serviceRepo := repository.NewServiceRepository(db, cfg.MongoTimeout)
	visitRepo := repository.NewVisitRepository(db, cfg.MongoTimeout)
	contractRepo := repository.NewDoctorContractRepository(db)
	expenseRepo := repository.NewExpenseRepository(db)
	salaryRepo := repository.NewStaffSalaryRepository(db)
	auditRepo := repository.NewAuditLogRepository(db)
	treatmentPlanRepo := repository.NewTreatmentPlanRepository(db)

	// Initialize services
	authService := service.NewAuthService(
		userRepo,
		cfg.JWTAccessSecret,
		cfg.JWTRefreshSecret,
		cfg.JWTAccessTTL,
		cfg.JWTRefreshTTL,
	)
	clinicService := service.NewClinicService(clinicRepo, invitationRepo)
	userService := service.NewUserService(userRepo, invitationRepo, authService)
	patientService := service.NewPatientService(patientRepo)
	appointmentService := service.NewAppointmentService(appointmentRepo, patientRepo, userRepo)
	serviceService := service.NewServiceService(serviceRepo)
	visitService := service.NewVisitService(visitRepo, appointmentRepo, patientRepo, serviceRepo, userRepo, contractRepo)
	reportService := service.NewReportService(visitRepo, patientRepo, userRepo, expenseRepo, salaryRepo)
	contractService := service.NewDoctorContractService(contractRepo, userRepo, log)
	expenseService := service.NewExpenseService(expenseRepo)
	salaryService := service.NewStaffSalaryService(salaryRepo, userRepo)
	auditService := service.NewAuditService(auditRepo)
	treatmentPlanService := service.NewTreatmentPlanService(treatmentPlanRepo, patientRepo)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService, userService)
	superadminHandler := handler.NewSuperadminHandler(clinicService)
	bossHandler := handler.NewBossHandler(userService, serviceService, reportService, contractService, expenseService, salaryService, auditService, userRepo)
	receptionistHandler := handler.NewReceptionistHandler(patientService, appointmentService, userService)
	doctorHandler := handler.NewDoctorHandler(appointmentService, visitService, serviceService, auditService, treatmentPlanService)
	healthHandler := handler.NewHealthHandler(mongoClient)

	// Health endpoints (no auth required)
	r.GET("/health", healthHandler.Health)
	r.GET("/ready", healthHandler.Ready)
	r.GET("/metrics", healthHandler.Metrics)

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Auth routes (no auth required)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/accept-invite", authHandler.AcceptInvite)
		}

		// Superadmin routes
		admin := v1.Group("/admin")
		admin.Use(middleware.Auth(cfg.JWTAccessSecret))
		admin.Use(middleware.SuperadminOnly())
		{
			admin.POST("/clinics", superadminHandler.CreateClinic)
			admin.GET("/clinics", superadminHandler.ListClinics)
			admin.GET("/clinics/:id", superadminHandler.GetClinic)
			admin.POST("/clinics/:id/invite", superadminHandler.InviteBoss)
			admin.PATCH("/clinics/:id", superadminHandler.UpdateClinic)
			admin.DELETE("/clinics/:id", superadminHandler.DeleteClinic)
		}

		// Boss routes
		boss := v1.Group("/boss")
		boss.Use(middleware.Auth(cfg.JWTAccessSecret))
		boss.Use(middleware.BossOnly())
		boss.Use(middleware.TenantIsolation())
		{
			// User management
			boss.POST("/users", bossHandler.CreateUser)
			boss.GET("/users", bossHandler.ListUsers)
			boss.DELETE("/users/:id", bossHandler.DeactivateUser)
			boss.GET("/doctors", bossHandler.ListDoctors)

			// Service management
			boss.POST("/services", bossHandler.CreateService)
			boss.GET("/services", bossHandler.ListServices)
			boss.PUT("/services/:id", bossHandler.UpdateService)
			boss.DELETE("/services/:id", bossHandler.DeleteService)
			boss.POST("/services/import", bossHandler.ImportServices)

			// Doctor contracts
			boss.POST("/contracts", bossHandler.CreateContract)
			boss.GET("/contracts", bossHandler.ListContracts)
			boss.GET("/contracts/:id", bossHandler.GetContract)
			boss.PUT("/contracts/:id", bossHandler.UpdateContract)
			boss.DELETE("/contracts/:id", bossHandler.DeleteContract)

			// Expenses
			boss.POST("/expenses", bossHandler.CreateExpense)
			boss.GET("/expenses", bossHandler.ListExpenses)
			boss.DELETE("/expenses/:id", bossHandler.DeleteExpense)

			// Staff Salaries
			boss.POST("/salaries", bossHandler.CreateSalary)
			boss.GET("/salaries", bossHandler.ListSalaries)
			boss.PUT("/salaries/:id", bossHandler.UpdateSalary)
			boss.DELETE("/salaries/:id", bossHandler.DeleteSalary)

			// Reports
			boss.GET("/reports/daily", bossHandler.GetDailyReport)
			boss.GET("/reports/monthly", bossHandler.GetMonthlyReport)

			// Audit Logs
			boss.GET("/audit-logs", bossHandler.GetAuditLogs)
		}

		// Patient routes (receptionist and boss can access)
		patients := v1.Group("/patients")
		patients.Use(middleware.Auth(cfg.JWTAccessSecret))
		patients.Use(middleware.BossOrReceptionist())
		patients.Use(middleware.TenantIsolation())
		{
			patients.POST("", receptionistHandler.CreatePatient)
			patients.POST("/import", receptionistHandler.ImportPatients)
			patients.GET("", receptionistHandler.ListPatients)
			patients.GET("/:id", receptionistHandler.GetPatient)
			patients.PUT("/:id", receptionistHandler.UpdatePatient)
			patients.DELETE("/:id", receptionistHandler.DeletePatient)
		}

		// Appointment routes (receptionist and boss can access)
		appointments := v1.Group("/appointments")
		appointments.Use(middleware.Auth(cfg.JWTAccessSecret))
		appointments.Use(middleware.BossOrReceptionist())
		appointments.Use(middleware.TenantIsolation())
		{
			appointments.POST("", receptionistHandler.CreateAppointment)
			appointments.GET("", receptionistHandler.ListAppointments)
			appointments.GET("/:id", receptionistHandler.GetAppointment)
			appointments.PUT("/:id/reschedule", receptionistHandler.RescheduleAppointment)
			appointments.PUT("/:id/cancel", receptionistHandler.CancelAppointment)
		}

		// Doctors list (accessible by receptionist for appointment creation)
		doctors := v1.Group("/doctors")
		doctors.Use(middleware.Auth(cfg.JWTAccessSecret))
		doctors.Use(middleware.ClinicStaff())
		doctors.Use(middleware.TenantIsolation())
		{
			doctors.GET("", receptionistHandler.ListDoctors)
		}

		// Doctor routes
		doctor := v1.Group("/doctor")
		doctor.Use(middleware.Auth(cfg.JWTAccessSecret))
		doctor.Use(middleware.DoctorOnly())
		doctor.Use(middleware.TenantIsolation())
		{
			doctor.GET("/schedule", doctorHandler.GetSchedule)
			doctor.GET("/visits", doctorHandler.ListTodayVisits)
			doctor.POST("/visits", doctorHandler.StartVisit)
			doctor.GET("/visits/:id", doctorHandler.GetVisit)
			doctor.PUT("/visits/:id/complete", doctorHandler.CompleteVisit)
			doctor.GET("/services", doctorHandler.ListServices)
			doctor.PUT("/appointments/:id/status", doctorHandler.UpdateAppointmentStatus)
			// Treatment plans
			doctor.POST("/treatment-plans", doctorHandler.CreateTreatmentPlan)
			doctor.GET("/treatment-plans", doctorHandler.ListDoctorTreatmentPlans)
			doctor.GET("/patients/:id/treatment-plans", doctorHandler.ListTreatmentPlansByPatient)
			doctor.PUT("/treatment-plans/:id/steps/:step", doctorHandler.UpdateTreatmentPlanStep)
		}
	}

	return r
}

// CreateIndexes creates all MongoDB indexes
func CreateIndexes(db *mongo.Database, log *logger.Logger) error {
	return database.CreateIndexes(db, log)
}
