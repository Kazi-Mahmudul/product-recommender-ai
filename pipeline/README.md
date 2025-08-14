# Data Pipeline System

A comprehensive, production-ready data pipeline system with monitoring, alerting, and orchestration capabilities.

## 🚀 Quick Start (Recommended)

The fastest way to get the pipeline running with your existing configuration:

### Prerequisites
- **Docker Desktop** installed and running
- **8GB+ RAM** available
- **10GB+ disk space** free

### Option 1: One-Command Setup

**Windows:**
```cmd
cd pipeline
quick-start.bat
```

**Linux/macOS:**
```bash
cd pipeline
chmod +x quick-start.sh
./quick-start.sh
```

### Option 2: Full Setup (More Control)

**Windows:**
```cmd
cd pipeline
setup-pipeline.bat
```

**Linux/macOS:**
```bash
cd pipeline
chmod +x setup-pipeline.sh
./setup-pipeline.sh
```

## 📊 Access Your Pipeline

After setup completes (5-10 minutes), access:

- **Airflow Web UI**: http://localhost:8080 (admin/admin123)
- **Grafana Dashboard**: http://localhost:3000 (admin/admin123)  
- **Prometheus Metrics**: http://localhost:9090

## 🔧 What's Included

### Core Services
- **Apache Airflow**: Workflow orchestration and scheduling
- **PostgreSQL**: Metadata storage for Airflow
- **Redis**: Message broker for distributed processing

### Monitoring Stack
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notifications

### Pipeline Services (Placeholders - Ready for Implementation)
- **Scraper Service**: Data extraction (Port 8000)
- **Processor Service**: Data processing and feature engineering (Port 8001)
- **Sync Service**: Database synchronization (Port 8002)
- **Trigger API**: Pipeline trigger management (Port 5000)
- **Alerting Service**: Multi-channel notifications (Port 8004)
- **Logging Service**: Centralized logging (Port 8003)

## 🛠️ Configuration

The quick-start uses your existing configuration:
- **Database**: Your Supabase PostgreSQL database
- **Email**: Your Gmail SMTP configuration (epick162@gmail.com)
- **APIs**: Your existing Google API key and Gemini service

## 📋 Common Commands

```bash
# View all services status
docker-compose -f docker-compose.master.yml ps

# View logs for a specific service
docker-compose -f docker-compose.master.yml logs -f airflow-webserver

# Stop all services
docker-compose -f docker-compose.master.yml down

# Restart all services
docker-compose -f docker-compose.master.yml restart

# Start services
docker-compose -f docker-compose.master.yml up -d
```

## 🔍 Troubleshooting

### Services Won't Start
```bash
# Check Docker is running
docker --version
docker info

# Check available resources
docker system df
docker system prune  # Clean up if needed
```

### Port Conflicts
```bash
# Windows: Check what's using a port
netstat -an | findstr :8080

# Linux/macOS: Check what's using a port
netstat -tulpn | grep :8080
```

### View Service Logs
```bash
# View logs for specific service
docker-compose -f docker-compose.master.yml logs -f [service-name]

# View all logs
docker-compose -f docker-compose.master.yml logs
```

## 📁 Project Structure

```
pipeline/
├── airflow/                 # Airflow configuration and DAGs
│   ├── dags/               # Workflow definitions
│   ├── logs/               # Airflow logs
│   └── plugins/            # Custom plugins
├── monitoring/             # Monitoring stack configuration
│   ├── prometheus/         # Prometheus config and rules
│   ├── grafana/           # Grafana dashboards and provisioning
│   └── alertmanager/      # Alert routing configuration
├── services/              # Pipeline service implementations
├── logs/                  # Application logs
├── data/                  # Pipeline data storage
├── docker-compose.master.yml  # Complete service orchestration
├── .env                   # Environment configuration
├── quick-start.sh/.bat    # Quick setup scripts
└── setup-pipeline.sh/.bat # Full setup scripts
```

## 🔄 Next Steps

1. **Verify Installation**: Check that all services are running at the URLs above
2. **Explore Airflow**: Navigate to http://localhost:8080 to see the workflow interface
3. **Check Monitoring**: Visit http://localhost:3000 for Grafana dashboards
4. **Review Configuration**: Edit `.env` file for any custom settings
5. **Implement Services**: The pipeline services are ready for your implementation

## 📚 Documentation

- **SETUP_GUIDE.md**: Detailed setup instructions and troubleshooting
- **airflow/README.md**: Airflow-specific configuration and usage
- **monitoring/README.md**: Monitoring stack documentation
- **services/**: Individual service documentation

## 🆘 Getting Help

1. **Check service logs**: `docker-compose -f docker-compose.master.yml logs [service-name]`
2. **Verify service health**: Visit the health endpoints listed above
3. **Review the SETUP_GUIDE.md**: Comprehensive troubleshooting guide
4. **Check Docker resources**: Ensure adequate memory and disk space

## 🔒 Security Notes

- Default passwords are set for development
- Change all passwords in production
- API tokens are set to development values
- Review `.env` file for security settings

## 🎯 Production Deployment

For production use:
1. Change all default passwords and API tokens
2. Enable SSL/HTTPS for web interfaces
3. Configure proper backup strategies
4. Set up external monitoring and alerting
5. Review security configurations

---

**Your data pipeline is now ready to use with your existing database and email configuration!**