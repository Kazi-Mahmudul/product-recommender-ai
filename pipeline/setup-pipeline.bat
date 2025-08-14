@echo off
REM Data Pipeline Setup Script for Windows
REM This script sets up and starts the complete data pipeline system

echo.
echo 🚀 Data Pipeline Setup Script
echo ==============================
echo.

REM Function to check if command exists
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    echo Visit: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

where docker-compose >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Desktop with Docker Compose.
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [INFO] System requirements check completed
echo.

REM Setup environment
echo [INFO] Setting up environment...

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo [INFO] Creating .env file from template...
    copy .env.example .env >nul
    echo [SUCCESS] .env file created. Please review and update the configuration.
) else (
    echo [INFO] .env file already exists
)

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "backups" mkdir backups
if not exist "airflow\logs" mkdir airflow\logs
if not exist "airflow\plugins" mkdir airflow\plugins
if not exist "monitoring\data" mkdir monitoring\data

echo [SUCCESS] Environment setup completed
echo.

REM Start services
echo [INFO] Starting pipeline services...

REM Pull latest images
echo [INFO] Pulling Docker images...
docker-compose -f docker-compose.master.yml pull

REM Start infrastructure services first
echo [INFO] Starting infrastructure services (PostgreSQL, Redis)...
docker-compose -f docker-compose.master.yml up -d postgres redis

REM Wait for infrastructure to be ready
echo [INFO] Waiting for infrastructure services to be ready...
timeout /t 30 /nobreak >nul

REM Start monitoring services
echo [INFO] Starting monitoring services (Prometheus, Grafana)...
docker-compose -f docker-compose.master.yml up -d prometheus grafana

REM Initialize Airflow
echo [INFO] Initializing Airflow...
docker-compose -f docker-compose.master.yml up airflow-init

REM Start Airflow services
echo [INFO] Starting Airflow services...
docker-compose -f docker-compose.master.yml up -d airflow-webserver airflow-scheduler airflow-worker

REM Start pipeline services
echo [INFO] Starting pipeline services...
docker-compose -f docker-compose.master.yml up -d scraper-service processor-service sync-service

REM Start API and alerting services
echo [INFO] Starting API and alerting services...
docker-compose -f docker-compose.master.yml up -d trigger-api alerting-service logging-service

echo [SUCCESS] All services started successfully
echo.

REM Verify installation
echo [INFO] Verifying installation...
echo [INFO] Waiting for services to be ready...
timeout /t 60 /nobreak >nul

echo [INFO] Checking service health...
curl -f -s http://localhost:8080/health >nul 2>&1 && echo [SUCCESS] Airflow is healthy || echo [WARNING] Airflow is not responding
curl -f -s http://localhost:3000/api/health >nul 2>&1 && echo [SUCCESS] Grafana is healthy || echo [WARNING] Grafana is not responding
curl -f -s http://localhost:9090/-/healthy >nul 2>&1 && echo [SUCCESS] Prometheus is healthy || echo [WARNING] Prometheus is not responding
curl -f -s http://localhost:8000 >nul 2>&1 && echo [SUCCESS] Scraper Service is healthy || echo [WARNING] Scraper Service is not responding (placeholder)
curl -f -s http://localhost:8001 >nul 2>&1 && echo [SUCCESS] Processor Service is healthy || echo [WARNING] Processor Service is not responding (placeholder)
curl -f -s http://localhost:8002 >nul 2>&1 && echo [SUCCESS] Sync Service is healthy || echo [WARNING] Sync Service is not responding (placeholder)

echo.
echo [INFO] Service status:
docker-compose -f docker-compose.master.yml ps

echo.
echo 🎉 Pipeline Setup Complete!
echo ==========================
echo.
echo Web Interfaces:
echo   • Airflow Web UI:    http://localhost:8080 (admin/admin123)
echo   • Grafana Dashboard: http://localhost:3000 (admin/admin123)
echo   • Prometheus:        http://localhost:9090
echo.
echo API Endpoints:
echo   • Scraper Service:   http://localhost:8000
echo   • Processor Service: http://localhost:8001
echo   • Sync Service:      http://localhost:8002
echo   • Trigger API:       http://localhost:5000
echo   • Alerting Service:  http://localhost:8004
echo   • Logging Service:   http://localhost:8003
echo.
echo Useful Commands:
echo   • View logs:         docker-compose -f docker-compose.master.yml logs -f [service-name]
echo   • Stop services:     docker-compose -f docker-compose.master.yml down
echo   • Restart services:  docker-compose -f docker-compose.master.yml restart
echo   • Service status:    docker-compose -f docker-compose.master.yml ps
echo.
echo Next Steps:
echo   1. Review and update .env file with your specific configuration
echo   2. Access Airflow at http://localhost:8080 to monitor pipeline execution
echo   3. Check Grafana at http://localhost:3000 for monitoring dashboards
echo   4. Review the SETUP_GUIDE.md for detailed configuration options
echo.
echo [SUCCESS] Setup completed successfully!
echo.
echo Press any key to continue...
pause >nul