from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.api import api_router
from app.core.config import settings
from app.core.database import get_db
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.tasks import cleanup_expired_sessions

# Load environment variables from .env file
load_dotenv(dotenv_path=".env")

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
    scheduler.add_job(cleanup_expired_sessions, "interval", hours=1)  # Run every hour
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

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

@app.get("/")
def root():
    """
    Root endpoint - can be used as a health check
    """
    return {
        "status": "ok",
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.PROJECT_VERSION,
        "docs": f"{settings.API_PREFIX}/docs"
    }

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
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        workers=int(os.getenv("WORKERS", 1)),
        reload=settings.DEBUG
    )