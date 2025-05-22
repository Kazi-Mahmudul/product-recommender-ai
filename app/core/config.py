import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "Mobile Phone Recommender API"
    PROJECT_VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    # API
    API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")
    
    # Debug mode
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

settings = Settings()