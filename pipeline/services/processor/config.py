"""
Configuration settings for the enhanced pipeline processor.
"""

class Settings:
    """Configuration settings."""
    
    # Data quality thresholds
    min_required_fields = [
        'name', 'brand', 'price', 'main_camera', 'ram', 'internal_storage'
    ]
    
    # Price categories configuration
    price_categories = {
        'bins': [0, 20000, 40000, 60000, 100000, float('inf')],
        'labels': ["Budget", "Mid-range", "Upper Mid-range", "Premium", "Flagship"]
    }
    
    # Popular brands list
    popular_brands = [
        "Samsung", "Apple", "Xiaomi", "Redmi", "Poco", "Realme", 
        "Oppo", "Vivo", "OnePlus", "Infinix", "Tecno", "Motorola", 
        "Google", "Huawei", "Nokia"
    ]
    
    # Processing configuration
    batch_size = 500
    quality_threshold = 0.80
    max_retries = 3
    
    # Processor rankings configuration
    processor_cache_days = 7
    processor_max_pages = 10

# Create global settings instance
settings = Settings()