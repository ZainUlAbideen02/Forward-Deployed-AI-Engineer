# ==============================================================================
# Enterprise Safe-SQL Copilot - One-Click Bootstrap Launcher (Windows PowerShell)
# ==============================================================================

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   ENTERPRISE SAFE-SQL COPILOT: PRODUCTION BOOTSTRAP LAUNCHER    " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# 1. Check Docker prerequisite
Write-Host "[1/4] Checking Docker engine..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "[-] Docker is not detected in your PATH." -ForegroundColor Red
    Write-Host "    Please ensure Docker Desktop is installed and running." -ForegroundColor Yellow
    Write-Host "    Local fallback: You can run the backend with 'uv run uvicorn app.main:app' and frontend with 'npm run dev'." -ForegroundColor Gray
    exit 1
}

try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[-] Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
    Write-Host "[+] Docker daemon is active and responsive." -ForegroundColor Green
} catch {
    Write-Host "[-] Could not communicate with Docker daemon: $_" -ForegroundColor Red
    exit 1
}

# 2. Check Port Availability (5432, 8000, 3000)
Write-Host "[2/4] Verifying port availability (5432, 8000, 3000)..." -ForegroundColor Yellow
$ports = @(5432, 8000, 3000)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "    [!] Warning: Port $port appears to be occupied by another process." -ForegroundColor Magenta
    } else {
        Write-Host "    [+] Port $port is available." -ForegroundColor Green
    }
}

# 3. Setup environment files
Write-Host "[3/4] Checking environment configurations..." -ForegroundColor Yellow
if (-not (Test-Path "backend/.env")) {
    Copy-Item "backend/.env.example" "backend/.env"
    Write-Host "    [+] Created backend/.env from template." -ForegroundColor Green
} else {
    Write-Host "    [+] backend/.env already exists." -ForegroundColor Gray
}

if (-not (Test-Path "frontend/.env.local")) {
    Copy-Item "frontend/.env.local.example" "frontend/.env.local"
    Write-Host "    [+] Created frontend/.env.local from template." -ForegroundColor Green
} else {
    Write-Host "    [+] frontend/.env.local already exists." -ForegroundColor Gray
}

# 4. Orchestrate containers
Write-Host "[4/4] Starting multi-container stack via Docker Compose..." -ForegroundColor Yellow
docker compose up -d --build

# 5. Poll health endpoint
Write-Host ""
Write-Host "Waiting for backend services to become healthy..." -ForegroundColor Yellow
$healthUrl = "http://localhost:8000/health"
$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts -and -not $healthy) {
    $attempt++
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.status -eq "healthy") {
            $healthy = $true
            break
        }
    } catch {
        Write-Host "    Attempt $attempt/$maxAttempts: Waiting for backend..." -ForegroundColor Gray
    }
}

Write-Host ""
if ($healthy) {
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "           SYSTEM BOOTSTRAPPED & OPERATIONAL!                     " -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  -> Frontend Cockpit:         http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  -> Backend Swagger API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host "  -> Backend Health Telemetry: http://localhost:8000/health" -ForegroundColor Cyan
    Write-Host "  -> PostgreSQL Database:      localhost:5432 (enterprise_db)" -ForegroundColor Cyan
    Write-Host "  -> Dedicated Read-Only User: readonly_analyst" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To view container logs:" -ForegroundColor Gray
    Write-Host "  docker compose logs -f" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To stop services:" -ForegroundColor Gray
    Write-Host "  docker compose down" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[!] Timed out waiting for backend health check. Inspect containers with:" -ForegroundColor Red
    Write-Host "    docker compose ps" -ForegroundColor Yellow
    Write-Host "    docker compose logs" -ForegroundColor Yellow
}
