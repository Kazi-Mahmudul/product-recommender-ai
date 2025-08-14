@echo off
REM Data Pipeline Initialization Script for Windows
REM This script sets up the initial environment for the data pipeline

echo 🚀 Initializing Data Pipeline Environment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Create necessary directories
echo 📁 Creating directory structure...
mkdir airflow\dags 2>nul
mkdir airflow\logs 2>nul
mkdir airflow\plugins 2>nul
mkdir airflow\config 2>nul
mkdir services\scraper 2>nul
mkdir services\processor 2>nul
mkdir services\sync 2>nul
mkdir services\monitoring 2>nul
mkdir data\raw 2>nul
mkdir data\processed 2>nul
mkdir data\archive 2>nul
mkdir tests\unit 2>nul
mkdir tests\integration 2>nul
mkdir tests\fixtures 2>nul
mkdir docs\deployment 2>nul
mkdir docs\operations 2>nul
mkdir docs\troubleshooting 2>nul
mkdir infrastructure\terraform 2>nul
mkdir infrastructure\kubernetes 2>nul
mkdir infrastructure\docker-compose 2>nul
mkdir monitoring\grafana\dashboards 2>nul

REM Set up environment file
echo 🔐 Setting up environment file...
echo AIRFLOW_UID=50000> .env
type .env.example >> .env

REM Initialize Airflow database
echo 🗄️ Initializing Airflow database...
docker-compose up airflow-init

REM Pull required Docker images
echo 📦 Pulling Docker images...
docker-compose pull

echo ✅ Initialization complete!
echo.
echo Next steps:
echo 1. Configure your environment variables in .env file
echo 2. Run 'docker-compose up -d' to start the pipeline
echo 3. Access Airflow UI at http://localhost:8080
echo 4. Access Grafana at http://localhost:3000
echo.
echo Default credentials:
echo - Airflow: admin/admin
echo - Grafana: admin/admin

pause