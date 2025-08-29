from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import json
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.api import api_router
from app.core.config import settings
from app.core.database import get_db
from app.core.logging_config import setup_logging, get_logger
from app.middleware.security import HTTPSRedirectMiddleware, SecurityHeadersMiddleware
from app.middleware.logging import RequestLoggingMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.tasks import cleanup_expired_sessions

# Load environment variables from .env file
load_dotenv(dotenv_path=".env")

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Log startup information
logger.info("Starting application...")
logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'Not set')}")
logger.info(f"Port: {os.getenv('PORT', 'Not set')}")

# Validate critical configuration
def validate_configuration():
    """Validate critical configuration settings"""
    issues = []
    
    # Check database URL
    if not settings.DATABASE_URL or settings.DATABASE_URL == "postgresql://user:password@localhost/pickbd":
        issues.append("DATABASE_URL is not properly configured")
    
    # Check Gemini service URL
    if not settings.GEMINI_SERVICE_URL or "localhost" in settings.GEMINI_SERVICE_URL:
        if os.getenv("ENVIRONMENT") == "production":
            issues.append("GEMINI_SERVICE_URL should use production URL in production environment")
    
    # Check CORS origins
    if not settings.CORS_ORIGINS:
        issues.append("CORS_ORIGINS is not configured")
    elif os.getenv("ENVIRONMENT") == "production":
        # Ensure no localhost origins in production
        localhost_origins = [origin for origin in settings.CORS_ORIGINS if "localhost" in origin]
        if localhost_origins:
            logger.warning(f"Localhost origins found in production CORS config: {localhost_origins}")
    
    # Check secret key
    if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-change-in-production":
        issues.append("SECRET_KEY is not properly configured for production")
    
    # Check Google API key
    if not os.getenv("GOOGLE_API_KEY"):
        issues.append("GOOGLE_API_KEY is not set")
    
    if issues:
        logger.error("Configuration validation failed:")
        for issue in issues:
            logger.error(f"  - {issue}")
        if os.getenv("ENVIRONMENT") == "production":
            logger.error("Critical configuration issues found in production!")
    else:
        logger.info("Configuration validation passed")

# Validate configuration on startup
validate_configuration()

# Try to import and initialize database
try:
    from app.core.database import engine
    logger.info("Database engine initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database engine: {e}")
    # We'll continue anyway as the app might still be able to start

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    # Configure to handle trailing slashes consistently
    redirect_slashes=True,
)

# Initialize scheduler
scheduler = BackgroundScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up application...")
    logger.info(f"PORT environment variable: {os.getenv('PORT')}")
    logger.info(f"ENVIRONMENT: {os.getenv('ENVIRONMENT')}")
    
    # Validate database schema on startup
    try:
        from app.crud.phone import validate_database_schema
        from app.core.database import get_db
        
        # Get a database session for validation
        db_gen = get_db()
        db = next(db_gen)
        
        logger.info("Validating database schema...")
        schema_report = validate_database_schema(db)
        
        if schema_report.get('schema_validation_passed', False):
            logger.info("✅ Database schema validation passed")
        else:
            logger.warning("⚠️ Database schema validation found issues")
            for recommendation in schema_report.get('recommendations', []):
                logger.warning(f"   - {recommendation}")
        
        # Close the database session
        db.close()
        
    except Exception as e:
        logger.error(f"Failed to validate database schema: {e}")
    
    try:
        # Try to start the scheduler
        scheduler.add_job(cleanup_expired_sessions, "interval", hours=1)  # Run every hour
        scheduler.start()
        logger.info("Scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
    
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application...")
    scheduler.shutdown()
    logger.info("Application shutdown complete")

# Set up CORS middleware with production settings (must be added before other middleware)
cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS and "*" not in settings.CORS_ORIGINS else ["*"]
logger.info(f"CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language", 
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "X-Session-Id",
        "Cache-Control",
        "Pragma",
        "Expires",
        "If-None-Match",
        "If-Modified-Since"
    ],
    expose_headers=[
        "Content-Range", 
        "X-Total-Count",
        "Cache-Control",
        "ETag",
        "Last-Modified",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials"
    ],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Add other middleware in correct order (last added = first executed)
app.add_middleware(RequestLoggingMiddleware)  # Add request logging
app.add_middleware(HTTPSRedirectMiddleware)  # Add HTTPS redirect middleware early
app.add_middleware(SecurityHeadersMiddleware)  # Add security headers middleware

# Remove the catch-all OPTIONS handler as it's interfering with normal routes
# CORS preflight requests will be handled by the CORSMiddleware

# Include API router
app.include_router(api_router, prefix=settings.API_PREFIX)

# Health check endpoint for GCP Cloud Run
@app.get("/health")
@app.get("/api/v1/health")
async def health_check(request: Request):
    """
    Enhanced health check endpoint for GCP Cloud Run.
    Returns detailed status of all service dependencies.
    """
    health_status = "healthy"
    services = {}
    
    # Check database connection
    try:
        from app.core.database import engine, current_db_type
        if current_db_type != "dummy":
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                # Test if phones table exists and has data
                result = conn.execute(text("SELECT COUNT(*) FROM phones LIMIT 1"))
                phone_count = result.scalar()
                services["database"] = {
                    "status": "healthy",
                    "type": current_db_type,
                    "phone_count": phone_count
                }
        else:
            services["database"] = {
                "status": "dummy",
                "type": "dummy",
                "message": "Using dummy database in production fallback"
            }
            if os.getenv("ENVIRONMENT") == "production":
                health_status = "degraded"
    except Exception as e:
        services["database"] = {
            "status": "error",
            "error": str(e)
        }
        health_status = "degraded" if os.getenv("ENVIRONMENT") == "production" else "unhealthy"
    
    # Check AI service connection
    try:
        import httpx
        ai_service_url = settings.GEMINI_SERVICE_URL_SECURE
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{ai_service_url}/health")
            if response.status_code == 200:
                services["ai_service"] = {
                    "status": "healthy",
                    "url": ai_service_url,
                    "response_time": response.elapsed.total_seconds()
                }
            else:
                services["ai_service"] = {
                    "status": "error",
                    "url": ai_service_url,
                    "status_code": response.status_code
                }
                health_status = "degraded"
    except Exception as e:
        services["ai_service"] = {
            "status": "error",
            "url": settings.GEMINI_SERVICE_URL_SECURE,
            "error": str(e)
        }
        health_status = "degraded"
    
    # Check HTTPS configuration
    https_status = {
        "scheme": str(request.url.scheme),
        "is_https": request.url.scheme == "https",
        "forwarded_proto": request.headers.get("x-forwarded-proto"),
        "host": str(request.url.hostname),
        "port": request.url.port
    }
    
    # Check if running behind a proxy (like Google Cloud Run)
    is_behind_proxy = bool(request.headers.get("x-forwarded-for") or 
                          request.headers.get("x-forwarded-proto"))
    
    # Overall health determination
    if health_status == "healthy":
        status_code = 200
    elif health_status == "degraded":
        status_code = 200  # Still return 200 for degraded but functional
    else:
        status_code = 503
    
    response_data = {
        "status": health_status,
        "timestamp": time.time(),
        "services": services,
        "https": https_status,
        "behind_proxy": is_behind_proxy,
        "port": os.getenv("PORT", "Not set"),
        "environment": os.getenv("ENVIRONMENT", "Not set"),
        "cors_origins": settings.CORS_ORIGINS
    }
    
    return Response(
        content=json.dumps(response_data),
        status_code=status_code,
        media_type="application/json"
    )

@app.get("/")
def root():
    """
    Root endpoint - can be used as a health check
    """
    return {
        "status": "ok",
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.PROJECT_VERSION,
        "docs": f"{settings.API_PREFIX}/docs",
        "port": os.getenv("PORT", "Not set")
    }

@app.get("/startup-test")
def startup_test():
    """
    Simple test endpoint to verify the application is running
    """
    return {"status": "ok", "message": "Application is running correctly", "port": os.getenv("PORT", "Not set")}

@app.get(f"{settings.API_PREFIX}/test-db")
async def test_db_connection(db: Session = Depends(get_db)):
    """
    Test database connection and table structure
    """
    try:
        # Test connection
        db.execute(text("SELECT 1"))
        
        # Check if phones table exists and has data
        result = db.execute(text("SELECT COUNT(*) FROM phones"))
        count = result.scalar()
        
        # Get all column names with their details
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable, 
                   character_maximum_length, column_default
            FROM information_schema.columns 
            WHERE table_name = 'phones'
            ORDER BY ordinal_position
        """))
        columns = [dict(row) for row in result.mappings()]
        
        # Get the actual column names for verification
        column_names = [col['column_name'] for col in columns]
        
        return {
            "status": "success",
            "table_exists": True,
            "row_count": count,
            "columns": columns,  # Show all columns
            "column_names": column_names,  # Just the names for easy checking
            "total_columns": len(columns)
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "table_exists": False
        }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get port from environment variable or default to 8080
    port = int(os.getenv("PORT", 8080))
    
    # Check if running in production environment
    if os.getenv("ENVIRONMENT") == "production":
        # Use a simpler configuration for production
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            workers=4,  # Use multiple workers in production
            log_level="info",
        )
    else:
        # Development configuration with reload
        uvicorn.run(
            "app.main:app",
            host=os.getenv("HOST", "0.0.0.0"),
            port=port,
            workers=int(os.getenv("WORKERS", 1)),
            reload=settings.DEBUG,
            log_level=settings.LOG_LEVEL.lower(),
            access_log=settings.DEBUG
        )