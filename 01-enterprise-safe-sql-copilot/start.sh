#!/usr/bin/env bash
# ==============================================================================
# Enterprise Safe-SQL Copilot - One-Click Bootstrap Launcher (Linux / macOS)
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}==================================================================${NC}"
echo -e "${CYAN}   ENTERPRISE SAFE-SQL COPILOT: PRODUCTION BOOTSTRAP LAUNCHER    ${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo ""

# 1. Check Docker prerequisite
echo -e "${YELLOW}[1/4] Checking Docker engine...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[-] Docker is not installed or not in PATH.${NC}"
    echo -e "${YELLOW}    Please install Docker Desktop / Docker Engine.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}[-] Docker daemon is not running. Please start Docker service.${NC}"
    exit 1
fi
echo -e "${GREEN}[+] Docker daemon is active.${NC}"

# 2. Check Port Availability
echo -e "${YELLOW}[2/4] Verifying port availability (5432, 8000, 3000)...${NC}"
for port in 5432 8000 3000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || nc -z localhost $port >/dev/null 2>&1; then
        echo -e "    ${YELLOW}[!] Port $port is already in use by another process.${NC}"
    else
        echo -e "    ${GREEN}[+] Port $port is free.${NC}"
    fi
done

# 3. Setup environment files
echo -e "${YELLOW}[3/4] Checking environment configurations...${NC}"
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "    ${GREEN}[+] Created backend/.env from template.${NC}"
else
    echo -e "    ${GRAY}[+] backend/.env already exists.${NC}"
fi

if [ ! -f "frontend/.env.local" ]; then
    cp frontend/.env.local.example frontend/.env.local
    echo -e "    ${GREEN}[+] Created frontend/.env.local from template.${NC}"
else
    echo -e "    ${GRAY}[+] frontend/.env.local already exists.${NC}"
fi

# 4. Orchestrate containers
echo -e "${YELLOW}[4/4] Starting multi-container stack via Docker Compose...${NC}"
docker compose up -d --build

# 5. Poll health endpoint
echo ""
echo -e "${YELLOW}Waiting for backend services to become healthy...${NC}"
HEALTH_URL="http://localhost:8000/health"
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
    if curl -sf "$HEALTH_URL" | grep -q '"status":"healthy"'; then
        HEALTHY=true
        break
    else
        echo -e "    ${GRAY}Attempt $ATTEMPT/$MAX_ATTEMPTS: Waiting for backend...${NC}"
    fi
done

echo ""
if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}           SYSTEM BOOTSTRAPPED & OPERATIONAL!                     ${NC}"
    echo -e "${GREEN}==================================================================${NC}"
    echo ""
    echo -e "  -> ${CYAN}Frontend Cockpit:${NC}         http://localhost:3000"
    echo -e "  -> ${CYAN}Backend Swagger API Docs:${NC} http://localhost:8000/docs"
    echo -e "  -> ${CYAN}Backend Health Telemetry:${NC} http://localhost:8000/health"
    echo -e "  -> ${CYAN}PostgreSQL Database:${NC}      localhost:5432 (enterprise_db)"
    echo -e "  -> ${CYAN}Dedicated Read-Only User:${NC} readonly_analyst"
    echo ""
    echo -e "${GRAY}To view container logs:${NC}"
    echo -e "  docker compose logs -f"
    echo ""
    echo -e "${GRAY}To stop services:${NC}"
    echo -e "  docker compose down"
    echo ""
else
    echo -e "${RED}[!] Timed out waiting for backend health check. Inspect containers with:${NC}"
    echo -e "    docker compose ps"
    echo -e "    docker compose logs"
fi

