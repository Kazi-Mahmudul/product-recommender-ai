"""
Configuration settings for the processor service.
"""

from typing import List, Dict, Any


class ProcessorSettings:
    """Configuration settings for data processing."""
    
    # Minimum required fields for data quality validation
    min_required_fields = [
        'name', 'brand', 'model', 'price', 'url'
    ]
    
    # Price categories configuration
    price_categories = {
        'bins': [0, 20000, 40000, 60000, 100000, float('inf')],
        'labels': ['Budget', 'Mid-range', 'Upper Mid-range', 'Premium', 'Flagship']
    }
    
    # Popular brands for feature engineering
    popular_brands = [
        'Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 
        'OnePlus', 'Huawei', 'Honor', 'Nokia', 'Motorola', 'Sony', 'LG'
    ]
    
    # Data quality thresholds
    quality_thresholds = {
        'completeness': 0.8,
        'accuracy': 0.85,
        'consistency': 0.9
    }
    
    # Feature engineering configuration
    feature_config = {
        'enable_price_categories': True,
        'enable_display_scores': True,
        'enable_camera_scores': True,
        'enable_battery_scores': True,
        'enable_performance_scores': True,
        'enable_brand_features': True,
        'enable_release_features': True,
        'enable_overall_scores': True,
    }
    
    # Performance scoring weights
    performance_weights = {
        'cpu_score': 0.4,
        'gpu_score': 0.3,
        'ram_score': 0.2,
        'storage_score': 0.1
    }
    
    # Display scoring weights
    display_weights = {
        'resolution': 0.4,
        'ppi': 0.3,
        'refresh_rate': 0.3
    }
    
    # Camera scoring weights
    camera_weights = {
        'camera_count': 20,
        'primary_camera_mp': 50,
        'selfie_camera_mp': 30
    }
    
    # Battery scoring weights
    battery_weights = {
        'capacity': 50,
        'charging_wattage': 40,
        'wireless_charging': 10
    }


# Global settings instance
settings = ProcessorSettings()