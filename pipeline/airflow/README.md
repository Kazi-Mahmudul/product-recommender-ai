# Airflow Data Pipeline Orchestration

This directory contains the Apache Airflow setup for orchestrating the data pipeline automation system.

## Overview

Apache Airflow is used as the workflow orchestration engine to:
- Schedule and monitor data scraping tasks
- Coordinate data processing workflows
- Manage database synchronization
- Handle error recovery and retries
- Provide monitoring and alerting

## Architecture

The Airflow setup includes:
- **Webserver**: Web UI for monitoring and managing workflows
- **Scheduler**: Core component that schedules and triggers tasks
- **Worker**: Executes tasks using Celery executor
- **PostgreSQL**: Metadata database for Airflow
- **Redis**: Message broker for Celery
- **StatsD Exporter**: Prometheus metrics collection

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 8080, 5433, 6379, 9102 available

### Starting Airflow

**Linux/macOS:**
```bash
cd pipeline/airflow
chmod +x start-airflow.sh
./start-airflow.sh
```

**Windows:**
```cmd
cd pipeline\airflow
start-airflow.bat
```

### Accessing Airflow

- **Web UI**: http://localhost:8080
- **Username**: admin
- **Password**: admin123

## Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Airflow Admin Credentials
AIRFLOW_ADMIN_USER=admin
AIRFLOW_ADMIN_PASSWORD=admin123

# Database Configuration
DATABASE_URL=postgresql://pipeline_user:pipeline_pass@localhost:5432/pipeline_db

# Service URLs
PIPELINE_SCRAPER_URL=http://scraper-service:8000
PIPELINE_PROCESSOR_URL=http://processor-service:8001
PIPELINE_SYNC_URL=http://sync-service:8002

# Performance Settings
AIRFLOW_PARALLELISM=32
AIRFLOW_MAX_ACTIVE_TASKS_PER_DAG=16
AIRFLOW_WORKER_CONCURRENCY=16
```

### Airflow Configuration

The main configuration is in `config/airflow.cfg`. Key settings:

- **Executor**: CeleryExecutor for distributed task execution
- **Database**: PostgreSQL for metadata storage
- **Broker**: Redis for Celery message passing
- **Parallelism**: 32 concurrent tasks
- **Logging**: Structured logging with retention

## Directory Structure

```
pipeline/airflow/
├── docker-compose.yml      # Docker services definition
├── config/
│   ├── airflow.cfg        # Main Airflow configuration
│   └── statsd_mapping.yml # Prometheus metrics mapping
├── dags/                  # Airflow DAGs (created at runtime)
├── logs/                  # Airflow logs (created at runtime)
├── plugins/               # Custom Airflow plugins
├── data/                  # Shared data directory
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── start-airflow.sh       # Linux/macOS startup script
├── start-airflow.bat      # Windows startup script
└── README.md             # This file
```

## Services

### Core Airflow Services

1. **airflow-webserver**: Web interface (port 8080)
2. **airflow-scheduler**: Task scheduler
3. **airflow-worker**: Task executor
4. **airflow-triggerer**: Handles deferrable operators

### Supporting Services

1. **postgres**: Airflow metadata database (port 5433)
2. **redis**: Celery message broker
3. **statsd-exporter**: Prometheus metrics (port 9102)

## Monitoring

### Metrics Collection

Airflow metrics are collected via StatsD and exposed for Prometheus:
- Task execution times
- Success/failure rates
- Queue depths
- Worker utilization

Access metrics at: http://localhost:9102/metrics

### Health Checks

All services include health checks:
- Webserver: HTTP health endpoint
- Scheduler: Job status check
- Worker: Celery ping check
- Database: Connection test

## Common Operations

### Managing Services

```bash
# View service status
docker-compose ps

# View logs
docker-compose logs -f airflow-webserver
docker-compose logs -f airflow-scheduler

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Airflow CLI

```bash
# Access Airflow CLI
docker-compose run --rm airflow-cli bash

# List DAGs
docker-compose exec airflow-scheduler airflow dags list

# Trigger a DAG
docker-compose exec airflow-scheduler airflow dags trigger <dag_id>

# View task status
docker-compose exec airflow-scheduler airflow tasks list <dag_id>
```

### Database Operations

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U airflow -d airflow

# Backup database
docker-compose exec postgres pg_dump -U airflow airflow > airflow_backup.sql

# Restore database
docker-compose exec -T postgres psql -U airflow airflow < airflow_backup.sql
```

## Development

### Adding Custom Dependencies

Add Python packages to `requirements.txt` and rebuild:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Custom Plugins

Place custom plugins in the `plugins/` directory. They will be automatically loaded by Airflow.

### DAG Development

DAGs will be created in the `dags/` directory as part of the pipeline implementation. They will include:
- Data scraping workflows
- Processing pipelines
- Synchronization tasks
- Monitoring and alerting

## Troubleshooting

### Common Issues

1. **Services won't start**
   - Check Docker is running
   - Verify port availability
   - Check logs: `docker-compose logs`

2. **Permission errors (Linux/macOS)**
   - Ensure proper ownership: `sudo chown -R 50000:0 dags logs plugins`

3. **Database connection errors**
   - Verify PostgreSQL is running
   - Check connection string in `.env`

4. **Memory issues**
   - Ensure at least 4GB RAM available
   - Reduce worker concurrency if needed

### Log Locations

- Airflow logs: `./logs/`
- Docker logs: `docker-compose logs [service]`
- Database logs: `docker-compose logs postgres`

### Performance Tuning

Adjust these settings in `.env` based on your system:

```bash
# Reduce for lower-spec systems
AIRFLOW_PARALLELISM=16
AIRFLOW_MAX_ACTIVE_TASKS_PER_DAG=8
AIRFLOW_WORKER_CONCURRENCY=8

# Increase for high-spec systems
AIRFLOW_PARALLELISM=64
AIRFLOW_MAX_ACTIVE_TASKS_PER_DAG=32
AIRFLOW_WORKER_CONCURRENCY=32
```

## Security Considerations

- Change default admin password in production
- Use proper SSL certificates for HTTPS
- Configure proper authentication backends
- Secure database connections
- Regular security updates

## Next Steps

After Airflow is running:
1. Create DAGs for pipeline workflows (Task 5.2)
2. Implement monitoring and alerting
3. Set up backup and recovery procedures
4. Configure production security settings