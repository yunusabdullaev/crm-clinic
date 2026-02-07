# Medical CRM - Multi-Tenant Clinic Management System

A complete MVP for multi-tenant medical CRM with Golang backend, MongoDB database, and Next.js frontend.

## Features

- **Multi-tenant architecture** - Each clinic is isolated with its own data
- **Role-based access control** - Superadmin, Boss, Doctor, Receptionist roles
- **Patient management** - CRUD operations with search functionality
- **Appointment scheduling** - 30-minute slots with overlap prevention
- **Visit management** - Diagnosis, services, discounts, and calculations
- **Reporting** - Daily and monthly revenue/earnings reports
- **JWT authentication** - Access and refresh tokens

## Tech Stack

- **Backend**: Go + Gin Framework
- **Database**: MongoDB 7.0
- **Frontend**: Next.js 14 + TypeScript
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git

### 1. Clone and Start

```bash
# Clone the repository
git clone <repository-url>
cd "CRM Clinic final"

# Start all services
docker-compose up -d
```

### 2. Seed the Database

```bash
# Create superadmin and demo clinic
docker-compose exec backend ./crm seed
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

### Default Credentials

> ⚠️ **Do NOT use defaults in production.** Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` via environment variables.

| Role | Phone | Password |
|------|-------|----------|
| Superadmin | *(set via env)* | *(set via env)* |

## Development Setup

### Backend (Go)

```bash
cd backend

# Install dependencies
go mod download

# Copy environment file
cp .env.example .env

# Run locally
go run main.go

# Run seed
go run main.go seed
```

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/accept-invite` - Accept invitation

### Superadmin
- `POST /api/v1/admin/clinics` - Create clinic
- `GET /api/v1/admin/clinics` - List clinics
- `POST /api/v1/admin/clinics/:id/invite` - Invite boss

### Boss
- `POST /api/v1/boss/users` - Create staff
- `GET /api/v1/boss/users` - List staff
- `POST /api/v1/boss/services` - Create service
- `GET /api/v1/boss/services` - List services
- `GET /api/v1/boss/reports/daily` - Daily report
- `GET /api/v1/boss/reports/monthly` - Monthly report

### Receptionist
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/patients` - List patients
- `PUT /api/v1/patients/:id` - Update patient
- `DELETE /api/v1/patients/:id` - Delete patient
- `POST /api/v1/appointments` - Create appointment
- `GET /api/v1/appointments` - List appointments

### Doctor
- `GET /api/v1/doctor/schedule` - Get schedule
- `POST /api/v1/doctor/visits` - Start visit
- `PUT /api/v1/doctor/visits/:id/complete` - Complete visit
- `GET /api/v1/doctor/services` - List services

## Business Flow

1. **Superadmin** creates clinic → invites **Boss**
2. **Boss** sets up services → creates **Doctors** and **Receptionists**
3. **Receptionist** registers patients → books appointments
4. **Doctor** starts visit → adds diagnosis + services → completes visit
5. **Boss** views revenue and doctor earnings reports

## Project Structure

```
├── backend/
│   ├── config/          # Configuration loader
│   ├── internal/
│   │   ├── database/    # MongoDB connection + indexes
│   │   ├── handler/     # HTTP handlers
│   │   ├── middleware/  # Auth, RBAC, Tenant isolation
│   │   ├── models/      # Domain models + DTOs
│   │   ├── repository/  # Data access layer
│   │   ├── router/      # Route definitions
│   │   └── service/     # Business logic
│   ├── pkg/
│   │   ├── errors/      # Error handling
│   │   └── logger/      # Structured logging
│   ├── Dockerfile
│   ├── go.mod
│   └── main.go
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js app router pages
│   │   └── lib/         # API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | `development` or `production` | development |
| `MONGO_URI` | MongoDB connection string | mongodb://mongo:27017 |
| `MONGO_DB` | Database name | medical_crm |
| `JWT_ACCESS_SECRET` | JWT access token secret (32+ chars) | *(required in prod)* |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (32+ chars) | *(required in prod)* |
| `SUPERADMIN_EMAIL` | Initial superadmin phone | *(required for seed)* |
| `SUPERADMIN_PASSWORD` | Initial superadmin password | *(required for seed)* |
| `FRONTEND_URL` | Frontend URL for CORS whitelist | http://localhost:3000 |
| `ALLOWED_ORIGINS` | Extra CORS origins (comma-separated) | - |

## Security Notes

⚠️ **For Production:**
- Set `ENVIRONMENT=production` — this enables all security guards
- Use strong JWT secrets (32+ characters, random)
- Set `FRONTEND_URL` to your Vercel domain for CORS protection
- CORS is automatically restricted to your frontend domain only
- Never commit `.env` files — use platform environment variables
- Security headers are automatically set: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

## License

MIT
