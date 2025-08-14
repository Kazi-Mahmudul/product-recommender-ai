@echo off
REM Quick Start Script for Windows - Uses your existing configuration

echo.
echo 🚀 Data Pipeline Quick Start
echo ============================
echo.

REM Create .env file with your existing configuration
echo [INFO] Creating .env file with your existing configuration...

(
echo # Environment
echo ENVIRONMENT=development
echo DEBUG=true
echo.
echo # Database Configuration ^(using your existing Supabase database^)
echo DATABASE_URL=postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
echo LOCAL_DATABASE_URL=postgresql://product_user1:secure_password@localhost:5432/product_recommender
echo REDIS_URL=redis://localhost:6379/0
echo.
echo # API Configuration
echo API_V1_STR=/api/v1
echo PROJECT_NAME=Data Pipeline API
echo BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:8000","http://localhost:8080","https://pickbd.vercel.app"]
echo.
echo # Security ^(using your existing keys^)
echo SECRET_KEY=nV4YqR7z2KEtGgBdSpxfW5MCUyZ8jNo6rLaO1XcQHbvT9ImPFe
echo ACCESS_TOKEN_EXPIRE_MINUTES=30
echo PIPELINE_API_TOKEN=pipeline-secure-token-2024
echo ALERTING_API_TOKEN=alerting-secure-token-2024
echo.
echo # External APIs ^(using your existing^)
echo GOOGLE_API_KEY=AIzaSyB8jkbWPynTNc7fvqFUJyWeLxQigF27OKw
echo GEMINI_SERVICE_URL=https://gemini-api-wm3b.onrender.com
echo.
echo # Airflow Configuration
echo AIRFLOW_UID=50000
echo AIRFLOW_ADMIN_USER=admin
echo AIRFLOW_ADMIN_PASSWORD=admin123
echo AIRFLOW_FERNET_KEY=YlCImzjge_TeZc7jPJ7Jz2pgOtb4yTssA1pVyqIADWg=
echo.
echo # Email Configuration ^(using your existing Gmail config^)
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_USER=epick162@gmail.com
echo SMTP_PASSWORD=vrjsdectaefjftvm
echo SMTP_FROM_EMAIL=epick162@gmail.com
echo SMTP_USE_TLS=true
echo ALERT_EMAIL_RECIPIENTS=epick162@gmail.com
echo.
echo # Monitoring Configuration
echo PROMETHEUS_ENABLED=true
echo GRAFANA_ENABLED=true
echo GRAFANA_ADMIN_USER=admin
echo GRAFANA_ADMIN_PASSWORD=admin123
echo.
echo # Logging Configuration
echo LOG_LEVEL=INFO
echo LOG_FORMAT=json
echo.
echo # Pipeline Configuration
echo SCRAPER_RATE_LIMIT=1.0
echo PROCESSOR_BATCH_SIZE=1000
echo SYNC_BATCH_SIZE=500
echo.
echo # Feature Flags
echo CONTEXTUAL_API_ENABLED=true
) > .env

echo [SUCCESS] .env file created with your existing configuration

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "backups" mkdir backups
if not exist "airflow\logs" mkdir airflow\logs
if not exist "airflow\plugins" mkdir airflow\plugins
if not exist "monitoring\data" mkdir monitoring\data

echo [SUCCESS] Directories created

REM Start the pipeline
echo [INFO] Starting the data pipeline...
echo [INFO] This will take a few minutes on first run...

REM Start services
docker-compose -f docker-compose.master.yml up -d

echo [INFO] Waiting for services to start...
timeout /t 90 /nobreak >nul

REM Show status
echo [INFO] Checking service status...
docker-compose -f docker-compose.master.yml ps

echo.
echo 🎉 Quick Start Complete!
echo =======================
echo.
echo Access your pipeline:
echo   • Airflow Web UI:    http://localhost:8080 (admin/admin123)
echo   • Grafana Dashboard: http://localhost:3000 (admin/admin123)
echo   • Prometheus:        http://localhost:9090
echo.
echo Your pipeline is now running with your existing database and email configuration!
echo.
echo To stop the pipeline:
echo   docker-compose -f docker-compose.master.yml down
echo.
echo To view logs:
echo   docker-compose -f docker-compose.master.yml logs -f [service-name]
echo.
echo [SUCCESS] Pipeline is ready to use!
echo.
echo Press any key to continue...
pause >nul