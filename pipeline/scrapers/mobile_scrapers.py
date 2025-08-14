#!/usr/bin/env python3
"""
MobileDokan Web Scraper for Pipeline Integration

This script is based on the existing manual scraper (data/mobiledokan_scraper.py)
but adapted for pipeline integration with database operations.
It maintains full compatibility with the existing phone table structure.
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

# Configure logging
logging.basicConfig(level=logging.INFO)
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
            # Get the label text
            label_elem = info.select_one('.text span:first-child')
            if not label_elem:
                continue
                
            label = label_elem.get_text(strip=True)
            
            # Get the value text
            value_elem = info.select_one('.text span.foswald')
            if not value_elem:
                continue
                
            value = value_elem.get_text(strip=True)
            
            # Map to standardized keys
            if 'Main Camera' in label:
                key_specs['main_camera'] = value
                
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
                        
            elif 'Front Camera' in label:
                key_specs['front_camera'] = value
                
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
        
        # Method 3: Check for pagination indicators to confirm we're at the end
        if not product_links:
            # Look for pagination elements that might indicate we're past the last page
            pagination_elements = soup.select('.pagination, .page-numbers, .next, .prev')
            
            # Check if page shows "No products found" or similar messages
            no_products_indicators = [
                'no products found',
                'no items found', 
                'no results',
                'page not found',
                '404'
            ]
            
            page_text = soup.get_text().lower()
            for indicator in no_products_indicators:
                if indicator in page_text:
                    logger.debug(f"Page {page} contains '{indicator}' - likely reached end")
                    return []
        
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
    MobileDokan scraper class for pipeline integration
    """
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url
        self.rate_limiter = RateLimiter(requests_per_minute=30)
        logger.info("MobileDokan scraper initialized")
    
    def get_database_connection(self):
        """Get database connection"""
        if not self.database_url:
            # Fallback to environment variable or hardcoded URL
            import os
            self.database_url = os.getenv("DATABASE_URL")
            if not self.database_url:
                self.database_url = "postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
        
        if self.database_url and self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)
        
        return psycopg2.connect(self.database_url)
    
    def scrape_and_store(self, max_pages: int = None, pipeline_run_id: str = None, check_updates: bool = True) -> Dict[str, Any]:
        """
        Scrape mobile phones and store directly in database
        
        Args:
            max_pages: Maximum number of pages to scrape (None = scrape ALL pages)
            pipeline_run_id: Pipeline run ID for tracking
            check_updates: Whether to check existing products for updates
            
        Returns:
            Dictionary with scraping results
        """
        if max_pages is None:
            logger.info(f"Starting COMPLETE MobileDokan scraping (ALL PAGES, check_updates: {check_updates})")
        else:
            logger.info(f"Starting MobileDokan scraping (max_pages: {max_pages}, check_updates: {check_updates})")
        
        # Collect all product links from ALL pages
        all_product_links = []
        page = 1
        consecutive_empty_pages = 0
        max_consecutive_empty = 5  # Stop after 5 consecutive empty pages (more robust detection)
        total_pages_scraped = 0
        
        while True:
            # Check if we've hit the max_pages limit (if specified)
            if max_pages is not None and page > max_pages:
                logger.info(f"Reached maximum page limit of {max_pages}")
                break
                
            logger.info(f"Scraping page {page}...")
            links = get_product_links(page)
            
            if not links:
                consecutive_empty_pages += 1
                logger.info(f"  - No products found on page {page}. Consecutive empty pages: {consecutive_empty_pages}/{max_consecutive_empty}")
                
                if consecutive_empty_pages >= max_consecutive_empty:
                    logger.info(f"🏁 REACHED END OF CATALOG: Found {consecutive_empty_pages} consecutive empty pages.")
                    logger.info(f"   Total pages with products: {total_pages_scraped}")
                    logger.info(f"   Last page with products: {page - consecutive_empty_pages}")
                    break
                    
                # Continue to next page even if this one is empty
                logger.info(f"   Continuing to check page {page + 1}...")
                page += 1
                time.sleep(2)  # Longer delay for empty pages
                continue
            
            # Found products on this page
            consecutive_empty_pages = 0  # Reset counter
            all_product_links.extend(links)
            total_pages_scraped += 1
            logger.info(f"  ✅ Found {len(links)} product links on page {page} (Total pages with products: {total_pages_scraped})")
            
            # Log progress every 25 pages
            if total_pages_scraped % 25 == 0:
                logger.info(f"📊 PROGRESS UPDATE: Scraped {total_pages_scraped} pages, found {len(all_product_links)} total products")
            
            page += 1
            time.sleep(1)  # Be respectful to the server
        
        # Remove duplicates
        unique_links = list(dict.fromkeys(all_product_links))
        
        # Log comprehensive discovery results
        logger.info(f"🎯 DISCOVERY COMPLETE!")
        logger.info(f"   📄 Total pages checked: {page - 1}")
        logger.info(f"   ✅ Pages with products: {total_pages_scraped}")
        logger.info(f"   📱 Total product links found: {len(all_product_links)}")
        logger.info(f"   🔗 Unique product links: {len(unique_links)}")
        logger.info(f"   📊 Average products per page: {len(unique_links) / total_pages_scraped if total_pages_scraped > 0 else 0:.1f}")
        
        if total_pages_scraped >= 200:
            logger.info(f"   🌟 MASSIVE CATALOG: Found 200+ pages! This is a comprehensive scraping.")
        elif total_pages_scraped >= 100:
            logger.info(f"   🚀 LARGE CATALOG: Found 100+ pages with products.")
        elif total_pages_scraped >= 50:
            logger.info(f"   📈 MEDIUM CATALOG: Found 50+ pages with products.")
        else:
            logger.info(f"   📋 SMALL CATALOG: Found {total_pages_scraped} pages with products.")
        
        # Get existing URLs and their last update times
        existing_data = self.get_existing_urls_with_dates()
        existing_urls = set(existing_data.keys())
        logger.info(f"Found {len(existing_urls)} existing URLs in database")
        
        # Separate new URLs and existing URLs to check for updates
        new_urls = [url for url in unique_links if url not in existing_urls]
        existing_urls_to_check = []
        
        if check_updates:
            # Check existing URLs that haven't been updated in the last 24 hours
            from datetime import datetime, timedelta
            cutoff_time = datetime.now() - timedelta(hours=24)
            
            for url in unique_links:
                if url in existing_urls:
                    last_update = existing_data[url]
                    if last_update is None or last_update < cutoff_time:
                        existing_urls_to_check.append(url)
            
            logger.info(f"Will check {len(existing_urls_to_check)} existing URLs for updates")
        
        logger.info(f"Will process {len(new_urls)} new URLs and {len(existing_urls_to_check)} existing URLs")
        
        # Process new products
        processed_count = 0
        inserted_count = 0
        updated_count = 0
        errors = []
        
        # Process new URLs
        all_urls_to_process = new_urls + existing_urls_to_check
        
        for i, url in enumerate(tqdm(all_urls_to_process, desc="Scraping products")):
            try:
                product_data = get_product_specs(url, self.rate_limiter)
                if product_data:
                    # Store in database
                    result = self.store_product_in_database(product_data, pipeline_run_id)
                    if result == 'inserted':
                        inserted_count += 1
                    elif result == 'updated':
                        updated_count += 1
                    
                    processed_count += 1
                    
                    # Log progress every 10 products
                    if (i + 1) % 10 == 0:
                        logger.info(f"Processed {i + 1}/{len(all_urls_to_process)} products")
                        
            except Exception as e:
                error_msg = f"Error processing {url}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        result = {
            'status': 'success',
            'total_links_found': len(unique_links),
            'new_links_processed': len(new_urls),
            'existing_links_checked': len(existing_urls_to_check),
            'products_processed': processed_count,
            'products_inserted': inserted_count,
            'products_updated': updated_count,
            'errors': errors,
            'error_count': len(errors)
        }
        
        logger.info(f"Scraping completed: {processed_count} products processed, {inserted_count} inserted, {updated_count} updated")
        return result
    
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
            data = {
                'name': product_data.get('name'),
                'brand': product_data.get('brand'),
                'model': product_data.get('model'),
                'price': product_data.get('price'),
                'url': product_data.get('url'),
                'img_url': product_data.get('image_url'),
                'scraped_at': datetime.now(),
                'pipeline_run_id': pipeline_run_id,
                'data_source': 'MobileDokan',
                'is_pipeline_managed': True
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
                # Insert new record
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


# Test function
if __name__ == "__main__":
    scraper = MobileDokanScraper()
    result = scraper.scrape_and_store(max_pages=2)
    
    print(f"Scraping completed:")
    print(f"  - Products processed: {result['products_processed']}")
    print(f"  - Products inserted: {result['products_inserted']}")
    print(f"  - Products updated: {result['products_updated']}")
    print(f"  - Errors: {result['error_count']}")