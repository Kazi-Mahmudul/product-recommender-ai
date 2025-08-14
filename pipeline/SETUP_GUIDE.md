# Data Pipeline Setup Guide

This guide will help you set up and run the complete data pipeline system from scratch.

## Prerequisites

Before starting, ensure you have the following installed on your system:

### Required Software

1. **Docker & Docker Compose**
   - **Windows**: Download Docker Desktop from https://www.docker.com/products/docker-desktop
   - **macOS**: Download Docker Desktop from https://www.docker.com/products/docker-desktop
   - **Linux**: 
     ```bash
     # Ubuntu/Debian
     sudo apt-get update
     sudo apt-get install docker.io docker-compose
     
     # CentOS/RHEL
     sudo yum install docker docker-compose
     ```

2. **Git** (if not already installed)
   - Download from https://git-scm.com/downloads

3. **Python 3.11+** (optional, for local development)
   - Download from https://www.python.org/downloads/

### System Requirements

- **RAM**: Minimum 8GB, Recommended 16GB
- **Disk Space**: At least 20GB free space
- **CPU**: 4+ cores recommended
- **Network**: Internet connection for downloading Docker images

## Quick Start (Recommended)

### Step 1: Environment Configuration

1. **Copy the environment template:**
   ```bash
   cd pipeline
   cp .env.example .env
   ```

2. **Edit the .env file** with your specific configuration:
   ```bash
   # Use your preferred text editor
   nano .env
   # or
   code .env
   # or
   notepad .env  # Windows
   ```

3. **Key variables to configure:**
   ```bash
   # Database (use existing or create new)
   DATABASE_URL=postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   
   # Email notifications (use existing Gmail config)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=epick162@gmail.com
   SMTP_PASSWORD=vrjsdectaefjftvm
   SMTP_FROM_EMAIL=epick162@gmail.com
   
   # Slack (optional - create webhook if needed)
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
   SLACK_ALERT_CHANNEL=#alerts
   
   # API Security
   PIPELINE_API_TOKEN=your-secure-api-token-here
   ALERTING_API_TOKEN=your-alerting-api-token-here
   ```

### Step 2: Start the Complete Pipeline

1. **Navigate to the pipeline directory:**
   ```bash
   cd pipeline
   ```

2. **Start all services with one command:**
   ```bash
   # Windows
   start-pipeline.bat
   
   # Linux/macOS
   chmod +x start-pipeline.sh
   ./start-pipeline.sh
   ```

   Or manually with Docker Compose:
   ```bash
   docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
   ```

3. **Wait for services to start** (this may take 5-10 minutes on first run)

### Step 3: Verify Installation

1. **Check service status:**
   ```bash
   docker-compose ps
   ```

2. **Access the web interfaces:**
   - **Airflow Web UI**: http://localhost:8080 (admin/admin123)
   - **Grafana Dashboard**: http://localhost:3000 (admin/admin123)
   - **Prometheus Metrics**: http://localhost:9090
   - **Pipeline API**: http://localhost:8000/docs

3. **Test the pipeline:**
   ```bash
   # Test scraper service
   curl http://localhost:8000/health
   
   # Test processor service
   curl http://localhost:8001/health
   
   # Test sync service
   curl http://localhost:8002/health
   
   # Test alerting service
   curl http://localhost:8004/health
   ```

## Detailed Setup Instructions

### Option 1: Full Automated Setup

I'll create a complete setup script that handles everything:

```bash
# This script will:
# 1. Check prerequisites
# 2. Create necessary directories
# 3. Set up environment variables
# 4. Start all services
# 5. Verify installation
./setup-pipeline.sh
```

### Option 2: Manual Step-by-Step Setup

#### Step 1: Prepare Environment

1. **Create necessary directories:**
   ```bash
   mkdir -p pipeline/logs
   mkdir -p pipeline/data
   mkdir -p pipeline/backups
   mkdir -p pipeline/monitoring/data
   ```

2. **Set proper permissions (Linux/macOS):**
   ```bash
   chmod -R 755 pipeline/logs
   chmod -R 755 pipeline/data
   ```

#### Step 2: Configure Services

1. **Database Setup:**
   - The pipeline will use your existing Supabase database
   - Tables will be created automatically on first run

2. **Email Configuration:**
   - Uses your existing Gmail SMTP configuration
   - Alerts will be sent to epick162@gmail.com

3. **Monitoring Setup:**
   - Prometheus will collect metrics automatically
   - Grafana dashboards will be provisioned automatically

#### Step 3: Start Services in Order

1. **Start infrastructure services:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Start monitoring stack:**
   ```bash
   docker-compose -f monitoring/docker-compose.monitoring.yml up -d
   ```

3. **Start pipeline services:**
   ```bash
   docker-compose up -d scraper-service processor-service sync-service
   ```

4. **Start orchestration:**
   ```bash
   docker-compose up -d airflow-webserver airflow-scheduler airflow-worker
   ```

5. **Start alerting:**
   ```bash
   docker-compose up -d alerting-service logging-service
   ```

## Service Access Information

Once everything is running, you can access:

### Web Interfaces
- **Airflow**: http://localhost:8080 (admin/admin123)
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### API Endpoints
- **Scraper Service**: http://localhost:8000
- **Processor Service**: http://localhost:8001
- **Sync Service**: http://localhost:8002
- **Trigger API**: http://localhost:5000
- **Alerting Service**: http://localhost:8004
- **Logging Service**: http://localhost:8003

### API Documentation
- **Scraper API Docs**: http://localhost:8000/docs
- **Processor API Docs**: http://localhost:8001/docs
- **Sync API Docs**: http://localhost:8002/docs
- **Alerting API Docs**: http://localhost:8004/docs

## Testing the Pipeline

### 1. Manual Pipeline Trigger

```bash
# Trigger a complete pipeline run
curl -X POST http://localhost:5000/api/v1/trigger/immediate \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Manual test run",
    "user": "admin"
  }'
```

### 2. Check Pipeline Status

```bash
# Check Airflow DAG status
curl http://localhost:8080/api/v1/dags/main_data_pipeline/dagRuns \
  -u admin:admin123

# Check service health
curl http://localhost:8000/health  # Scraper
curl http://localhost:8001/health  # Processor
curl http://localhost:8002/health  # Sync
```

### 3. Monitor Logs

```bash
# View service logs
docker-compose logs -f scraper-service
docker-compose logs -f processor-service
docker-compose logs -f sync-service

# View Airflow logs
docker-compose logs -f airflow-scheduler
docker-compose logs -f airflow-webserver
```

## Troubleshooting

### Common Issues

1. **Services won't start:**
   ```bash
   # Check Docker is running
   docker --version
   docker-compose --version
   
   # Check available resources
   docker system df
   docker system prune  # Clean up if needed
   ```

2. **Port conflicts:**
   ```bash
   # Check what's using ports
   netstat -tulpn | grep :8080  # Linux/macOS
   netstat -an | findstr :8080  # Windows
   
   # Stop conflicting services or change ports in docker-compose.yml
   ```

3. **Database connection issues:**
   ```bash
   # Test database connection
   docker run --rm postgres:13 psql "postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"
   ```

4. **Memory issues:**
   ```bash
   # Check Docker memory allocation
   docker stats
   
   # Increase Docker memory limit in Docker Desktop settings
   # Recommended: 8GB+ for full pipeline
   ```

### Getting Help

1. **Check service logs:**
   ```bash
   docker-compose logs [service-name]
   ```

2. **Check service health:**
   ```bash
   curl http://localhost:[port]/health
   ```

3. **Restart specific service:**
   ```bash
   docker-compose restart [service-name]
   ```

4. **Complete restart:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Next Steps

Once the pipeline is running:

1. **Configure Grafana Dashboards**: Import pre-built dashboards for monitoring
2. **Set up Slack Notifications**: Configure Slack webhook for alerts
3. **Schedule Pipeline Runs**: Configure automatic scheduling in Airflow
4. **Monitor Performance**: Use Grafana to monitor system performance
5. **Review Logs**: Check logging service for any issues

## Production Considerations

For production deployment:

1. **Security**: Change all default passwords and API tokens
2. **SSL/TLS**: Enable HTTPS for all web interfaces
3. **Backup**: Set up automated database backups
4. **Monitoring**: Configure external monitoring and alerting
5. **Scaling**: Consider horizontal scaling for high-volume data

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review service logs for error messages
3. Ensure all prerequisites are installed correctly
4. Verify environment variables are set correctly
5. Check Docker resources and system requirements