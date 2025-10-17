"""
Database validation utilities for checking column existence and safe querying.
"""

from typing import Set, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
import logging

logger = logging.getLogger(__name__)

class DatabaseValidator:
    """Utility class for validating database schema and safe column access."""
    
    _column_cache: Dict[str, Set[str]] = {}
    
    @classmethod
    def get_table_columns(cls, db: Session, table_name: str) -> Set[str]:
        """
        Get all column names for a given table.
        Results are cached to avoid repeated database queries.
        """
        if table_name in cls._column_cache:
            return cls._column_cache[table_name]
        
        try:
            # Use SQLAlchemy inspector to get column information
            inspector = inspect(db.bind)
            if inspector is None:
                logger.error(f"Could not get inspector for database")
                return set()
            columns = inspector.get_columns(table_name)
            column_names = {col['name'] for col in columns}
            
            # Cache the result
            cls._column_cache[table_name] = column_names
            logger.info(f"Cached columns for table '{table_name}': {len(column_names)} columns")
            
            return column_names
            
        except Exception as e:
            logger.error(f"Error getting columns for table '{table_name}': {str(e)}")
            # Return empty set if we can't get column information
            return set()
    
    @classmethod
    def column_exists(cls, db: Session, table_name: str, column_name: str) -> bool:
        """Check if a specific column exists in a table."""
        columns = cls.get_table_columns(db, table_name)
        return column_name in columns
    
    @classmethod
    def validate_phone_columns(cls, db: Session) -> Dict[str, bool]:
        """
        Validate the existence of commonly used phone table columns.
        Returns a dictionary mapping column names to their existence status.
        """
        required_columns = [
            # Core columns
            'id', 'name', 'brand', 'model', 'slug', 'price', 'url', 'img_url',
            
            # Numeric columns used in filtering
            'price_original', 'ram_gb', 'storage_gb', 'primary_camera_mp', 
            'selfie_camera_mp', 'battery_capacity_numeric', 'refresh_rate_numeric',
            'screen_size_numeric', 'overall_device_score', 'display_score',
            'camera_score', 'battery_score', 'performance_score',
            'charging_wattage',  # Add charging wattage column
            'average_rating', 'review_count',  # Add review-related columns
            
            # String columns used in filtering
            'display_type', 'battery_type', 'chipset', 'operating_system',
            'camera_setup'
        ]
        
        columns = cls.get_table_columns(db, 'phones')
        validation_result = {}
        
        for column in required_columns:
            exists = column in columns
            validation_result[column] = exists
            if not exists:
                logger.warning(f"Column '{column}' does not exist in phones table")
        
        return validation_result
    
    @classmethod
    def get_safe_column_value(cls, obj: Any, column_name: str, default: Any = None) -> Any:
        """
        Safely get a column value from a database object.
        Returns the default value if the column doesn't exist.
        """
        try:
            return getattr(obj, column_name, default)
        except AttributeError:
            logger.debug(f"Column '{column_name}' not found, returning default: {default}")
            return default
    
    @classmethod
    def clear_cache(cls):
        """Clear the column cache. Useful for testing or schema changes."""
        cls._column_cache.clear()
        logger.info("Database column cache cleared")