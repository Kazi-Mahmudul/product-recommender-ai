from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "PickBD"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/pickbd")
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://pickbd.vercel.app",
        "https://pickbd-ai.onrender.com"
    ]
    
    # Gemini service settings
    GEMINI_SERVICE_URL: str = os.getenv(
        "GEMINI_SERVICE_URL",
        "http://localhost:3001" if os.getenv("DEBUG", "True").lower() == "true" else "https://gemini-api-wm3b.onrender.com"
    )

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

    class Config:
        case_sensitive = True

settings = Settings()