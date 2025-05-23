import re
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

def extract_numeric_value(value):
    """Extract numeric value from string, handling special cases like percentages and battery capacity."""
    if value is None or value == '':
        return 0.0
    
    if isinstance(value, (int, float)):
        return float(value)
    
    if isinstance(value, str):
        value = value.strip()
        
        # Handle percentage values
        if '%' in value:
            try:
                # Remove % sign and convert to decimal
                return float(value.replace('%', '').strip()) / 100
            except (ValueError, TypeError):
                return 0.0
        
        # Handle battery capacity (e.g., "5000 mAh")
        if 'mah' in value.lower():
            try:
                # Extract just the number
                numeric_part = re.sub(r'[^\d.]', '', value)
                return float(numeric_part)
            except (ValueError, TypeError):
                return 0.0
        
        # Handle comma-separated numbers
        if ',' in value:
            value = value.replace(',', '')
        
        # Remove currency symbols and other non-numeric characters
        value = re.sub(r'[^\d.-]', '', value)
        
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0
    
    return 0.0

def parse_resolution(resolution_str):
    """Parse display resolution string into width and height."""
    if not resolution_str or not isinstance(resolution_str, str):
        return None, None
    
    try:
        # Remove any non-numeric characters except x
        resolution_str = re.sub(r'[^\dx]', '', resolution_str.lower())
        if 'x' in resolution_str:
            width, height = map(int, resolution_str.split('x'))
            return width, height
    except (ValueError, TypeError):
        pass
    
    return None, None

def calculate_derived_columns(phone_data: Dict[str, Any]) -> Dict[str, float]:
    """Calculate derived columns for a phone."""
    derived = {}
    
    try:
        # Extract numeric values with better error handling
        price = float(phone_data.get('price', 0) or 0)
        ram = extract_numeric_value(phone_data.get('ram', '0') or '0')
        storage = extract_numeric_value(phone_data.get('internal_storage', '0') or '0')
        battery = extract_numeric_value(phone_data.get('capacity', '0') or '0')
        weight = extract_numeric_value(phone_data.get('weight', '0') or '0')
        
        # Ensure all values are positive
        price = max(0, price)
        ram = max(0, ram or 0)
        storage = max(0, storage or 0)
        battery = max(0, battery or 0)
        weight = max(0, weight or 0)
        
        # Log extracted values
        logger.info(f"Extracted values for {phone_data.get('name', 'Unknown')}:")
        logger.info(f"Price: {price}, RAM: {ram}, Storage: {storage}, Battery: {battery}, Weight: {weight}")
        
        # Calculate price per GB metrics
        derived['price_per_gb_ram'] = price / ram if ram > 0 else 0.0
        derived['price_per_gb_storage'] = price / storage if storage > 0 else 0.0
        
        # Calculate performance score (RAM × Battery / Price)
        if price > 0 and ram > 0 and battery > 0:
            derived['performance_score'] = (ram * battery) / price
        else:
            derived['performance_score'] = 0.0
            logger.warning(f"Invalid values for performance score calculation: price={price}, ram={ram}, battery={battery}")
        
        # Calculate display score based on resolution and refresh rate
        resolution = phone_data.get('display_resolution', '0x0') or '0x0'
        refresh_rate = float(phone_data.get('refresh_rate_hz', 0) or 0)
        logger.info(f"Display resolution: {resolution}, Refresh rate: {refresh_rate}")
        
        width, height = parse_resolution(resolution)
        if width and height and refresh_rate > 0:
            derived['display_score'] = (width * height * refresh_rate) / 1000000
            logger.info(f"Calculated display score: {derived['display_score']}")
        else:
            derived['display_score'] = 0.0
            logger.warning(f"Invalid values for display score calculation: width={width}, height={height}, refresh_rate={refresh_rate}")
        
        # Calculate camera score (primary + selfie resolution)
        primary_cam = extract_numeric_value(phone_data.get('primary_camera_resolution', '0') or '0')
        selfie_cam = extract_numeric_value(phone_data.get('selfie_camera_resolution', '0') or '0')
        derived['camera_score'] = (primary_cam or 0) + (selfie_cam or 0)
        logger.info(f"Camera scores - Primary: {primary_cam}, Selfie: {selfie_cam}, Total: {derived['camera_score']}")
        
        # Calculate storage score (internal + virtual)
        virtual_ram = extract_numeric_value(phone_data.get('virtual_ram', '0') or '0')
        derived['storage_score'] = (storage or 0) + (virtual_ram or 0)
        logger.info(f"Storage scores - Internal: {storage}, Virtual: {virtual_ram}, Total: {derived['storage_score']}")
        
        # Calculate battery efficiency (mAh per gram)
        if weight > 0 and battery > 0:
            derived['battery_efficiency'] = battery / weight
            logger.info(f"Battery efficiency: {derived['battery_efficiency']}")
        else:
            derived['battery_efficiency'] = 0.0
            logger.warning(f"Invalid values for battery efficiency calculation: battery={battery}, weight={weight}")
        
        # Calculate price to display ratio
        if derived['display_score'] > 0 and price > 0:
            derived['price_to_display'] = price / derived['display_score']
            logger.info(f"Price to display ratio: {derived['price_to_display']}")
        else:
            derived['price_to_display'] = 0.0
            logger.warning(f"Invalid values for price to display ratio calculation: price={price}, display_score={derived['display_score']}")
        
    except Exception as e:
        logger.error(f"Error calculating derived columns: {str(e)}")
        # Set default values for all derived columns
        derived = {
            'price_per_gb_ram': 0.0,
            'price_per_gb_storage': 0.0,
            'performance_score': 0.0,
            'display_score': 0.0,
            'camera_score': 0.0,
            'storage_score': 0.0,
            'battery_efficiency': 0.0,
            'price_to_display': 0.0
        }
    
    return derived 