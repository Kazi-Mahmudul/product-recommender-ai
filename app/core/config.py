"""
Application configuration settings.

SECURITY NOTE: This file contains default values for development.
For production deployment, all sensitive values should be overridden
using environment variables. Never commit actual production credentials
to version control.
"""

from pydantic_settings import BaseSettings
from typing import List
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "PickBD"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/pickbd")
    LOCAL_DATABASE_URL: str = os.getenv("LOCAL_DATABASE_URL", "postgresql://user:password@localhost:5432/pickbd_local")
    
    # CORS settings - Load from environment variable for production  
    _cors_origins_str: str = os.getenv("CORS_ORIGINS", "")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        if self._cors_origins_str and self._cors_origins_str.strip():
            try:
                # Try to parse as JSON first
                parsed = json.loads(self._cors_origins_str)
                origins = parsed if isinstance(parsed, list) else [str(parsed)]
            except (json.JSONDecodeError, ValueError):
                # Fallback to comma-separated string
                origins = [origin.strip() for origin in self._cors_origins_str.split(",")]
                origins = [origin for origin in origins if origin]  # Filter out empty strings
            
            # Always ensure localhost origins are included for development
            localhost_origins = [
                "http://localhost:3000",
                "http://localhost:8000",
                "http://localhost:8080"
            ]
            
            # Add localhost origins if not already present (only in development)
            if os.getenv("ENVIRONMENT") != "production":
                for localhost_origin in localhost_origins:
                    if localhost_origin not in origins:
                        origins.append(localhost_origin)
            
            # Ensure all non-localhost origins use HTTPS in production
            if os.getenv("ENVIRONMENT") == "production":
                origins = [self._ensure_https_origin(origin) for origin in origins]
                # Remove localhost origins in production for security
                origins = [origin for origin in origins if not ("localhost" in origin or "127.0.0.1" in origin)]
            
            return origins
        else:
            # Default values
            if os.getenv("ENVIRONMENT") == "production":
                # Production defaults - only secure origins
                origins = [
                    "https://peyechi.com",
                    "https://www.peyechi.com",
                    "https://peyechi.vercel.app"
                ]
            else:
                # Development defaults - include localhost
                origins = [
                    "http://localhost:3000",
                    "http://localhost:8000", 
                    "http://localhost:8080",
                    "https://peyechi.vercel.app",
                    "https://peyechi.com",
                    "https://www.peyechi.com"
                ]
            
            # Ensure HTTPS for production (except localhost for development)
            if os.getenv("ENVIRONMENT") == "production":
                origins = [self._ensure_https_origin(origin) for origin in origins]
            
            return origins
    
    def _ensure_https_origin(self, origin: str) -> str:
        """
        Ensure origin uses HTTPS in production, except for localhost.
        Always preserve localhost origins for development.
        """
        # Always preserve localhost origins regardless of environment
        if "localhost" in origin or "127.0.0.1" in origin:
            return origin
        
        # Convert HTTP to HTTPS for non-localhost origins in production
        if origin.startswith("http://"):
            return origin.replace("http://", "https://")
        
        return origin
    
    # Redis cache settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "True").lower() == "true"
    
    # Gemini service settings
    GEMINI_SERVICE_URL: str = os.getenv(
        "GEMINI_SERVICE_URL",
        "http://localhost:3001"  # Default to localhost for development
    )
    
    @property
    def GEMINI_SERVICE_URL_SECURE(self) -> str:
        """
        Ensure Gemini service URL uses HTTPS in production.
        """
        url = self.GEMINI_SERVICE_URL
        if os.getenv("ENVIRONMENT") == "production" and url.startswith("http://") and not url.startswith("http://localhost"):
            return url.replace("http://", "https://")
        return url

    # Authentication settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    VERIFICATION_CODE_EXPIRE_MINUTES: int = int(os.getenv("VERIFICATION_CODE_EXPIRE_MINUTES", "10"))
    
    # Email settings
    EMAIL_HOST: str = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT: int = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USER: str = os.getenv("EMAIL_USER", "")
    EMAIL_PASS: str = os.getenv("EMAIL_PASS", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@pickbd.com")
    EMAIL_USE_TLS: bool = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "")
    
    # Monitoring settings
    MONITORING_API_KEY: str = os.getenv("MONITORING_API_KEY", "")
    
    # Logging settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO" if not DEBUG else "DEBUG")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # HTTPS settings
    HTTPS_ENABLED: bool = os.getenv("HTTPS_ENABLED", "True").lower() == "true"
    FORCE_HTTPS: bool = os.getenv("FORCE_HTTPS", "False").lower() == "true"
    SECURE_COOKIES: bool = os.getenv("SECURE_COOKIES", "False").lower() == "true"

    class Config:
        case_sensitive = True
    
    def __post_init__(self):
        """Validate critical settings after initialization"""
        if not self.GOOGLE_CLIENT_ID:
            print("WARNING: GOOGLE_CLIENT_ID is not set. Google OAuth will not work.")
        if not self.SECRET_KEY or self.SECRET_KEY == "your-secret-key-change-in-production":
            print("WARNING: SECRET_KEY is not properly configured for production.")

settings = Settings()