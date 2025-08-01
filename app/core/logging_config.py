"""
Logging configuration for the application.
Provides production-ready logging setup with appropriate levels and formatting.
"""

import logging
import logging.config
import sys
from typing import Dict, Any

from app.core.config import settings


def setup_logging() -> None:
    """
    Configure logging for the application based on environment settings.
    """
    
    # Define logging configuration
    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": settings.LOG_FORMAT,
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "default",
                "stream": sys.stdout,
            },
        },
        "loggers": {
            # Application loggers
            "app": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console"],
                "propagate": False,
            },
            # FastAPI and Uvicorn loggers
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO" if not settings.DEBUG else "DEBUG",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            # SQLAlchemy loggers
            "sqlalchemy.engine": {
                "level": "WARNING" if not settings.DEBUG else "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "sqlalchemy.pool": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
            # Third-party loggers
            "requests": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
            "urllib3": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            },
        },
        "root": {
            "level": "WARNING",
            "handlers": ["console"],
        },
    }
    
    # Apply the logging configuration
    logging.config.dictConfig(logging_config)
    
    # Get the application logger
    logger = logging.getLogger("app")
    
    if settings.DEBUG:
        logger.info("Logging configured for development mode")
    else:
        logger.info("Logging configured for production mode")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: The name of the logger (typically __name__)
        
    Returns:
        A configured logger instance
    """
    return logging.getLogger(f"app.{name}")