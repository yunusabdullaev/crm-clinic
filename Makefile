.PHONY: dev dev-backend dev-frontend seed build test

# Start both backend and frontend in development
dev:
	@echo "Starting backend and frontend..."
	@start /B cmd /c "cd backend && go run main.go"
	@cd frontend && npm run dev

# Start backend only
dev-backend:
	cd backend && go run main.go

# Start frontend only
dev-frontend:
	cd frontend && npm run dev

# Seed superadmin and demo clinic
seed:
	cd backend && go run main.go seed

# Build both
build:
	cd backend && go build ./...
	cd frontend && npm run build

# Run all tests
test:
	cd backend && go test ./... -v -count=1
	cd backend && go vet ./...
