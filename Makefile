# Priority Compass - Development Commands
# Usage: make <target>

.PHONY: help dev build start lint typecheck check clean install db-start db-stop db-reset db-types deploy

# Default target
help:
	@echo "Priority Compass - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          Start development server"
	@echo "  make build        Build for production"
	@echo "  make start        Start production server"
	@echo "  make install      Install dependencies"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint         Run ESLint"
	@echo "  make typecheck    Run TypeScript compiler check"
	@echo "  make check        Run all checks (lint + typecheck)"
	@echo ""
	@echo "Database:"
	@echo "  make db-start     Start local Supabase"
	@echo "  make db-stop      Stop local Supabase"
	@echo "  make db-reset     Reset database and apply migrations"
	@echo "  make db-types     Generate TypeScript types from schema"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy       Deploy to Vercel"
	@echo ""

# ─────────────────────────────────────────
# Development
# ─────────────────────────────────────────

dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

install:
	pnpm install

clean:
	rm -rf .next node_modules

# ─────────────────────────────────────────
# Code Quality
# ─────────────────────────────────────────

lint:
	pnpm lint

typecheck:
	npx tsc --noEmit

check: lint typecheck
	@echo "✓ All checks passed"

# ─────────────────────────────────────────
# Database (Supabase)
# ─────────────────────────────────────────

db-start:
	supabase start

db-stop:
	supabase stop

db-reset:
	supabase db reset

db-types:
	supabase gen types typescript --local > types/database.ts
	@echo "✓ Database types generated"

# ─────────────────────────────────────────
# Deployment
# ─────────────────────────────────────────

deploy:
	vercel deploy --prod
