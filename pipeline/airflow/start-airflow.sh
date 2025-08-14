#!/bin/bash

# Airflow Startup Script
# This script initializes and starts the Airflow environment

set -e

echo "Starting Airflow Data Pipeline..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Create necessary directories
echo "Creating Airflow directories..."
mkdir -p ./dags
mkdir -p ./logs
mkdir -p ./plugins
mkdir -p ./data
mkdir -p ./config

# Set proper permissions for Airflow directories
echo "Setting directory permissions..."
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    # Linux or macOS
    sudo chown -R 50000:0 ./dags ./logs ./plugins ./data
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash or similar)
    echo "Windows detected - skipping permission changes"
fi

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found. Using default values."
fi

# Initialize Airflow database (first time only)
if [ ! -f .airflow_initialized ]; then
    echo "Initializing Airflow for the first time..."
    docker-compose up airflow-init
    
    if [ $? -eq 0 ]; then
        touch .airflow_initialized
        echo "Airflow initialization completed successfully."
    else
        echo "Error: Airflow initialization failed."
        exit 1
    fi
else
    echo "Airflow already initialized. Skipping initialization."
fi

# Start Airflow services
echo "Starting Airflow services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for Airflow services to start..."
sleep 30

# Check if Airflow webserver is accessible
echo "Checking Airflow webserver status..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "Airflow webserver is ready!"
        break
    else
        echo "Attempt $attempt/$max_attempts: Waiting for Airflow webserver..."
        sleep 10
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "Error: Airflow webserver failed to start within expected time."
    echo "Check the logs with: docker-compose logs airflow-webserver"
    exit 1
fi

# Display service status
echo ""
echo "=== Airflow Services Status ==="
docker-compose ps

echo ""
echo "=== Airflow Access Information ==="
echo "Airflow Web UI: http://localhost:8080"
echo "Username: ${AIRFLOW_ADMIN_USER:-admin}"
echo "Password: ${AIRFLOW_ADMIN_PASSWORD:-admin123}"
echo ""
echo "StatsD Exporter (Prometheus metrics): http://localhost:9102/metrics"
echo "PostgreSQL (Airflow metadata): localhost:5433"
echo ""

# Display useful commands
echo "=== Useful Commands ==="
echo "View logs: docker-compose logs -f [service-name]"
echo "Stop services: docker-compose down"
echo "Restart services: docker-compose restart"
echo "Access Airflow CLI: docker-compose run --rm airflow-cli bash"
echo "View DAG status: docker-compose exec airflow-scheduler airflow dags list"
echo ""

echo "Airflow startup completed successfully!"
echo "You can now access the Airflow web interface at http://localhost:8080"