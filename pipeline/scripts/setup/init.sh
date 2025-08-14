#!/bin/bash

# Data Pipeline Initialization Script
# This script sets up the initial environment for the data pipeline

set -e

echo "🚀 Initializing Data Pipeline Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p airflow/{dags,logs,plugins,config}
mkdir -p services/{scraper,processor,sync,monitoring}
mkdir -p data/{raw,processed,archive}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p docs/{deployment,operations,troubleshooting}
mkdir -p infrastructure/{terraform,kubernetes,docker-compose}
mkdir -p monitoring/grafana/dashboards

# Set proper permissions for Airflow
echo "🔐 Setting up permissions..."
echo -e "AIRFLOW_UID=$(id -u)" > .env
cat .env.example >> .env

# Create initial Airflow directories with proper ownership
sudo chown -R $(id -u):$(id -g) airflow/

# Initialize Airflow database
echo "🗄️ Initializing Airflow database..."
docker-compose up airflow-init

# Create default connections and variables
echo "🔗 Setting up Airflow connections..."
# This will be done through the Airflow UI or CLI after startup

# Pull required Docker images
echo "📦 Pulling Docker images..."
docker-compose pull

echo "✅ Initialization complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure your environment variables"
echo "2. Run 'docker-compose up -d' to start the pipeline"
echo "3. Access Airflow UI at http://localhost:8080"
echo "4. Access Grafana at http://localhost:3000"
echo ""
echo "Default credentials:"
echo "- Airflow: admin/admin"
echo "- Grafana: admin/admin"