from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.api.api import api_router
from app.core.config import settings

# Load environment variables based on environment
env_file = ".env.production" if os.getenv("ENVIRONMENT") == "production" else ".env"
load_dotenv(dotenv_path=env_file)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
)

# Set up CORS middleware with production settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if hasattr(settings, 'CORS_ORIGINS') else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        workers=int(os.getenv("WORKERS", 1)),
        reload=settings.DEBUG
    )