#!/usr/bin/env python3
"""
Enhanced MobileDokan Web Scraper with Integrated Pipeline

This script scrapes mobile phone data from MobileDokan and automatically applies
the enhanced pipeline transformation (cleaning, feature engineering, quality validation)
before storing in the database.
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
from tqdm import tqdm
import time
import urllib3
import os
import csv
from datetime import datetime
import re
import psycopg2
from typing import Dict, Any, List, Optional, Set
import logging
import sys

# Add services to path for pipeline integration
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'processor'))

# Import enhanced pipeline services
try:
    from data_cleaner import DataCleaner
    from feature_engineer import FeatureEngineer
    from data_quality_validator import DataQualityValidator
    from database_updater import DatabaseUpdater
    PIPELINE_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.debug("✅ Enhanced pipeline services loaded successfully")
except ImportError as e:
    PIPELINE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ Enhanced pipeline services not available: {e}")

# Configure logging - reduced verbosity
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Headers for request (same as manual scraper)
headers = ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US, en;q=0.5'
})

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Define standard columns based on the database schema (same as manual scraper)
STANDARD_COLUMNS = [
    # Basic Info
    'name', 'brand', 'model', 'price', 'url', 'img_url',
    
    # Display
    'display_type', 'screen_size_inches', 'display_resolution', 'pixel_density_ppi',
    'refresh_rate_hz', 'screen_protection', 'display_brightness', 'aspect_ratio', 'hdr_support',
    
    # Performance
    'chipset', 'cpu', 'gpu', 'ram', 'ram_type', 'internal_storage', 'storage_type',
    
    # Camera
    'camera_setup', 'primary_camera_resolution', 'selfie_camera_resolution',
    'main_camera', 'front_camera',
    'primary_camera_video_recording', 'selfie_camera_video_recording', 'primary_camera_ois',
    'primary_camera_aperture', 'image_resolution', 'selfie_camera_aperture',
    'camera_features', 'autofocus', 'flash', 'settings', 'zoom', 'shooting_modes', 'video_fps',
    
    # Battery
    'battery_type', 'capacity', 'quick_charging', 'wireless_charging', 'reverse_charging',
    
    # Design
    'build', 'weight', 'thickness', 'colors', 'waterproof', 'ip_rating', 'ruggedness',
    
    # Network & Connectivity
    'network', 'speed', 'sim_slot', 'volte', 'bluetooth', 'wlan', 'gps', 'nfc',
    'usb', 'usb_otg', 'fingerprint_sensor', 'finger_sensor_type', 'finger_sensor_position',
    'face_unlock', 'light_sensor', 'infrared', 'fm_radio',
    
    # Software
    'operating_system', 'os_version', 'user_interface', 'status', 'made_by', 'release_date'
]


def extract_camera_data(group, camera_type):
    """
    Extract camera data from a specific camera group.
    (Same as manual scraper)
    """
    camera_data = {}
    
    try:
        # Find all camera subgroups
        camera_subgroups = group.select('.subgroup')
        camera_tables = group.select('table.spec-grp-tbl')
        
        for i, subgroup in enumerate(camera_subgroups):
            header = subgroup.get_text(strip=True).lower()
            table = camera_tables[i] if i < len(camera_tables) else None
            
            if not table:
                continue
                
            if camera_type == 'primary' and ('primary' in header or 'main' in header or 'rear' in header):
                # Process primary camera specifications
                for row in table.select('tr'):
                    tds = row.find_all('td')
                    if len(tds) == 2:
                        key = str(tds[0].text).strip().lower().replace(' ', '_')
                        value = tds[1].get_text(strip=True)
                        
                        # Map primary camera keys to standard columns
                        if 'resolution' in key:
                            camera_data['primary_camera_resolution'] = value
                        elif 'setup' in key:
                            camera_data['camera_setup'] = value
                        elif 'video' in key:
                            camera_data['primary_camera_video_recording'] = value
                        elif 'ois' in key:
                            camera_data['primary_camera_ois'] = value
                        elif 'aperture' in key:
                            camera_data['primary_camera_aperture'] = value
                        elif 'image' in key:
                            camera_data['image_resolution'] = value
                        elif 'features' in key:
                            camera_data['camera_features'] = value
                            
            elif camera_type == 'selfie' and ('selfie' in header or 'front' in header):
                # Process selfie camera specifications
                for row in table.select('tr'):
                    tds = row.find_all('td')
                    if len(tds) == 2:
                        key = str(tds[0].text).strip().lower().replace(' ', '_')
                        value = tds[1].get_text(strip=True)
                        
                        # Map selfie camera keys to standard columns
                        if 'resolution' in key:
                            camera_data['selfie_camera_resolution'] = value
                        elif 'video' in key:
                            camera_data['selfie_camera_video_recording'] = value
                        elif 'aperture' in key:
                            camera_data['selfie_camera_aperture'] = value
                            
    except Exception as e:
        logger.error(f"Error extracting {camera_type} camera data: {str(e)}")
        
    return camera_data


def extract_camera_from_detailed_specs(soup):
    """
    Extract camera data from the detailed specifications section as a fallback.
    (Same as manual scraper)
    """
    camera_specs = {}
    
    try:
        # Look for camera section in detailed specs
        camera_groups = []
        for group in soup.select('.row.mb-2.pb-2.border-bottom'):
            group_title = group.select_one('h3.text-bold')
            if group_title and ('camera' in group_title.get_text(strip=True).lower() or 'cameras' in group_title.get_text(strip=True).lower()):
                camera_groups.append(group)
        
        if not camera_groups:
            logger.debug("No camera section found in detailed specs")
            return camera_specs
            
        # Process each camera group
        for group in camera_groups:
            # Find primary camera data
            primary_data = extract_camera_data(group, 'primary')
            if primary_data.get('primary_camera_resolution'):
                camera_specs['main_camera'] = primary_data.get('primary_camera_resolution')
                # Copy other primary camera data
                for key, value in primary_data.items():
                    camera_specs[key] = value
                    
            # Find selfie camera data
            selfie_data = extract_camera_data(group, 'selfie')
            if selfie_data.get('selfie_camera_resolution'):
                camera_specs['front_camera'] = selfie_data.get('selfie_camera_resolution')
                # Copy other selfie camera data
                for key, value in selfie_data.items():
                    camera_specs[key] = value
                    
    except Exception as e:
        logger.error(f"Error extracting camera from detailed specs: {str(e)}")
        
    return camera_specs


def extract_key_specs(soup):
    """
    Extract data from the Key Specifications section of a Mobiledokan product page.
    (Same as manual scraper)
    """
    key_specs = {}
    
    try:
        # Find the key-specs div container
        key_specs_div = soup.select_one('.key-specs')
        
        if not key_specs_div:
            logger.debug("Key specifications section not found")
            # Try fallback to detailed specs for camera data
            key_specs.update(extract_camera_from_detailed_specs(soup))
            return key_specs
            
        # Find all info elements in the key specs section
        info_elements = key_specs_div.select('.info')
        
        if not info_elements:
            logger.debug("No info elements found in key specifications section")
            # Try fallback to detailed specs for camera data
            key_specs.update(extract_camera_from_detailed_specs(soup))
            return key_specs
            
        for info in info_elements:
            # Get the text container
            text_container = info.select_one('.text')
            if not text_container:
                continue
            
            # Get all span elements in the text container
            spans = text_container.select('span')
            if len(spans) < 2:
                continue
                
            # First span is the label, second span (with foswald class) is the value
            label = spans[0].get_text(strip=True)
            value = spans[1].get_text(strip=True) if len(spans) > 1 else None
            
            if not label or not value:
                continue
            
            # Map to standardized keys
            logger.debug(f"Key spec found - Label: '{label}', Value: '{value}'")
            
            # Handle main camera variations
            if any(term in label.lower() for term in ['main camera', 'rear camera', 'primary camera', 'back camera']):
                key_specs['main_camera'] = value
                logger.debug(f"✅ Main camera extracted: {value}")
                
                # Also try to extract primary camera resolution if it's in the format "48MP" or "48+48+48MP"
                if 'MP' in value:
                    # Extract camera resolution
                    resolution = value
                    key_specs['primary_camera_resolution'] = resolution
                    
                    # Try to determine camera setup based on the resolution format
                    if '+' in resolution:
                        # Multiple cameras (e.g., "48+8+2MP" would be "Triple")
                        camera_count = resolution.count('+') + 1
                        if camera_count == 2:
                            key_specs['camera_setup'] = 'Dual'
                        elif camera_count == 3:
                            key_specs['camera_setup'] = 'Triple'
                        elif camera_count == 4:
                            key_specs['camera_setup'] = 'Quad'
                        else:
                            key_specs['camera_setup'] = f'{camera_count} Cameras'
                    else:
                        # Single camera
                        key_specs['camera_setup'] = 'Single'
                        
            # Handle front camera variations
            elif any(term in label.lower() for term in ['front camera', 'selfie camera', 'secondary camera']):
                key_specs['front_camera'] = value
                logger.debug(f"✅ Front camera extracted: {value}")
                
                # Also set selfie_camera_resolution if it's in the format "24MP"
                if 'MP' in value:
                    key_specs['selfie_camera_resolution'] = value
                    
            elif 'Storage' in label:
                key_specs['internal_storage'] = value
            elif 'RAM' in label:
                key_specs['ram'] = value
            # Add more mappings as needed
        
        # Check if we found camera data, if not try the fallback
        if 'main_camera' not in key_specs or 'front_camera' not in key_specs:
            fallback_data = extract_camera_from_detailed_specs(soup)
            
            # Only update missing keys
            for key, value in fallback_data.items():
                if key not in key_specs or key_specs[key] is None or key_specs[key] == '':
                    key_specs[key] = value
            
    except Exception as e:
        logger.error(f"Error extracting key specs: {str(e)}")
        # Try fallback on exception
        key_specs.update(extract_camera_from_detailed_specs(soup))
        
    return key_specs


def sanitize_key(key, prefix=''):
    """Convert key to lowercase and replace spaces with underscores, with optional prefix"""
    key = str(key).strip().lower().replace(' ', '_')
    key = ''.join(c for c in key if c.isalnum() or c == '_')
    if prefix:
        key = f"{prefix}_{key}"
    return key


class RateLimiter:
    """Rate limiter (same as manual scraper)"""
    def __init__(self, requests_per_minute=30):
        self.requests_per_minute = requests_per_minute
        self.requests = []
    
    def wait(self):
        now = time.time()
        self.requests = [req for req in self.requests if now - req < 60]
        if len(self.requests) >= self.requests_per_minute:
            sleep_time = 60 - (now - self.requests[0])
            if sleep_time > 0:
                time.sleep(sleep_time)
        self.requests.append(now)


def get_product_links(page=1):
    """Get product links from a specific page of the mobile price list with enhanced detection"""
    url = f'https://www.mobiledokan.com/mobile-price-list?page={page}'
    try:
        res = requests.get(url, headers=headers, verify=False, timeout=30)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # Multiple ways to detect products
        product_links = []
        
        # Method 1: Look for .product-box a links
        product_boxes = soup.select('.product-box a')
        for a in product_boxes:
            href = a.get('href')
            if href and href.startswith('https://www.mobiledokan.com/mobile/'):
                product_links.append(href)
        
        # Method 2: If no product-box, try alternative selectors
        if not product_links:
            # Try other common selectors
            alternative_selectors = [
                'a[href*="/mobile/"]',  # Any link containing /mobile/
                '.product a',           # Product class with link
                '.item a',             # Item class with link
                '[data-product-id] a'  # Product ID attribute with link
            ]
            
            for selector in alternative_selectors:
                elements = soup.select(selector)
                for a in elements:
                    href = a.get('href')
                    if href and '/mobile/' in href and href.startswith('https://www.mobiledokan.com'):
                        product_links.append(href)
                
                if product_links:  # If we found products with this selector, stop trying others
                    break
        
        # Method 3: Enhanced end-of-catalog detection
        if not product_links:
            page_text = soup.get_text().lower()
            
            # Check for explicit "no products" messages
            no_products_indicators = [
                'no products found',
                'no items found', 
                'no results',
                'page not found',
                '404',
                'no mobile phones found',
                'sorry, no products',
                'end of results'
            ]
            
            for indicator in no_products_indicators:
                if indicator in page_text:
                    logger.debug(f"Page {page}: End-of-catalog indicator found: '{indicator}'")
                    return []
            
            # Check pagination to see if we're beyond the last page
            pagination_elements = soup.select('.pagination, .page-numbers, .pager')
            if pagination_elements:
                # Look for disabled "next" buttons or current page indicators
                next_disabled = soup.select('.pagination .next.disabled, .pagination .next[disabled]')
                if next_disabled:
                    logger.debug(f"Page {page}: Pagination indicates end of catalog (next button disabled)")
                    return []
            
            logger.debug(f"Page {page}: No products found, but no clear end-of-catalog indicators")
        
        # Remove duplicates while preserving order
        unique_links = list(dict.fromkeys(product_links))
        
        if unique_links:
            logger.debug(f"Page {page}: Found {len(unique_links)} unique product links")
        else:
            logger.debug(f"Page {page}: No product links found")
            
        return unique_links
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching page {page}")
        return []
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error fetching page {page}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error fetching page {page}: {str(e)}")
        return []


def parse_phone_title(title: str) -> tuple:
    """Parse phone title to extract brand and model (same as manual scraper)"""
    if not title:
        return 'Unknown', 'Unknown'
        
    title = title.strip()
    
    # Common brands in Bangladesh
    brands = ['Samsung', 'iPhone', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 
             'OnePlus', 'Huawei', 'Honor', 'Nokia', 'Motorola', 'Sony', 'LG',
             'Infinix', 'Tecno', 'Itel', 'Symphony', 'Walton']
    
    for brand in brands:
        if brand.lower() in title.lower():
            # Remove brand from title to get model
            model = re.sub(rf'\b{re.escape(brand)}\b', '', title, flags=re.IGNORECASE).strip()
            model = re.sub(r'\s+', ' ', model)  # Clean up spaces
            return brand, model
    
    # If no brand found, try to extract from first word
    words = title.split()
    if words:
        return words[0], ' '.join(words[1:]) if len(words) > 1 else title
    
    return 'Unknown', title


def get_product_specs(url, rate_limiter=None):
    """Get product specs with improved error handling and rate limiting (same as manual scraper)"""
    try:
        # Apply rate limiting
        if rate_limiter:
            rate_limiter.wait()
            
        # Get the main product page
        res = requests.get(url, headers=headers, verify=False, timeout=30)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, 'html.parser')

        # Extract key specifications
        key_specs = extract_key_specs(soup)

        # Get Model Name and Brand
        name_tag = soup.select_one('#product-specs h2')
        name = name_tag.get_text(strip=True).replace('Full Specifications', '').strip() if name_tag else None

        # Get Price
        price_tag = soup.select_one('.price span.h3')
        price = price_tag.get_text(strip=True) if price_tag else None

        # Get Main Image URL
        img_tag = soup.select_one('img[itemprop="image"].img-fluid')
        image_url = img_tag.get('src') if img_tag else None

        # Initialize specs dictionary with all standard columns
        specs = {col: None for col in STANDARD_COLUMNS if col not in ['url', 'name', 'price', 'img_url']}

        # Merge key specs with other specs
        for key, value in key_specs.items():
            if key in STANDARD_COLUMNS:
                # Only set the value if it's not None and the current value is None or empty
                if value is not None and (specs.get(key) is None or specs.get(key) == ''):
                    specs[key] = value
        
        # Process each specification group
        for group in soup.select('.row.mb-2.pb-2.border-bottom'):
            group_title = group.select_one('h3.text-bold')
            if not group_title:
                continue
                
            group_name = group_title.get_text(strip=True).lower()
            
            # Handle display group
            if 'display' in group_name:
                for row in group.select('table.spec-grp-tbl tr'):
                    tds = row.find_all('td')
                    if len(tds) == 2:
                        key = sanitize_key(tds[0].text)
                        value = tds[1].get_text(strip=True)
                        
                        # Map display keys to standard columns
                        if 'type' in key:
                            specs['display_type'] = value
                        elif 'size' in key:
                            specs['screen_size_inches'] = value
                        elif 'resolution' in key:
                            specs['display_resolution'] = value
                        elif 'pixel' in key or 'ppi' in key:
                            specs['pixel_density_ppi'] = value
                        elif 'refresh' in key:
                            specs['refresh_rate_hz'] = value
                        elif 'protection' in key:
                            specs['screen_protection'] = value
                        elif 'brightness' in key:
                            specs['display_brightness'] = value
                        elif 'aspect' in key:
                            specs['aspect_ratio'] = value
                        elif 'hdr' in key:
                            specs['hdr_support'] = value
                            
            # Handle camera groups
            elif 'camera' in group_name or 'cameras' in group_name:
                # Find all camera subgroups
                camera_subgroups = group.select('.subgroup')
                camera_tables = group.select('table.spec-grp-tbl')
                
                for i, subgroup in enumerate(camera_subgroups):
                    header = subgroup.get_text(strip=True).lower()
                    table = camera_tables[i] if i < len(camera_tables) else None
                    
                    if not table:
                        continue
                        
                    if 'primary' in header:
                        # Process primary camera specifications
                        for row in table.select('tr'):
                            tds = row.find_all('td')
                            if len(tds) == 2:
                                key = sanitize_key(tds[0].text)
                                value = tds[1].get_text(strip=True)
                                
                                # Map primary camera keys to standard columns
                                if 'resolution' in key:
                                    specs['primary_camera_resolution'] = value
                                elif 'setup' in key:
                                    specs['camera_setup'] = value
                                elif 'video' in key:
                                    specs['primary_camera_video_recording'] = value
                                elif 'ois' in key:
                                    specs['primary_camera_ois'] = value
                                elif 'aperture' in key:
                                    specs['primary_camera_aperture'] = value
                                elif 'image' in key or 'Image Resolution' in key or 'Image' in key:
                                    specs['image_resolution'] = value
                                elif 'features' in key:
                                    specs['camera_features'] = value
                                elif 'autofocus' in key:
                                    specs['autofocus'] = value
                                elif 'flash' in key:
                                    specs['flash'] = value
                                elif 'settings' in key:
                                    specs['settings'] = value
                                elif 'zoom' in key:
                                    specs['zoom'] = value
                                elif 'shooting' in key:
                                    specs['shooting_modes'] = value
                                elif 'fps' in key:
                                    specs['video_fps'] = value
                                    
                    elif 'selfie' in header or 'front' in header:
                        # Process selfie camera specifications
                        for row in table.select('tr'):
                            tds = row.find_all('td')
                            if len(tds) == 2:
                                key = sanitize_key(tds[0].text)
                                value = tds[1].get_text(strip=True)
                                
                                # Map selfie camera keys to standard columns
                                if 'resolution' in key:
                                    specs['selfie_camera_resolution'] = value
                                elif 'video' in key:
                                    specs['selfie_camera_video_recording'] = value
                                elif 'aperture' in key:
                                    specs['selfie_camera_aperture'] = value
                                    
            else:
                # For other groups, process normally
                for row in group.select('table.spec-grp-tbl tr'):
                    tds = row.find_all('td')
                    if len(tds) == 2:
                        key = sanitize_key(tds[0].text)
                        value = tds[1].get_text(strip=True)
                        
                        # Map other keys to standard columns
                        if key in specs:
                            specs[key] = value

        # Parse brand and model from name
        brand, model = parse_phone_title(name) if name else ('Unknown', 'Unknown')
        specs['brand'] = brand
        specs['model'] = model

        # Prepare the result
        result = {
            'name': name,
            'brand': brand,
            'model': model,
            'price': price,
            'image_url': image_url,
            'specs': specs,
            'url': url
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing {url}: {str(e)}")
        return None


class MobileDokanScraper:
    """
    Enhanced MobileDokan scraper class with integrated pipeline processing
    """
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url
        self.rate_limiter = RateLimiter(requests_per_minute=30)
        
        # Initialize enhanced pipeline services if available
        if PIPELINE_AVAILABLE:
            self.data_cleaner = DataCleaner()
            self.feature_engineer = FeatureEngineer()
            self.quality_validator = DataQualityValidator()
            self.database_updater = DatabaseUpdater()
            logger.info("✅ MobileDokan scraper initialized with ENHANCED PIPELINE")
        else:
            logger.info("⚠️ MobileDokan scraper initialized with BASIC PIPELINE (fallback mode)")
    
    def get_database_connection(self):
        """Get database connection"""
        if not self.database_url:
            # Fallback to environment variable or hardcoded URL
            import os
            self.database_url = os.getenv("DATABASE_URL")
            if not self.database_url:
                self.database_url = os.getenv('DATABASE_URL')
        
        if self.database_url and self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)
        
        return psycopg2.connect(self.database_url)
    
    def scrape_phone_details(self, phone_url: str, phone_name: str) -> Optional[Dict[str, Any]]:
        """
        Scrape detailed phone specifications from individual phone page.
        """
        try:
            # Make request with retries
            response = self._make_request(phone_url)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract phone data
            phone_data = self._extract_phone_data(soup, phone_url, phone_name)
            
            # Log only summary information
            if phone_data:
                logger.debug(f"📱 Scraped: {phone_data.get('name', 'Unknown')}")
            
            return phone_data
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to scrape {phone_name}: {str(e)}")
            return None
    
    def scrape_page(self, page_number: int) -> List[Dict[str, Any]]:
        """
        Scrape a single page of phones.
        """
        try:
            logger.debug(f"Fetching page {page_number}...")
            
            # Get product links from page
            product_links = get_product_links(page_number)
            
            if not product_links:
                logger.debug(f"   No products found on page {page_number}")
                return []
            
            logger.debug(f"   Found {len(product_links)} products on page {page_number}")
            
            # Scrape details for each product
            phones = []
            for url in product_links:
                phone_name = url.split('/')[-1]
                phone_data = self.scrape_phone_details(url, phone_name)
                if phone_data:
                    phones.append(phone_data)
            
            return phones
            
        except Exception as e:
            logger.error(f"⚠️ Failed to scrape page {page_number}: {str(e)}")
            return []
    
    def scrape_and_store(self, max_pages: Optional[int] = None, pipeline_run_id: str = 'unknown', 
                    check_updates: bool = True, batch_size: int = 50) -> Dict[str, Any]:
        """
        Scrape phones from multiple pages and store in database.
        """
        logger.info(f"🚀 Starting phone scraping")
        logger.info(f"   Max pages: {max_pages or 'ALL'}")
        logger.info(f"   Pipeline run ID: {pipeline_run_id}")
        
        start_time = time.time()
        
        all_phones = []
        processed_urls = set()
        pages_scraped = 0
        products_processed = 0
        products_inserted = 0
        products_updated = 0
        
        try:
            page = 1
            consecutive_empty_pages = 0
            max_consecutive_empty = 2
            
            while True:
                # Check page limit
                if max_pages and page > max_pages:
                    logger.info(f"🏁 Reached maximum page limit: {max_pages}")
                    break
                
                # Scrape page
                phones_on_page = self.scrape_page(page)
                
                if not phones_on_page:
                    consecutive_empty_pages += 1
                    logger.debug(f"   Empty page {page}. Consecutive empty: {consecutive_empty_pages}/{max_consecutive_empty}")
                    
                    if page == 1:
                        logger.error("❌ First page is empty - website might be down")
                        break
                    
                    if consecutive_empty_pages >= max_consecutive_empty:
                        logger.info(f"🏁 Reached end: {consecutive_empty_pages} consecutive empty pages")
                        break
                else:
                    consecutive_empty_pages = 0
                    pages_scraped += 1
                    
                    # Process phones on this page
                    for phone in phones_on_page:
                        url = phone.get('url')
                        if url and url not in processed_urls:
                            processed_urls.add(url)
                            all_phones.append(phone)
                            
                            # Log progress periodically
                            if len(all_phones) % 20 == 0:
                                logger.info(f"   Progress: {len(all_phones)} phones collected")
                    
                    logger.debug(f"   Page {page}: {len(phones_on_page)} phones")
                
                page += 1
                time.sleep(0.5)  # Small delay to be respectful
        
            # Summary of collection
            logger.info(f"📊 Collection completed: {len(all_phones)} phones from {pages_scraped} pages")
            
            # Store in database
            if all_phones:
                logger.info(f"💾 Storing {len(all_phones)} phones in database...")
                
                # Store phones in database
                store_result = self.store_phones_in_database(
                    all_phones, 
                    pipeline_run_id=pipeline_run_id,
                    check_updates=check_updates,
                    batch_size=batch_size
                )
                
                products_processed = store_result.get('products_processed', 0)
                products_inserted = store_result.get('products_inserted', 0)
                products_updated = store_result.get('products_updated', 0)
                
                logger.info(f"✅ Database storage completed")
            
            execution_time = time.time() - start_time
            
            result = {
                'status': 'success',
                'products_processed': products_processed,
                'products_inserted': products_inserted,
                'products_updated': products_updated,
                'pages_scraped': pages_scraped,
                'phones_collected': len(all_phones),
                'execution_time_seconds': round(execution_time, 2),
                'pipeline_run_id': pipeline_run_id
            }
            
            logger.info(f"🎯 Scraping completed successfully!")
            logger.info(f"   Pages: {pages_scraped}")
            logger.info(f"   Phones: {len(all_phones)} collected")
            logger.info(f"   Database: {products_inserted} inserted, {products_updated} updated")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Scraping failed: {str(e)}")
            execution_time = time.time() - start_time
            
            return {
                'status': 'failed',
                'error': str(e),
                'products_processed': 0,
                'products_inserted': 0,
                'products_updated': 0,
                'pages_scraped': pages_scraped,
                'phones_collected': len(all_phones),
                'execution_time_seconds': round(execution_time, 2),
                'pipeline_run_id': pipeline_run_id
            }
    
    def convert_scraped_data_to_dataframe(self, scraped_data: List[Dict[str, Any]], pipeline_run_id: str) -> pd.DataFrame:
        """Convert scraped product data to DataFrame format for pipeline processing"""
        rows = []
        
        for product in scraped_data:
            # Create a row with all the scraped data
            row = {
                'name': product.get('name'),
                'brand': product.get('brand'),
                'model': product.get('model'),
                'price': product.get('price'),
                'url': product.get('url'),
                'img_url': product.get('image_url'),
                'scraped_at': datetime.now(),
                'pipeline_run_id': pipeline_run_id,
                'data_source': 'MobileDokan',
                'is_pipeline_managed': True
            }
            
            # Add all specs data
            if 'specs' in product and product['specs']:
                for key, value in product['specs'].items():
                    if value is not None:
                        row[key] = value
            
            rows.append(row)
        
        return pd.DataFrame(rows)
    
    def process_with_enhanced_pipeline(self, df: pd.DataFrame, pipeline_run_id: str) -> Dict[str, Any]:
        """Process DataFrame through the enhanced pipeline"""
        try:
            logger.info(f"🔄 Applying enhanced pipeline to {len(df)} products...")
            
            # Step 1: Data Cleaning
            logger.info("  🧹 Step 1: Data cleaning...")
            cleaned_df, cleaning_issues = self.data_cleaner.clean_dataframe(df)
            logger.info(f"     Cleaning completed: {len(cleaning_issues)} issues found")
            
            # Step 2: Feature Engineering
            logger.info("  ⚙️ Step 2: Feature engineering...")
            enhanced_df = self.feature_engineer.engineer_features(cleaned_df)
            logger.info(f"     Feature engineering completed: {len(enhanced_df.columns)} total columns")
            
            # Step 3: Quality Validation
            logger.info("  ✅ Step 3: Quality validation...")
            passed, quality_report = self.quality_validator.validate_pipeline_data(enhanced_df)
            quality_score = quality_report['overall_quality_score']
            logger.info(f"     Quality validation: {'PASSED' if passed else 'WARNING'} (Score: {quality_score:.2f})")
            
            # Step 4: Database Update
            logger.info("  💾 Step 4: Database update...")
            success, db_results = self.database_updater.update_with_transaction(enhanced_df, pipeline_run_id)
            
            if success:
                inserted = db_results['results']['inserted']
                updated = db_results['results']['updated']
                errors = db_results['results']['errors']
                
                logger.info(f"     Database update completed: {inserted} inserted, {updated} updated, {errors} errors")
                
                return {
                    'processed': len(df),
                    'inserted': inserted,
                    'updated': updated,
                    'errors': [],
                    'quality_score': quality_score,
                    'cleaning_issues': len(cleaning_issues)
                }
            else:
                error_msg = f"Database update failed: {db_results.get('error', 'Unknown error')}"
                logger.error(f"     {error_msg}")
                return {
                    'processed': 0,
                    'inserted': 0,
                    'updated': 0,
                    'errors': [error_msg],
                    'quality_score': quality_score,
                    'cleaning_issues': len(cleaning_issues)
                }
                
        except Exception as e:
            error_msg = f"Enhanced pipeline processing failed: {str(e)}"
            logger.error(error_msg)
            return {
                'processed': 0,
                'inserted': 0,
                'updated': 0,
                'errors': [error_msg],
                'quality_score': 0.0,
                'cleaning_issues': 0
            }
    
    def process_with_basic_pipeline(self, df: pd.DataFrame, pipeline_run_id: str) -> Dict[str, Any]:
        """Fallback processing without enhanced pipeline"""
        try:
            logger.info(f"🔄 Applying basic pipeline to {len(df)} products...")
            
            processed = 0
            inserted = 0
            updated = 0
            errors = []
            
            # Process each row individually with basic database operations
            for _, row in df.iterrows():
                try:
                    product_data = {
                        'name': row.get('name'),
                        'brand': row.get('brand'),
                        'model': row.get('model'),
                        'price': row.get('price'),
                        'url': row.get('url'),
                        'image_url': row.get('img_url'),
                        'specs': {k: v for k, v in row.items() if k not in ['name', 'brand', 'model', 'price', 'url', 'img_url', 'scraped_at', 'pipeline_run_id', 'data_source', 'is_pipeline_managed']}
                    }
                    
                    result = self.store_product_in_database(product_data, pipeline_run_id)
                    if result == 'inserted':
                        inserted += 1
                    elif result == 'updated':
                        updated += 1
                    
                    processed += 1
                    
                except Exception as e:
                    error_msg = f"Error processing product {row.get('name', 'Unknown')}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            logger.info(f"  Basic pipeline completed: {processed} processed, {inserted} inserted, {updated} updated")
            
            return {
                'processed': processed,
                'inserted': inserted,
                'updated': updated,
                'errors': errors,
                'quality_score': 0.8,  # Assume basic quality
                'cleaning_issues': 0
            }
            
        except Exception as e:
            error_msg = f"Basic pipeline processing failed: {str(e)}"
            logger.error(error_msg)
            return {
                'processed': 0,
                'inserted': 0,
                'updated': 0,
                'errors': [error_msg],
                'quality_score': 0.0,
                'cleaning_issues': 0
            }
    
    def get_existing_urls(self) -> Set[str]:
        """Get existing URLs from database"""
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT url FROM phones WHERE url IS NOT NULL")
            urls = {row[0] for row in cursor.fetchall()}
            
            conn.close()
            return urls
            
        except Exception as e:
            logger.error(f"Error getting existing URLs: {str(e)}")
            return set()
    
    def get_existing_urls_with_dates(self) -> Dict[str, Optional[datetime]]:
        """Get existing URLs from database with their last update dates"""
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT url, scraped_at 
                FROM phones 
                WHERE url IS NOT NULL
            """)
            
            urls_with_dates = {}
            for row in cursor.fetchall():
                urls_with_dates[row[0]] = row[1]  # url -> scraped_at
            
            conn.close()
            return urls_with_dates
            
        except Exception as e:
            logger.error(f"Error getting existing URLs with dates: {str(e)}")
            return {}
    
    def get_valid_database_columns(self) -> Set[str]:
        """Get valid columns from the phones table"""
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'phones'
            """)
            
            columns = {row[0] for row in cursor.fetchall()}
            conn.close()
            return columns
            
        except Exception as e:
            logger.error(f"Error getting database columns: {str(e)}")
            # Return a basic set of known columns as fallback
            return {
                'name', 'brand', 'model', 'price', 'url', 'img_url',
                'scraped_at', 'pipeline_run_id', 'data_source', 'is_pipeline_managed',
                'main_camera', 'front_camera', 'display_type', 'screen_size_inches',
                'ram', 'internal_storage', 'capacity', 'chipset', 'operating_system'
            }
    
    def store_product_in_database(self, product_data: Dict[str, Any], pipeline_run_id: str = None) -> str:
        """
        Store product data in database
        
        Returns:
            'inserted', 'updated', or 'error'
        """
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            
            # Get valid database columns
            valid_columns = self.get_valid_database_columns()
            
            # Prepare data for insertion
            current_time = datetime.now()
            data = {
                'name': product_data.get('name'),
                'brand': product_data.get('brand'),
                'model': product_data.get('model'),
                'price': product_data.get('price'),
                'url': product_data.get('url'),
                'img_url': product_data.get('image_url'),
                'scraped_at': current_time,
                'pipeline_run_id': pipeline_run_id,
                'data_source': 'MobileDokan',
                'is_pipeline_managed': True,
                'updated_at': current_time  # Always set updated_at for both insert and update
            }
            
            # Add specs data, but only for columns that exist in the database
            if 'specs' in product_data:
                for key, value in product_data['specs'].items():
                    if key in valid_columns and value is not None:
                        data[key] = value
            
            # Filter data to only include valid columns
            filtered_data = {k: v for k, v in data.items() if k in valid_columns and v is not None}
            
            # Check if product already exists
            cursor.execute("SELECT id FROM phones WHERE url = %s", (filtered_data['url'],))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing record
                update_fields = []
                update_values = []
                
                for key, value in filtered_data.items():
                    if key != 'url':  # Don't update URL
                        update_fields.append(f"{key} = %s")
                        update_values.append(value)
                
                update_values.append(filtered_data['url'])  # For WHERE clause
                
                update_query = f"""
                    UPDATE phones 
                    SET {', '.join(update_fields)}
                    WHERE url = %s
                """
                
                cursor.execute(update_query, update_values)
                conn.commit()
                conn.close()
                
                return 'updated'
            else:
                # Insert new record - add created_at timestamp
                filtered_data['created_at'] = current_time
                
                columns = list(filtered_data.keys())
                placeholders = ['%s'] * len(columns)
                values = list(filtered_data.values())
                
                insert_query = f"""
                    INSERT INTO phones ({', '.join(columns)})
                    VALUES ({', '.join(placeholders)})
                """
                
                cursor.execute(insert_query, values)
                conn.commit()
                conn.close()
                
                return 'inserted'
                
        except Exception as e:
            logger.error(f"Error storing product in database: {str(e)}")
            return 'error'

    def store_phones_in_database(self, phones: List[Dict[str, Any]], pipeline_run_id: str, 
                                check_updates: bool = True, batch_size: int = 50) -> Dict[str, Any]:
        """
        Store multiple phones in database using enhanced pipeline.
        """
        try:
            logger.info(f"🔄 Storing {len(phones)} phones in database...")
            
            # Convert to DataFrame
            df = self.convert_scraped_data_to_dataframe(phones, pipeline_run_id)
            
            # Process with enhanced pipeline
            if PIPELINE_AVAILABLE:
                result = self.process_with_enhanced_pipeline(df, pipeline_run_id)
            else:
                result = self.process_with_basic_pipeline(df, pipeline_run_id)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to store phones in database: {str(e)}")
            return {
                'products_processed': 0,
                'products_inserted': 0,
                'products_updated': 0,
                'errors': [str(e)]
            }
    
    def _make_request(self, url: str) -> Optional[requests.Response]:
        """
        Make HTTP request with retries.
        """
        try:
            self.rate_limiter.wait()
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
            return response
            
        except requests.exceptions.Timeout:
            logger.warning(f"⚠️ Timeout fetching {url}")
            return None
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ Request error fetching {url}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error fetching {url}: {str(e)}")
            return None
    
    def _extract_phone_data(self, soup: BeautifulSoup, phone_url: str, phone_name: str) -> Dict[str, Any]:
        """
        Extract phone data from BeautifulSoup object.
        """
        try:
            # Extract key specifications
            key_specs = extract_key_specs(soup)

            # Get Model Name and Brand
            name_tag = soup.select_one('#product-specs h2')
            name = name_tag.get_text(strip=True).replace('Full Specifications', '').strip() if name_tag else None

            # Get Price
            price_tag = soup.select_one('.price span.h3')
            price = price_tag.get_text(strip=True) if price_tag else None

            # Get Main Image URL
            img_tag = soup.select_one('img[itemprop="image"].img-fluid')
            image_url = img_tag.get('src') if img_tag else None

            # Initialize specs dictionary with all standard columns
            specs = {col: None for col in STANDARD_COLUMNS if col not in ['url', 'name', 'price', 'img_url']}

            # Merge key specs with other specs
            for key, value in key_specs.items():
                if key in STANDARD_COLUMNS:
                    # Only set the value if it's not None and the current value is None or empty
                    if value is not None and (specs.get(key) is None or specs.get(key) == ''):
                        specs[key] = value
            
            # Process each specification group
            for group in soup.select('.row.mb-2.pb-2.border-bottom'):
                group_title = group.select_one('h3.text-bold')
                if not group_title:
                    continue
                    
                group_name = group_title.get_text(strip=True).lower()
                
                # Handle display group
                if 'display' in group_name:
                    for row in group.select('table.spec-grp-tbl tr'):
                        tds = row.find_all('td')
                        if len(tds) == 2:
                            key = sanitize_key(tds[0].text)
                            value = tds[1].get_text(strip=True)
                            
                            # Map display keys to standard columns
                            if 'type' in key:
                                specs['display_type'] = value
                            elif 'size' in key:
                                specs['screen_size_inches'] = value
                            elif 'resolution' in key:
                                specs['display_resolution'] = value
                            elif 'pixel' in key or 'ppi' in key:
                                specs['pixel_density_ppi'] = value
                            elif 'refresh' in key:
                                specs['refresh_rate_hz'] = value
                            elif 'protection' in key:
                                specs['screen_protection'] = value
                            elif 'brightness' in key:
                                specs['display_brightness'] = value
                            elif 'aspect' in key:
                                specs['aspect_ratio'] = value
                            elif 'hdr' in key:
                                specs['hdr_support'] = value
                                
                # Handle camera groups
                elif 'camera' in group_name or 'cameras' in group_name:
                    # Find all camera subgroups
                    camera_subgroups = group.select('.subgroup')
                    camera_tables = group.select('table.spec-grp-tbl')
                    
                    for i, subgroup in enumerate(camera_subgroups):
                        header = subgroup.get_text(strip=True).lower()
                        table = camera_tables[i] if i < len(camera_tables) else None
                        
                        if not table:
                            continue
                            
                        if 'primary' in header:
                            # Process primary camera specifications
                            for row in table.select('tr'):
                                tds = row.find_all('td')
                                if len(tds) == 2:
                                    key = sanitize_key(tds[0].text)
                                    value = tds[1].get_text(strip=True)
                                    
                                    # Map primary camera keys to standard columns
                                    if 'resolution' in key:
                                        specs['primary_camera_resolution'] = value
                                    elif 'setup' in key:
                                        specs['camera_setup'] = value
                                    elif 'video' in key:
                                        specs['primary_camera_video_recording'] = value
                                    elif 'ois' in key:
                                        specs['primary_camera_ois'] = value
                                    elif 'aperture' in key:
                                        specs['primary_camera_aperture'] = value
                                    elif 'image' in key or 'Image Resolution' in key or 'Image' in key:
                                        specs['image_resolution'] = value
                                    elif 'features' in key:
                                        specs['camera_features'] = value
                                    elif 'autofocus' in key:
                                        specs['autofocus'] = value
                                    elif 'flash' in key:
                                        specs['flash'] = value
                                    elif 'settings' in key:
                                        specs['settings'] = value
                                    elif 'zoom' in key:
                                        specs['zoom'] = value
                                    elif 'shooting' in key:
                                        specs['shooting_modes'] = value
                                    elif 'fps' in key:
                                        specs['video_fps'] = value
                                        
                        elif 'selfie' in header or 'front' in header:
                            # Process selfie camera specifications
                            for row in table.select('tr'):
                                tds = row.find_all('td')
                                if len(tds) == 2:
                                    key = sanitize_key(tds[0].text)
                                    value = tds[1].get_text(strip=True)
                                    
                                    # Map selfie camera keys to standard columns
                                    if 'resolution' in key:
                                        specs['selfie_camera_resolution'] = value
                                    elif 'video' in key:
                                        specs['selfie_camera_video_recording'] = value
                                    elif 'aperture' in key:
                                        specs['selfie_camera_aperture'] = value
                                        
                else:
                    # For other groups, process normally
                    for row in group.select('table.spec-grp-tbl tr'):
                        tds = row.find_all('td')
                        if len(tds) == 2:
                            key = sanitize_key(tds[0].text)
                            value = tds[1].get_text(strip=True)
                            
                            # Map other keys to standard columns
                            if key in specs:
                                specs[key] = value

            # Parse brand and model from name
            brand, model = parse_phone_title(name) if name else ('Unknown', 'Unknown')
            specs['brand'] = brand
            specs['model'] = model

            # Prepare the result
            result = {
                'name': name,
                'brand': brand,
                'model': model,
                'price': price,
                'image_url': image_url,
                'specs': specs,
                'url': phone_url
            }
            
            return result
            
        except Exception as e:
            logger.error(f"⚠️ Failed to extract data for {phone_name}: {str(e)}")
            return {}


# Test function
if __name__ == "__main__":
    scraper = MobileDokanScraper()
    result = scraper.scrape_and_store(max_pages=2)
    
    print(f"Scraping completed:")
    print(f"  - Products processed: {result['products_processed']}")
    print(f"  - Products inserted: {result['products_inserted']}")
    print(f"  - Products updated: {result['products_updated']}")
    print(f"  - Errors: {result['error_count']}")
