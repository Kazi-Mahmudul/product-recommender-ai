#!/bin/bash

# Quick Start Script - Uses your existing configuration
# This script sets up the pipeline with minimal configuration needed

set -e

echo "🚀 Data Pipeline Quick Start"
echo "============================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Change to script directory
cd "$(dirname "$0")"

# Create .env file with your existing configuration
print_status "Creating .env file with your existing configuration..."
cat > .env << 'EOF'
# Environment
ENVIRONMENT=development
DEBUG=true

# Database Configuration (using your existing Supabase database)
DATABASE_URL=postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
LOCAL_DATABASE_URL=postgresql://product_user1:secure_password@localhost:5432/product_recommender
REDIS_URL=redis://localhost:6379/0

# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=Data Pipeline API
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:8000","http://localhost:8080","https://pickbd.vercel.app"]

# Security (using your existing keys)
SECRET_KEY=nV4YqR7z2KEtGgBdSpxfW5MCUyZ8jNo6rLaO1XcQHbvT9ImPFe
ACCESS_TOKEN_EXPIRE_MINUTES=30
PIPELINE_API_TOKEN=pipeline-secure-token-2024
ALERTING_API_TOKEN=alerting-secure-token-2024

# External APIs (using your existing)
GOOGLE_API_KEY=AIzaSyB8jkbWPynTNc7fvqFUJyWeLxQigF27OKw
GEMINI_SERVICE_URL=https://gemini-api-wm3b.onrender.com

# Airflow Configuration
AIRFLOW_UID=50000
AIRFLOW_ADMIN_USER=admin
AIRFLOW_ADMIN_PASSWORD=admin123
AIRFLOW_FERNET_KEY=YlCImzjge_TeZc7jPJ7Jz2pgOtb4yTssA1pVyqIADWg=

# Email Configuration (using your existing Gmail config)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=epick162@gmail.com
SMTP_PASSWORD=vrjsdectaefjftvm
SMTP_FROM_EMAIL=epick162@gmail.com
SMTP_USE_TLS=true
ALERT_EMAIL_RECIPIENTS=epick162@gmail.com

# Monitoring Configuration
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=json

# Pipeline Configuration
SCRAPER_RATE_LIMIT=1.0
PROCESSOR_BATCH_SIZE=1000
SYNC_BATCH_SIZE=500

# Feature Flags
CONTEXTUAL_API_ENABLED=true
EOF

print_success ".env file created with your existing configuration"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs data backups
mkdir -p airflow/logs airflow/plugins
mkdir -p monitoring/data

# Set permissions for Linux/macOS
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    chmod -R 755 logs data backups airflow/logs airflow/plugins
    export AIRFLOW_UID=$(id -u)
    echo "AIRFLOW_UID=$AIRFLOW_UID" >> .env
fi

print_success "Directories created"

# Start the pipeline
print_status "Starting the data pipeline..."
print_status "This will take a few minutes on first run..."

# Start services
docker-compose -f docker-compose.master.yml up -d

print_status "Waiting for services to start..."
sleep 90

# Show status
print_status "Checking service status..."
docker-compose -f docker-compose.master.yml ps

echo ""
echo "🎉 Quick Start Complete!"
echo "======================="
echo ""
echo "Access your pipeline:"
echo "  • Airflow Web UI:    http://localhost:8080 (admin/admin123)"
echo "  • Grafana Dashboard: http://localhost:3000 (admin/admin123)"
echo "  • Prometheus:        http://localhost:9090"
echo ""
echo "Your pipeline is now running with your existing database and email configuration!"
echo ""
echo "To stop the pipeline:"
echo "  docker-compose -f docker-compose.master.yml down"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.master.yml logs -f [service-name]"
echo ""

print_success "Pipeline is ready to use!"