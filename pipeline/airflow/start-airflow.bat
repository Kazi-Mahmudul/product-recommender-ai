@echo off
REM Airflow Startup Script for Windows
REM This script initializes and starts the Airflow environment

echo Starting Airflow Data Pipeline...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: docker-compose is not installed. Please install Docker Desktop with docker-compose.
    pause
    exit /b 1
)

REM Create necessary directories
echo Creating Airflow directories...
if not exist "dags" mkdir dags
if not exist "logs" mkdir logs
if not exist "plugins" mkdir plugins
if not exist "data" mkdir data
if not exist "config" mkdir config

REM Initialize Airflow database (first time only)
if not exist ".airflow_initialized" (
    echo Initializing Airflow for the first time...
    docker-compose up airflow-init
    
    if errorlevel 0 (
        echo. > .airflow_initialized
        echo Airflow initialization completed successfully.
    ) else (
        echo Error: Airflow initialization failed.
        pause
        exit /b 1
    )
) else (
    echo Airflow already initialized. Skipping initialization.
)

REM Start Airflow services
echo Starting Airflow services...
docker-compose up -d

REM Wait for services to be ready
echo Waiting for Airflow services to start...
timeout /t 30 /nobreak >nul

REM Check if Airflow webserver is accessible
echo Checking Airflow webserver status...
set max_attempts=30
set attempt=1

:check_loop
curl -f http://localhost:8080/health >nul 2>&1
if errorlevel 0 (
    echo Airflow webserver is ready!
    goto :services_ready
) else (
    echo Attempt %attempt%/%max_attempts%: Waiting for Airflow webserver...
    timeout /t 10 /nobreak >nul
    set /a attempt+=1
    if %attempt% leq %max_attempts% goto :check_loop
)

echo Error: Airflow webserver failed to start within expected time.
echo Check the logs with: docker-compose logs airflow-webserver
pause
exit /b 1

:services_ready
REM Display service status
echo.
echo === Airflow Services Status ===
docker-compose ps

echo.
echo === Airflow Access Information ===
echo Airflow Web UI: http://localhost:8080
echo Username: admin
echo Password: admin123
echo.
echo StatsD Exporter (Prometheus metrics): http://localhost:9102/metrics
echo PostgreSQL (Airflow metadata): localhost:5433
echo.

REM Display useful commands
echo === Useful Commands ===
echo View logs: docker-compose logs -f [service-name]
echo Stop services: docker-compose down
echo Restart services: docker-compose restart
echo Access Airflow CLI: docker-compose run --rm airflow-cli bash
echo View DAG status: docker-compose exec airflow-scheduler airflow dags list
echo.

echo Airflow startup completed successfully!
echo You can now access the Airflow web interface at http://localhost:8080
echo.
echo Press any key to continue...
pause >nul