#!/usr/bin/env python3
"""
Processor Rankings Scraper

This script scrapes processor rankings from NanoReview with proper rate limiting,
error handling, and caching mechanisms.
"""

import argparse
import os
import sys
import time
import random
import re
import pandas as pd
from typing import List, Dict, Optional
import logging
from datetime import datetime
import psycopg2

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

def setup_logging(level: str = 'INFO') -> logging.Logger:
    """Setup logging for the processor scraper"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

class ProcessorRankingScraper:
    """
    Scraper for processor rankings from NanoReview
    """
    
    def __init__(self, requests_per_minute: int = 0):  # 0 = no rate limit
        self.requests_per_minute = requests_per_minute
        self.request_times = []
        self.logger = setup_logging()
        self.driver = None
        
    def _init_selenium(self):
        """Initialize Selenium WebDriver with proper configuration"""
        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.service import Service
            from selenium.webdriver.chrome.options import Options
            from webdriver_manager.chrome import ChromeDriverManager
            
            chrome_options = Options()
            chrome_options.add_argument('--headless=new')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
            
            # Try to use system Chrome first, then download if needed
            try:
                self.driver = webdriver.Chrome(options=chrome_options)
            except Exception:
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
            
            self.logger.info("✅ Selenium WebDriver initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Selenium: {str(e)}")
            return False
    
    def _rate_limit(self):
        """Apply minimal delay to avoid being blocked"""
        # Only apply rate limiting if explicitly set
        if self.requests_per_minute > 0:
            now = time.time()
            
            # Remove requests older than 1 minute
            self.request_times = [t for t in self.request_times if now - t < 60]
            
            # If we've made too many requests, wait
            if len(self.request_times) >= self.requests_per_minute:
                sleep_time = 60 - (now - self.request_times[0])
                if sleep_time > 0:
                    self.logger.info(f"⏳ Rate limiting: waiting {sleep_time:.1f} seconds...")
                    time.sleep(sleep_time)
            
            # Record this request
            self.request_times.append(now)
        
        # Minimal delay to appear human-like (optimized for speed)
        delay = random.uniform(0.2, 0.5)  # Further reduced to 0.2-0.5 seconds
        time.sleep(delay)
    
    def _extract_company(self, processor_name: str) -> str:
        """Extract company name from processor name"""
        processor_name = str(processor_name).lower()
        
        if "snapdragon" in processor_name:
            return "Qualcomm"
        elif "dimensity" in processor_name or "helio" in processor_name:
            return "MediaTek"
        elif "exynos" in processor_name:
            return "Samsung"
        elif "apple" in processor_name or "a1" in processor_name:
            return "Apple"
        elif "kirin" in processor_name:
            return "Huawei"
        elif "tensor" in processor_name:
            return "Google"
        elif "unisoc" in processor_name or "tiger" in processor_name:
            return "Unisoc"
        else:
            return "Other"
    
    def _create_processor_key(self, processor_name: str) -> str:
        """Create a normalized processor key for matching"""
        import re
        
        key = str(processor_name).lower()
        # Remove company names
        key = re.sub(r'\b(qualcomm|mediatek|apple|samsung|google|huawei|hisilicon|unisoc)\b', '', key)
        # Replace non-alphanumeric with spaces
        key = re.sub(r'[^a-z0-9]+', ' ', key)
        # Normalize whitespace
        key = re.sub(r'\s+', ' ', key).strip()
        
        return key
    
    def scrape_page(self, page_number: int) -> List[Dict]:
        """
        Scrape a single page of processor rankings
        
        Args:
            page_number: Page number to scrape
            
        Returns:
            List of processor dictionaries
        """
        if not self.driver:
            if not self._init_selenium():
                raise Exception("Failed to initialize Selenium WebDriver")
        
        try:
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            
            # Apply rate limiting
            self._rate_limit()
            
            url = f"https://nanoreview.net/en/soc-list/rating?page={page_number}"
            self.logger.info(f"🔍 Scraping page {page_number}: {url}")
            
            self.driver.get(url)
            
            # Wait for the page to load (optimized timeout)
            wait = WebDriverWait(self.driver, 5)
            
            # Check if we're redirected or if page doesn't exist
            current_url = self.driver.current_url
            if f"page={page_number}" not in current_url and page_number > 1:
                self.logger.info(f"   Page {page_number} redirected to {current_url} - likely doesn't exist")
                return []
            
            # Check for specific "no results" or error messages
            try:
                # More specific selectors for actual error messages
                error_selectors = [
                    "//div[contains(@class, 'no-results')]",
                    "//div[contains(@class, 'error')]",
                    "//p[contains(text(), 'No results found')]",
                    "//div[contains(text(), 'Page not found')]"
                ]
                
                for selector in error_selectors:
                    error_elements = self.driver.find_elements(By.XPATH, selector)
                    if error_elements:
                        element_text = error_elements[0].text.strip()
                        if element_text and len(element_text) > 10:  # Only meaningful error messages
                            self.logger.info(f"   Page {page_number} shows error: {element_text}")
                            return []
            except:
                pass
            
            # Wait for the table to load (reduced timeout for faster detection)
            try:
                table = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "table-list")))
            except:
                self.logger.info(f"   No table found on page {page_number} - page likely doesn't exist")
                return []
            
            # Minimal delay to ensure content is loaded (reduced from 1 second)
            time.sleep(0.2)
            
            # Extract table rows
            rows = table.find_elements(By.TAG_NAME, "tr")
            
            if len(rows) <= 1:  # Only header row
                self.logger.info(f"   No data rows found on page {page_number}")
                return []
            
            processors = []
            
            for row in rows[1:]:  # Skip header row
                try:
                    cols = row.find_elements(By.TAG_NAME, "td")
                    
                    if len(cols) >= 8:
                        # Extract data from columns
                        rank_text = cols[0].text.split('\n')[0].strip()
                        processor_text = cols[1].text.split('\n')[0].strip()
                        rating_text = cols[2].text.strip()
                        antutu_text = cols[3].text.split('\n')[0].strip()
                        geekbench_text = cols[4].text.split('\n')[0].strip()
                        cores_text = cols[5].text.strip()
                        clock_text = cols[6].text.strip()
                        gpu_text = cols[7].text.strip()
                        
                        # Clean and convert data
                        try:
                            rank = int(rank_text) if rank_text.isdigit() else None
                        except ValueError:
                            rank = None
                        
                        try:
                            antutu = int(antutu_text.replace(",", "")) if antutu_text.replace(",", "").isdigit() else None
                        except ValueError:
                            antutu = None
                        
                        # Create processor record
                        processor = {
                            'rank': rank,
                            'processor': processor_text,
                            'rating': rating_text,
                            'antutu10': antutu,
                            'geekbench6': geekbench_text,
                            'cores': cores_text,
                            'clock': clock_text,
                            'gpu': gpu_text,
                            'company': self._extract_company(processor_text),
                            'processor_key': self._create_processor_key(processor_text)
                        }
                        
                        processors.append(processor)
                        
                except Exception as e:
                    self.logger.warning(f"   Error processing row: {str(e)}")
                    continue
            
            self.logger.info(f"   Extracted {len(processors)} processors from page {page_number}")
            return processors
            
        except Exception as e:
            self.logger.error(f"❌ Error scraping page {page_number}: {str(e)}")
            return []
    
    def scrape_all_pages(self, max_pages: Optional[int] = None) -> pd.DataFrame:
        """
        Scrape all pages of processor rankings
        
        Args:
            max_pages: Maximum number of pages to scrape (None = all pages)
            
        Returns:
            DataFrame with all processor data
        """
        self.logger.info(f"🚀 Starting processor rankings scraping")
        self.logger.info(f"   Max pages: {max_pages or 'ALL'}")
        rate_limit_msg = f"{self.requests_per_minute} requests/minute" if self.requests_per_minute > 0 else "NO RATE LIMIT (fast mode)"
        self.logger.info(f"   Rate limit: {rate_limit_msg}")
        
        all_processors = []
        page = 1
        consecutive_empty_pages = 0
        max_consecutive_empty = 2  # Reduced from 3 to 2 for faster detection
        
        try:
            while True:
                # Check page limit
                if max_pages and page > max_pages:
                    self.logger.info(f"🏁 Reached maximum page limit: {max_pages}")
                    break
                
                # Scrape page
                processors = self.scrape_page(page)
                
                if not processors:
                    consecutive_empty_pages += 1
                    self.logger.info(f"   Empty page {page}. Consecutive empty: {consecutive_empty_pages}/{max_consecutive_empty}")
                    
                    # If this is page 1 and it's empty, something is wrong
                    if page == 1:
                        self.logger.error("❌ First page is empty - website might be down or structure changed")
                        break
                    
                    if consecutive_empty_pages >= max_consecutive_empty:
                        self.logger.info(f"🏁 Reached end of available pages: {consecutive_empty_pages} consecutive empty pages")
                        break
                else:
                    consecutive_empty_pages = 0
                    all_processors.extend(processors)
                    self.logger.info(f"   Total processors collected: {len(all_processors)}")
                
                page += 1
            
            # Create DataFrame
            if all_processors:
                df = pd.DataFrame(all_processors)
                
                # Sort by rank
                df = df.sort_values('rank', na_position='last').reset_index(drop=True)
                
                self.logger.info(f"✅ Scraping completed successfully!")
                self.logger.info(f"   Total processors: {len(df)}")
                self.logger.info(f"   Pages scraped: {page - 1}")
                self.logger.info(f"   Companies found: {df['company'].nunique()}")
                
                return df
            else:
                self.logger.warning("⚠️ No processors found")
                return pd.DataFrame()
                
        except Exception as e:
            self.logger.error(f"❌ Scraping failed: {str(e)}")
            raise e
        finally:
            self._cleanup()
    
    def _cleanup(self):
        """Clean up resources"""
        if self.driver:
            try:
                self.driver.quit()
                self.logger.info("🧹 WebDriver cleaned up")
            except Exception as e:
                self.logger.warning(f"Warning during cleanup: {str(e)}")

def save_to_database(df: pd.DataFrame, logger: logging.Logger) -> bool:
    """Save processor data to database"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.info("ℹ️ DATABASE_URL not set, skipping database save")
        return False
    
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Clear existing data
        cursor.execute("DELETE FROM processor_rankings")
        logger.info("🗑️ Cleared existing processor rankings from database")
        
        # Prepare data for insertion
        processors = []
        for _, row in df.iterrows():
            # Clean processor name (remove newlines)
            processor_name = str(row['processor']).replace('\n', ' ').strip()
            
            # Extract numeric rating from strings like "98 A+"
            rating = None
            if pd.notna(row['rating']):
                rating_str = str(row['rating'])
                # Extract first number from rating string
                rating_match = re.search(r'(\d+(?:\.\d+)?)', rating_str)
                if rating_match:
                    rating = float(rating_match.group(1))
            
            # Extract first number from geekbench6 strings like "2927 / 9000"
            geekbench6 = None
            if pd.notna(row['geekbench6']):
                geekbench6_str = str(row['geekbench6'])
                geekbench6_match = re.search(r'(\d+)', geekbench6_str)
                if geekbench6_match:
                    geekbench6 = int(geekbench6_match.group(1))
            
            processors.append((
                processor_name,
                str(row['processor_key']),
                int(row['rank']) if pd.notna(row['rank']) else None,
                rating,
                int(row['antutu10']) if pd.notna(row['antutu10']) else None,
                geekbench6,
                str(row['cores']) if pd.notna(row['cores']) else None,
                str(row['clock']) if pd.notna(row['clock']) else None,
                str(row['gpu']) if pd.notna(row['gpu']) else None,
                str(row['company']) if pd.notna(row['company']) else None
            ))
        
        # Insert new data
        insert_query = """
            INSERT INTO processor_rankings 
            (processor_name, processor_key, rank, rating, antutu10, geekbench6, cores, clock, gpu, company)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.executemany(insert_query, processors)
        conn.commit()
        
        logger.info(f"💾 Saved {len(processors)} processors to database")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to save to database: {str(e)}")
        return False

def main():
    """Main function for standalone execution"""
    parser = argparse.ArgumentParser(description='Processor Rankings Scraper')
    parser.add_argument('--max-pages', type=int, help='Maximum pages to scrape')
    parser.add_argument('--output-file', default='pipeline/cache/processor_rankings.csv', help='Output CSV file')
    parser.add_argument('--force-update', type=str, default='false', help='Force update even if cache is fresh')
    parser.add_argument('--save-to-db', type=str, default='true', help='Save to database (requires DATABASE_URL)')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARN', 'ERROR'], help='Logging level')
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging(args.log_level)
    
    # Parse arguments
    force_update = args.force_update.lower() == 'true'
    save_to_db = args.save_to_db.lower() == 'true'
    
    logger.info(f"🔧 Processor Rankings Scraper")
    logger.info(f"   Max pages: {args.max_pages or 'ALL'}")
    logger.info(f"   Output file: {args.output_file}")
    logger.info(f"   Force update: {force_update}")
    logger.info(f"   Save to database: {save_to_db}")
    
    try:
        # Check if we should use cached data
        if os.path.exists(args.output_file) and not force_update:
            # Check file age
            file_age_days = (time.time() - os.path.getmtime(args.output_file)) / (24 * 3600)
            
            if file_age_days < 7:  # Use cache if less than 7 days old
                logger.info(f"✅ Using cached data (age: {file_age_days:.1f} days)")
                df = pd.read_csv(args.output_file)
                logger.info(f"   Cached processors: {len(df)}")
                return
        
        # Create scraper and run (no rate limit for faster scraping)
        scraper = ProcessorRankingScraper(requests_per_minute=0)
        df = scraper.scrape_all_pages(max_pages=args.max_pages)
        
        if not df.empty:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(args.output_file), exist_ok=True)
            
            # Save to CSV
            df.to_csv(args.output_file, index=False)
            logger.info(f"💾 Saved {len(df)} processors to {args.output_file}")
            
            # Save to database if requested
            if save_to_db:
                db_success = save_to_database(df, logger)
                if db_success:
                    logger.info("✅ Successfully saved to database")
                else:
                    logger.warning("⚠️ Failed to save to database (CSV file still available)")
            else:
                logger.info("ℹ️ Database save disabled")
            
            # Show sample data
            logger.info("📊 Sample data:")
            for i, row in df.head(3).iterrows():
                logger.info(f"   {row['rank']}. {row['processor']} ({row['company']}) - {row['rating']}")
        else:
            logger.error("❌ No data scraped")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("⏹️ Scraping interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Scraping failed: {str(e)}")
        import traceback
        logger.error(f"   Error details: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    main()