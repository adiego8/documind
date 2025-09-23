.PHONY: help install install-backend-deps install-frontend-deps setup run-backend run-frontend run dev clean build test

# Default target
help: ## Show this help message
	@echo "DOCUMIND - AI Document Assistant Platform - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  1. make setup     - Install all dependencies"
	@echo "  2. make run       - Start both backend and frontend"
	@echo "  3. Visit http://localhost:3000"
	@echo ""
	@echo "🧠 Welcome to DOCUMIND - Your AI Document Assistant!"

setup: install ## Install all dependencies (backend + frontend)

install: install-backend-deps install-frontend-deps ## Install both backend and frontend dependencies

install-backend-deps: ## Install Python backend dependencies
	@echo "📦 Installing backend dependencies..."
	source .venv/bin/activate && pip install -r requirements.txt

install-frontend-deps: ## Install React frontend dependencies
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

create-venv: ## Create Python virtual environment
	@echo "🐍 Creating Python virtual environment..."
	python -m venv .venv
	@echo "✅ Virtual environment created. Activate with: source .venv/bin/activate"

run: ## Start both backend and frontend (requires 2 terminals)
	@echo "🚀 Starting RAG System..."
	@echo ""
	@echo "📋 You need to run these in separate terminals:"
	@echo ""
	@echo "  Terminal 1 (Backend):"
	@echo "    make run-backend"
	@echo ""
	@echo "  Terminal 2 (Frontend):"
	@echo "    make run-frontend"
	@echo ""
	@echo "Or use 'make dev' to see the individual commands"

run-backend: ## Start DOCUMIND API backend server
	@echo "🔧 Starting DOCUMIND API backend on http://localhost:8000..."
	source .venv/bin/activate && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-frontend: ## Start DOCUMIND React frontend development server
	@echo "⚛️  Starting DOCUMIND React frontend on http://localhost:3000..."
	cd frontend && npm start

dev: ## Show development commands
	@echo "🛠️  Development Commands:"
	@echo ""
	@echo "Backend (Terminal 1):"
	@echo "  source .venv/bin/activate"
	@echo "  uvicorn app.main:app --reload"
	@echo ""
	@echo "Frontend (Terminal 2):"
	@echo "  cd frontend"
	@echo "  npm start"
	@echo ""
	@echo "Access:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

build: ## Build frontend for production
	@echo "🏗️  Building frontend for production..."
	cd frontend && npm run build

test-backend: ## Run backend tests
	@echo "🧪 Running backend tests..."
	source .venv/bin/activate && python -m pytest

test-frontend: ## Run frontend tests
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test

lint: ## Run linting for both backend and frontend
	@echo "🔍 Running linters..."
	source .venv/bin/activate && python -m flake8 app/
	cd frontend && npm run lint

clean: ## Clean build artifacts and caches
	@echo "🧹 Cleaning build artifacts..."
	rm -rf frontend/build
	rm -rf frontend/node_modules/.cache
	find . -type d -name "__pycache__" -delete
	find . -type f -name "*.pyc" -delete

start-db: ## Start PostgreSQL database with Docker Compose
	@echo "🐘 Starting PostgreSQL database..."
	docker-compose up -d postgres
	@echo "✅ PostgreSQL is starting up..."
	@echo "📊 Database will be available at localhost:5432"
	@echo "🌐 Adminer (DB admin) will be available at http://localhost:8080"

stop-db: ## Stop PostgreSQL database
	@echo "🛑 Stopping PostgreSQL database..."
	docker-compose down

start-adminer: ## Start Adminer (database admin interface)
	@echo "🌐 Starting Adminer database admin interface..."
	docker-compose up -d adminer
	@echo "✅ Adminer available at http://localhost:8080"
	@echo "📋 Login with: Server=postgres, Username=postgres, Password=postgres, Database=ragdb"

db-logs: ## Show database logs
	@echo "📋 PostgreSQL logs:"
	docker-compose logs -f postgres

reset-db: ## Reset the database (WARNING: Deletes all data)
	@echo "⚠️  This will delete ALL database data!"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ]
	docker-compose down -v
	docker volume rm rag_postgres_data 2>/dev/null || true
	@echo "✅ Database reset. Run 'make start-db' to recreate."

stats: ## Show project statistics
	@echo "📊 Project Statistics:"
	@echo "Backend files: $$(find app/ -name '*.py' | wc -l)"
	@echo "Frontend files: $$(find frontend/src -name '*.js' -o -name '*.jsx' | wc -l)"
	@echo "Total lines of code: $$(find app/ frontend/src -name '*.py' -o -name '*.js' -o -name '*.jsx' | xargs wc -l | tail -1)"

check-env: ## Check if environment is properly configured
	@echo "🔍 Checking environment configuration..."
	@test -f .env && echo "✅ .env file exists" || echo "❌ .env file missing (copy from .env.example)"
	@test -d .venv && echo "✅ Virtual environment exists" || echo "❌ Virtual environment missing (run: make create-venv)"
	@test -d frontend/node_modules && echo "✅ Frontend dependencies installed" || echo "❌ Frontend dependencies missing (run: make install-frontend-deps)"
	@source .venv/bin/activate && python -c "import app.main" 2>/dev/null && echo "✅ Backend dependencies installed" || echo "❌ Backend dependencies missing (run: make install-backend-deps)"

logs: ## Show application logs (if running with systemd or docker)
	@echo "📋 For logs, check your terminal where you ran 'make run-backend' and 'make run-frontend'"
	@echo "Or use: tail -f backend.log frontend.log (if you redirect output to files)"