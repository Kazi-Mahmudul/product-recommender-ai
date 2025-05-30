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
        "https://pickbd.com",
        "https://pickbd-ai.onrender.com"
    ]
    
    # Gemini service settings
    GEMINI_SERVICE_URL: str = os.getenv(
        "GEMINI_SERVICE_URL",
        "http://localhost:3001" if os.getenv("DEBUG", "True").lower() == "true" else "https://gemini-api-wm3b.onrender.com"
    )

    class Config:
        case_sensitive = True

settings = Settings()