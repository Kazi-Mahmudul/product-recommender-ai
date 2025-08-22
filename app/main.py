from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import time
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.api import api_router
from app.core.config import settings
from app.core.database import get_db
from app.core.logging_config import setup_logging, get_logger
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
)

# Initialize scheduler
scheduler = BackgroundScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up application...")
    logger.info(f"PORT environment variable: {os.getenv('PORT')}")
    logger.info(f"ENVIRONMENT: {os.getenv('ENVIRONMENT')}")
    
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

# Set up CORS middleware with production settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS and "*" not in settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "X-Total-Count"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_PREFIX)

# Health check endpoint for GCP Cloud Run
@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    """
    Health check endpoint for GCP Cloud Run.
    Returns 200 OK if the service is running properly.
    """
    # Try to check database connection
    db_status = "unknown"
    try:
        from app.core.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy", 
        "timestamp": time.time(),
        "database": db_status,
        "port": os.getenv("PORT", "Not set")
    }

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