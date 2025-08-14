#!/bin/bash

# Data Pipeline Setup Script for Linux/macOS
# This script sets up and starts the complete data pipeline system

set -e

echo "🚀 Data Pipeline Setup Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check available memory
    if command_exists free; then
        AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$AVAILABLE_MEM" -lt 4096 ]; then
            print_warning "Available memory is less than 4GB. Pipeline may run slowly."
        fi
    fi
    
    # Check available disk space
    AVAILABLE_DISK=$(df . | awk 'NR==2{print $4}')
    if [ "$AVAILABLE_DISK" -lt 10485760 ]; then  # 10GB in KB
        print_warning "Available disk space is less than 10GB. Consider freeing up space."
    fi
    
    print_success "System requirements check completed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created. Please review and update the configuration."
    else
        print_status ".env file already exists"
    fi
    
    # Create necessary directories
    print_status "Creating necessary directories..."
    mkdir -p logs data backups
    mkdir -p airflow/logs airflow/plugins
    mkdir -p monitoring/data
    
    # Set proper permissions (Linux/macOS)
    if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "Setting directory permissions..."
        chmod -R 755 logs data backups
        chmod -R 755 airflow/logs airflow/plugins
        
        # Set Airflow UID
        export AIRFLOW_UID=$(id -u)
        echo "AIRFLOW_UID=$AIRFLOW_UID" >> .env
    fi
    
    print_success "Environment setup completed"
}

# Function to start services
start_services() {
    print_status "Starting pipeline services..."
    
    # Pull latest images
    print_status "Pulling Docker images..."
    docker-compose -f docker-compose.master.yml pull
    
    # Start infrastructure services first
    print_status "Starting infrastructure services (PostgreSQL, Redis)..."
    docker-compose -f docker-compose.master.yml up -d postgres redis
    
    # Wait for infrastructure to be ready
    print_status "Waiting for infrastructure services to be ready..."
    sleep 30
    
    # Start monitoring services
    print_status "Starting monitoring services (Prometheus, Grafana)..."
    docker-compose -f docker-compose.master.yml up -d prometheus grafana
    
    # Initialize Airflow
    print_status "Initializing Airflow..."
    docker-compose -f docker-compose.master.yml up airflow-init
    
    # Start Airflow services
    print_status "Starting Airflow services..."
    docker-compose -f docker-compose.master.yml up -d airflow-webserver airflow-scheduler airflow-worker
    
    # Start pipeline services
    print_status "Starting pipeline services..."
    docker-compose -f docker-compose.master.yml up -d scraper-service processor-service sync-service
    
    # Start API and alerting services
    print_status "Starting API and alerting services..."
    docker-compose -f docker-compose.master.yml up -d trigger-api alerting-service logging-service
    
    print_success "All services started successfully"
}

# Function to verify installation
verify_installation() {
    print_status "Verifying installation..."
    
    # Wait for services to be fully ready
    print_status "Waiting for services to be ready..."
    sleep 60
    
    # Check service health
    services=(
        "http://localhost:8080/health:Airflow"
        "http://localhost:3000/api/health:Grafana"
        "http://localhost:9090/-/healthy:Prometheus"
        "http://localhost:8000:Scraper Service"
        "http://localhost:8001:Processor Service"
        "http://localhost:8002:Sync Service"
        "http://localhost:5000:Trigger API"
        "http://localhost:8004:Alerting Service"
        "http://localhost:8003:Logging Service"
    )
    
    print_status "Checking service health..."
    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_warning "$name is not responding (this may be normal for placeholder services)"
        fi
    done
    
    # Show service status
    print_status "Service status:"
    docker-compose -f docker-compose.master.yml ps
}

# Function to show access information
show_access_info() {
    echo ""
    echo "🎉 Pipeline Setup Complete!"
    echo "=========================="
    echo ""
    echo "Web Interfaces:"
    echo "  • Airflow Web UI:    http://localhost:8080 (admin/admin123)"
    echo "  • Grafana Dashboard: http://localhost:3000 (admin/admin123)"
    echo "  • Prometheus:        http://localhost:9090"
    echo ""
    echo "API Endpoints:"
    echo "  • Scraper Service:   http://localhost:8000"
    echo "  • Processor Service: http://localhost:8001"
    echo "  • Sync Service:      http://localhost:8002"
    echo "  • Trigger API:       http://localhost:5000"
    echo "  • Alerting Service:  http://localhost:8004"
    echo "  • Logging Service:   http://localhost:8003"
    echo ""
    echo "Useful Commands:"
    echo "  • View logs:         docker-compose -f docker-compose.master.yml logs -f [service-name]"
    echo "  • Stop services:     docker-compose -f docker-compose.master.yml down"
    echo "  • Restart services:  docker-compose -f docker-compose.master.yml restart"
    echo "  • Service status:    docker-compose -f docker-compose.master.yml ps"
    echo ""
    echo "Next Steps:"
    echo "  1. Review and update .env file with your specific configuration"
    echo "  2. Access Airflow at http://localhost:8080 to monitor pipeline execution"
    echo "  3. Check Grafana at http://localhost:3000 for monitoring dashboards"
    echo "  4. Review the SETUP_GUIDE.md for detailed configuration options"
    echo ""
}

# Function to handle cleanup on exit
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Setup failed. Cleaning up..."
        docker-compose -f docker-compose.master.yml down
    fi
}

# Main execution
main() {
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Change to script directory
    cd "$(dirname "$0")"
    
    print_status "Starting Data Pipeline Setup..."
    
    # Run setup steps
    check_requirements
    setup_environment
    start_services
    verify_installation
    show_access_info
    
    print_success "Setup completed successfully!"
}

# Run main function
main "$@"