# Enhanced Pipeline Deployment Guide

## Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **PostgreSQL**: 12 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended for large datasets)
- **Storage**: 10GB free space for caching and processing
- **Network**: Internet access for processor rankings scraping

### Dependencies

```bash
# Core dependencies
pip install pandas numpy psycopg2-binary python-slugify

# Optional dependencies for processor rankings
pip install selenium webdriver-manager

# Testing dependencies
pip install pytest pytest-mock psutil

# Airflow (if using DAG integration)
pip install apache-airflow
```

## Installation

### 1. Clone and Setup

```bash
# Navigate to pipeline directory
cd pipeline

# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 2. Database Setup

#### Run Migrations

```bash
# Apply database migrations in order
psql -d your_database -f database/migrations/001_create_processor_rankings.sql
psql -d your_database -f database/migrations/002_add_derived_columns_to_phones.sql
psql -d your_database -f database/migrations/003_create_performance_indexes.sql
```

#### Verify Schema

```sql
-- Check that new tables exist
\dt processor_rankings

-- Check that new columns were added to phones table
\d phones

-- Verify indexes were created
\di
```

### 3. Configuration

#### Environment Variables

Create `.env` file:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/mobile_db

# Pipeline Configuration
PIPELINE_BATCH_SIZE=500
PIPELINE_QUALITY_THRESHOLD=0.80
PIPELINE_MAX_RETRIES=3

# Processor Rankings Configuration
PROCESSOR_RANKINGS_CACHE_DAYS=7
PROCESSOR_RANKINGS_MAX_PAGES=10

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=pipeline.log

# Performance Configuration
MAX_WORKERS=4
MEMORY_LIMIT_MB=2048
```

#### Airflow Configuration (if using)

Update `airflow/dags/main_pipeline_dag.py`:

```python
# Service URLs
PROCESSOR_URL = os.getenv('PIPELINE_PROCESSOR_URL', 'http://processor-service:8001')

# Pipeline configuration
PIPELINE_CONFIG = {
    'processor': {
        'timeout': 600,
        'batch_size': 1000,
        'quality_threshold': 0.95,
    }
}
```

## Deployment Options

### Option 1: Standalone Deployment

#### Direct Python Execution

```bash
# Run complete pipeline
python -c "
from services.processor.data_cleaner import DataCleaner
from services.processor.feature_engineer import FeatureEngineer
from services.processor.data_quality_validator import DataQualityValidator
from services.processor.database_updater import DatabaseUpdater
import pandas as pd

# Load your data
df = pd.read_csv('your_data.csv')

# Process
cleaner = DataCleaner()
cleaned_df, issues = cleaner.clean_dataframe(df)

engineer = FeatureEngineer()
processed_df = engineer.engineer_features(cleaned_df)

validator = DataQualityValidator()
passed, report = validator.validate_pipeline_data(processed_df)

updater = DatabaseUpdater()
success, results = updater.update_with_transaction(processed_df)

print(f'Processing complete: {success}')
"
```

#### Batch Script

Create `run_pipeline.py`:

```python
#!/usr/bin/env python3
"""
Enhanced Pipeline Runner
"""

import sys
import os
import pandas as pd
import logging
from datetime import datetime

# Add services to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'processor'))

from data_cleaner import DataCleaner
from feature_engineer import FeatureEngineer
from data_quality_validator import DataQualityValidator
from database_updater import DatabaseUpdater

def main():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    try:
        # Load data from database or CSV
        logger.info("Loading raw data...")
        # Your data loading logic here

        # Process data
        logger.info("Starting enhanced pipeline processing...")

        cleaner = DataCleaner()
        cleaned_df, issues = cleaner.clean_dataframe(raw_df)
        logger.info(f"Data cleaning completed: {len(issues)} issues")

        engineer = FeatureEngineer()
        processed_df = engineer.engineer_features(cleaned_df)
        logger.info(f"Feature engineering completed: {len(processed_df.columns)} columns")

        validator = DataQualityValidator()
        validation_passed, quality_report = validator.validate_pipeline_data(processed_df)
        logger.info(f"Quality validation: {'PASSED' if validation_passed else 'FAILED'}")

        if validation_passed:
            updater = DatabaseUpdater()
            success, results = updater.update_with_transaction(processed_df)
            logger.info(f"Database update: {'SUCCESS' if success else 'FAILED'}")
        else:
            logger.warning("Skipping database update due to quality issues")

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

Run with:

```bash
python run_pipeline.py
```

### Option 2: Airflow Integration

#### Setup Airflow

```bash
# Initialize Airflow
cd airflow
export AIRFLOW_HOME=$(pwd)
airflow db init

# Create admin user
airflow users create \
    --username admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@example.com

# Start Airflow
airflow webserver --port 8080 &
airflow scheduler &
```

#### Deploy DAG

```bash
# Copy DAG to Airflow
cp dags/main_pipeline_dag.py $AIRFLOW_HOME/dags/

# Verify DAG is loaded
airflow dags list | grep main_data_pipeline
```

#### Trigger Pipeline

```bash
# Manual trigger
airflow dags trigger main_data_pipeline

# Schedule trigger (configured in DAG)
# Runs daily at 2 AM Bangladesh time
```

### Option 3: Docker Deployment

#### Create Dockerfile

```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome for Selenium (processor rankings)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV LOG_LEVEL=INFO

# Run pipeline
CMD ["python", "run_pipeline.py"]
```

#### Docker Compose

```yaml
version: "3.8"

services:
  pipeline-processor:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mobile_db
      - PIPELINE_BATCH_SIZE=500
      - LOG_LEVEL=INFO
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs
      - ./cache:/app/cache

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=mobile_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
```

Run with:

```bash
docker-compose up -d
```

## Monitoring Setup

### Logging Configuration

```python
import logging
import logging.handlers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pipeline.log'),
        logging.StreamHandler()
    ]
)

# Rotate logs
handler = logging.handlers.RotatingFileHandler(
    'pipeline.log', maxBytes=10*1024*1024, backupCount=5
)
```

### Health Checks

Create `health_check.py`:

```python
#!/usr/bin/env python3
"""
Pipeline Health Check
"""

import sys
import os
import psycopg2
from datetime import datetime, timedelta

def check_database_connection():
    """Check database connectivity."""
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        conn.close()
        return True
    except Exception as e:
        print(f"Database check failed: {e}")
        return False

def check_processor_rankings_cache():
    """Check processor rankings cache freshness."""
    try:
        cache_file = 'processor_rankings_cache.csv'
        if os.path.exists(cache_file):
            cache_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))
            if cache_age < timedelta(days=7):
                return True
        print("Processor rankings cache is stale or missing")
        return False
    except Exception as e:
        print(f"Cache check failed: {e}")
        return False

def main():
    """Run all health checks."""
    checks = [
        ("Database Connection", check_database_connection),
        ("Processor Rankings Cache", check_processor_rankings_cache),
    ]

    all_passed = True
    for name, check_func in checks:
        passed = check_func()
        status = "PASS" if passed else "FAIL"
        print(f"{name}: {status}")
        if not passed:
            all_passed = False

    if all_passed:
        print("All health checks passed")
        sys.exit(0)
    else:
        print("Some health checks failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

### Monitoring Script

Create `monitor_pipeline.py`:

```python
#!/usr/bin/env python3
"""
Pipeline Monitoring
"""

import psycopg2
import os
from datetime import datetime, timedelta

def get_pipeline_stats():
    """Get pipeline execution statistics."""
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()

    # Recent pipeline runs
    cursor.execute("""
        SELECT COUNT(*), AVG(quality_score), MAX(completed_at)
        FROM pipeline_runs
        WHERE completed_at > NOW() - INTERVAL '24 hours'
    """)

    recent_runs, avg_quality, last_run = cursor.fetchone()

    # Data quality metrics
    cursor.execute("""
        SELECT
            COUNT(*) as total_phones,
            AVG(data_quality_score) as avg_quality,
            COUNT(*) FILTER (WHERE overall_device_score IS NOT NULL) as scored_phones
        FROM phones
        WHERE is_pipeline_managed = true
    """)

    total_phones, avg_data_quality, scored_phones = cursor.fetchone()

    conn.close()

    return {
        'recent_runs': recent_runs or 0,
        'avg_quality': float(avg_quality or 0),
        'last_run': last_run,
        'total_phones': total_phones or 0,
        'avg_data_quality': float(avg_data_quality or 0),
        'scored_phones': scored_phones or 0
    }

def main():
    stats = get_pipeline_stats()

    print("Pipeline Statistics (Last 24 hours):")
    print(f"  Recent runs: {stats['recent_runs']}")
    print(f"  Average quality: {stats['avg_quality']:.2f}")
    print(f"  Last run: {stats['last_run']}")
    print(f"  Total managed phones: {stats['total_phones']}")
    print(f"  Phones with scores: {stats['scored_phones']}")
    print(f"  Average data quality: {stats['avg_data_quality']:.2f}")

    # Alerts
    if stats['avg_quality'] < 0.8:
        print("⚠️  ALERT: Average quality below threshold")

    if stats['last_run'] and (datetime.now() - stats['last_run']).days > 1:
        print("⚠️  ALERT: No recent pipeline runs")

if __name__ == "__main__":
    main()
```

## Performance Tuning

### Database Optimization

```sql
-- Analyze tables for query optimization
ANALYZE phones;
ANALYZE processor_rankings;

-- Update table statistics
UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Memory Optimization

```python
# Process in chunks for large datasets
def process_large_dataset(df, chunk_size=1000):
    results = []
    for i in range(0, len(df), chunk_size):
        chunk = df.iloc[i:i + chunk_size]
        processed_chunk = process_chunk(chunk)
        results.append(processed_chunk)

        # Clear memory
        del chunk, processed_chunk
        import gc
        gc.collect()

    return pd.concat(results, ignore_index=True)
```

### Parallel Processing

```python
import multiprocessing as mp
from functools import partial

def parallel_feature_engineering(df, n_workers=None):
    if n_workers is None:
        n_workers = mp.cpu_count()

    # Split dataframe
    chunks = np.array_split(df, n_workers)

    # Process in parallel
    with mp.Pool(n_workers) as pool:
        results = pool.map(process_chunk, chunks)

    return pd.concat(results, ignore_index=True)
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -h localhost -U postgres mobile_db > backup_$(date +%Y%m%d).sql

# Restore backup
psql -h localhost -U postgres mobile_db < backup_20240125.sql
```

### Cache Backup

```bash
# Backup processor rankings cache
cp processor_rankings_cache.csv processor_rankings_backup_$(date +%Y%m%d).csv

# Restore cache
cp processor_rankings_backup_20240125.csv processor_rankings_cache.csv
```

## Troubleshooting

### Common Issues

1. **Selenium/Chrome Issues**

   ```bash
   # Install Chrome dependencies
   apt-get update
   apt-get install -y wget gnupg
   wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
   ```

2. **Memory Issues**

   ```python
   # Reduce batch size
   PIPELINE_BATCH_SIZE=250

   # Use chunked processing
   process_in_chunks(df, chunk_size=500)
   ```

3. **Database Connection Issues**

   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1"

   # Check connection limits
   psql $DATABASE_URL -c "SHOW max_connections"
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with verbose output
python run_pipeline.py --verbose
```

## Security Considerations

### Database Security

- Use connection pooling
- Implement proper user permissions
- Enable SSL connections
- Regular security updates

### Environment Variables

```bash
# Use secure environment variable management
export DATABASE_URL="postgresql://user:$(cat /secrets/db_password)@host:port/db"
```

### Network Security

- Restrict database access to pipeline servers only
- Use VPN for remote access
- Implement firewall rules

## Maintenance

### Regular Tasks

1. **Weekly**:

   - Check processor rankings cache freshness
   - Review pipeline execution logs
   - Monitor database performance

2. **Monthly**:

   - Update processor rankings manually if needed
   - Review and optimize database indexes
   - Clean up old log files

3. **Quarterly**:
   - Review and update dependencies
   - Performance testing with large datasets
   - Security audit

### Maintenance Scripts

Create `maintenance.py`:

```python
#!/usr/bin/env python3
"""
Pipeline Maintenance Tasks
"""

import os
import psycopg2
from datetime import datetime, timedelta

def cleanup_old_logs():
    """Remove log files older than 30 days."""
    log_dir = 'logs'
    cutoff = datetime.now() - timedelta(days=30)

    for filename in os.listdir(log_dir):
        filepath = os.path.join(log_dir, filename)
        if os.path.getmtime(filepath) < cutoff.timestamp():
            os.remove(filepath)
            print(f"Removed old log: {filename}")

def refresh_processor_rankings():
    """Force refresh of processor rankings cache."""
    from processor_rankings_service import ProcessorRankingsService

    service = ProcessorRankingsService()
    df = service.get_or_refresh_rankings(force_refresh=True)
    print(f"Refreshed processor rankings: {len(df)} processors")

def vacuum_database():
    """Run database maintenance."""
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    conn.autocommit = True
    cursor = conn.cursor()

    cursor.execute("VACUUM ANALYZE phones")
    cursor.execute("VACUUM ANALYZE processor_rankings")

    conn.close()
    print("Database vacuum completed")

if __name__ == "__main__":
    cleanup_old_logs()
    refresh_processor_rankings()
    vacuum_database()
```

Run maintenance:

```bash
python maintenance.py
```
