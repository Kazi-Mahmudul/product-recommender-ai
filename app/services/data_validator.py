"""
Data Validator Service - Validates and sanitizes database query results.

This service helps handle malformed database records gracefully and ensures
data consistency across the application.
"""

import logging
from typing import Dict, Any, List, Optional, Union
import re
from decimal import Decimal, InvalidOperation

logger = logging.getLogger(__name__)


class DataValidator:
    """
    Service for validating and sanitizing database query results.
    """
    
    @staticmethod
    def validate_phone_data(phone_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and sanitize phone data from database.
        
        Args:
            phone_data: Raw phone data from database
            
        Returns:
            Validated and sanitized phone data
        """
        if not isinstance(phone_data, dict):
            logger.warning("Phone data is not a dictionary")
            return {}
        
        validated_data = {}
        
        # Required string fields
        string_fields = {
            'id': 0,
            'name': 'Unknown Phone',
            'brand': 'Unknown',
            'model': 'Unknown Model',
            'slug': '',
            'img_url': 'https://via.placeholder.com/300x300?text=No+Image'
        }
        
        for field, default in string_fields.items():
            value = phone_data.get(field)
            if field == 'id':
                validated_data[field] = DataValidator._validate_integer(value, default)
            else:
                validated_data[field] = DataValidator._validate_string(value, default)
        
        # Numeric fields
        numeric_fields = {
            'price_original': 0.0,
            'ram_gb': 0,
            'storage_gb': 0,
            'primary_camera_mp': 0,
            'selfie_camera_mp': 0,
            'battery_capacity_numeric': 0,
            'screen_size_numeric': 0.0,
            'refresh_rate_numeric': 60,
            'ppi_numeric': 0,
            'weight': 0.0,
            'thickness': 0.0
        }
        
        for field, default in numeric_fields.items():
            value = phone_data.get(field)
            if field in ['ram_gb', 'storage_gb', 'primary_camera_mp', 'selfie_camera_mp', 
                        'battery_capacity_numeric', 'refresh_rate_numeric', 'ppi_numeric']:
                validated_data[field] = DataValidator._validate_integer(value, default)
            else:
                validated_data[field] = DataValidator._validate_float(value, default)
        
        # Score fields (0-10 range)
        score_fields = {
            'overall_device_score': 0.0,
            'camera_score': 0.0,
            'battery_score': 0.0,
            'performance_score': 0.0,
            'display_score': 0.0,
            'connectivity_score': 0.0,
            'security_score': 0.0
        }
        
        for field, default in score_fields.items():
            value = phone_data.get(field)
            validated_score = DataValidator._validate_float(value, default)
            # Ensure score is within 0-10 range
            validated_data[field] = max(0.0, min(10.0, validated_score))
        
        # Boolean fields
        boolean_fields = {
            'has_fast_charging': False,
            'has_wireless_charging': False,
            'is_popular_brand': False,
            'waterproof': False
        }
        
        for field, default in boolean_fields.items():
            value = phone_data.get(field)
            validated_data[field] = DataValidator._validate_boolean(value, default)
        
        # Optional string fields
        optional_string_fields = [
            'display_type', 'chipset', 'cpu', 'gpu', 'operating_system',
            'network', 'bluetooth', 'nfc', 'usb', 'colors', 'build',
            'screen_protection', 'ip_rating', 'price_category'
        ]
        
        for field in optional_string_fields:
            value = phone_data.get(field)
            validated_data[field] = DataValidator._validate_string(value, '')
        
        # Copy any additional fields that weren't explicitly validated
        for key, value in phone_data.items():
            if key not in validated_data:
                validated_data[key] = value
        
        return validated_data
    
    @staticmethod
    def _validate_string(value: Any, default: str = '') -> str:
        """Validate and sanitize string value."""
        if value is None:
            return default
        
        if isinstance(value, str):
            # Clean up the string
            cleaned = value.strip()
            # Remove any null bytes or control characters
            cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', cleaned)
            return cleaned if cleaned else default
        
        # Try to convert to string
        try:
            return str(value).strip()
        except Exception:
            logger.warning(f"Could not convert value to string: {value}")
            return default
    
    @staticmethod
    def _validate_integer(value: Any, default: int = 0) -> int:
        """Validate and sanitize integer value."""
        if value is None:
            return default
        
        if isinstance(value, int):
            return value
        
        if isinstance(value, float):
            return int(value)
        
        if isinstance(value, str):
            # Try to extract number from string
            try:
                # Remove non-numeric characters except decimal point
                cleaned = re.sub(r'[^\d.-]', '', value)
                if cleaned:
                    return int(float(cleaned))
            except (ValueError, InvalidOperation):
                pass
        
        try:
            return int(value)
        except (ValueError, TypeError):
            logger.debug(f"Could not convert value to integer: {value}")
            return default
    
    @staticmethod
    def _validate_float(value: Any, default: float = 0.0) -> float:
        """Validate and sanitize float value."""
        if value is None:
            return default
        
        if isinstance(value, (int, float)):
            return float(value)
        
        if isinstance(value, Decimal):
            return float(value)
        
        if isinstance(value, str):
            # Try to extract number from string
            try:
                # Remove non-numeric characters except decimal point
                cleaned = re.sub(r'[^\d.-]', '', value)
                if cleaned:
                    return float(cleaned)
            except (ValueError, InvalidOperation):
                pass
        
        try:
            return float(value)
        except (ValueError, TypeError):
            logger.debug(f"Could not convert value to float: {value}")
            return default
    
    @staticmethod
    def _validate_boolean(value: Any, default: bool = False) -> bool:
        """Validate and sanitize boolean value."""
        if value is None:
            return default
        
        if isinstance(value, bool):
            return value
        
        if isinstance(value, (int, float)):
            return bool(value)
        
        if isinstance(value, str):
            value_lower = value.lower().strip()
            if value_lower in ['true', '1', 'yes', 'on', 'enabled']:
                return True
            elif value_lower in ['false', '0', 'no', 'off', 'disabled']:
                return False
        
        try:
            return bool(value)
        except (ValueError, TypeError):
            logger.debug(f"Could not convert value to boolean: {value}")
            return default
    
    @staticmethod
    def validate_phone_list(phone_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate a list of phone data dictionaries.
        
        Args:
            phone_list: List of phone data dictionaries
            
        Returns:
            List of validated phone data dictionaries
        """
        if not isinstance(phone_list, list):
            logger.warning("Phone list is not a list")
            return []
        
        validated_phones = []
        for i, phone_data in enumerate(phone_list):
            try:
                validated_phone = DataValidator.validate_phone_data(phone_data)
                if validated_phone.get('id') and validated_phone.get('name'):
                    validated_phones.append(validated_phone)
                else:
                    logger.warning(f"Skipping phone at index {i} - missing required fields")
            except Exception as e:
                logger.warning(f"Error validating phone at index {i}: {str(e)}")
                continue
        
        return validated_phones
    
    @staticmethod
    def validate_filters(filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and sanitize filter parameters.
        
        Args:
            filters: Raw filter dictionary
            
        Returns:
            Validated filter dictionary
        """
        if not isinstance(filters, dict):
            return {}
        
        validated_filters = {}
        
        # Numeric filters with range support
        numeric_filters = {
            'price_original': (0, 1000000),
            'max_price': (0, 1000000),
            'min_price': (0, 1000000),
            'ram_gb': (1, 64),
            'min_ram_gb': (1, 64),
            'max_ram_gb': (1, 64),
            'storage_gb': (1, 1024),
            'min_storage_gb': (1, 1024),
            'max_storage_gb': (1, 1024),
            'battery_capacity_numeric': (1000, 10000),
            'min_battery_capacity': (1000, 10000),
            'max_battery_capacity': (1000, 10000),
            'screen_size_numeric': (3.0, 10.0),
            'min_screen_size': (3.0, 10.0),
            'max_screen_size': (3.0, 10.0),
            'min_primary_camera_mp': (1, 200),
            'min_selfie_camera_mp': (1, 100),
            'min_refresh_rate': (30, 240),
            'min_charging_wattage': (5, 150),
            'max_age_in_months': (0, 60)
        }
        
        for key, (min_val, max_val) in numeric_filters.items():
            if key in filters:
                value = DataValidator._validate_float(filters[key])
                if min_val <= value <= max_val:
                    validated_filters[key] = value
        
        # Score filters (0-10)
        score_filters = [
            'camera_score', 'battery_score', 'performance_score',
            'display_score', 'overall_device_score', 'connectivity_score',
            'security_score'
        ]
        
        for key in score_filters:
            if key in filters:
                value = DataValidator._validate_float(filters[key])
                if 0 <= value <= 10:
                    validated_filters[key] = value
        
        # String filters - expanded to include all possible filter keys
        string_filters = [
            'brand', 'price_category', 'network', 'chipset', 'operating_system',
            'display_type', 'battery_type', 'camera_setup', 'build', 'waterproof',
            'ip_rating', 'bluetooth', 'nfc', 'usb', 'fingerprint_sensor',
            'face_unlock', 'wireless_charging', 'quick_charging', 'reverse_charging'
        ]
        
        for key in string_filters:
            if key in filters:
                value = DataValidator._validate_string(filters[key])
                if value:
                    validated_filters[key] = value
        
        # Boolean filters - expanded to include all possible boolean filters
        boolean_filters = [
            'has_fast_charging', 'has_wireless_charging', 'is_popular_brand',
            'is_new_release', 'is_upcoming'
        ]
        
        for key in boolean_filters:
            if key in filters:
                validated_filters[key] = DataValidator._validate_boolean(filters[key])
        
        return validated_filters