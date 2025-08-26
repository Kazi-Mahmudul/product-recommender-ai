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
import pandas as pd
from typing import List, Dict, Optional
import logging
from datetime import datetime

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
    
    def __init__(self, requests_per_minute: int = 20):
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
        """Apply rate limiting to avoid being blocked"""
        now = time.time()
        
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if now - t < 60]
        
        # If we've made too many requests, wait
        if len(self.request_times) >= self.requests_per_minute:
            sleep_time = 60 - (now - self.request_times[0])
            if sleep_time > 0:
                self.logger.info(f"⏳ Rate limiting: waiting {sleep_time:.1f} seconds...")
                time.sleep(sleep_time)
        
        # Add random delay to appear more human-like
        delay = random.uniform(2, 5)
        time.sleep(delay)
        
        # Record this request
        self.request_times.append(now)
    
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
            
            # Wait for the table to load
            wait = WebDriverWait(self.driver, 20)
            table = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "table-list")))
            
            # Small delay to ensure content is fully loaded
            time.sleep(1)
            
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
        self.logger.info(f"   Rate limit: {self.requests_per_minute} requests/minute")
        
        all_processors = []
        page = 1
        consecutive_empty_pages = 0
        max_consecutive_empty = 3
        
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
                    
                    if consecutive_empty_pages >= max_consecutive_empty:
                        self.logger.info(f"🏁 Reached end of data: {consecutive_empty_pages} consecutive empty pages")
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
                df = df.sort_values('rank', na_last=True).reset_index(drop=True)
                
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

def main():
    """Main function for standalone execution"""
    parser = argparse.ArgumentParser(description='Processor Rankings Scraper')
    parser.add_argument('--max-pages', type=int, help='Maximum pages to scrape')
    parser.add_argument('--output-file', default='data_cleaning/processor_rankings.csv', help='Output CSV file')
    parser.add_argument('--force-update', type=str, default='false', help='Force update even if cache is fresh')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARN', 'ERROR'], help='Logging level')
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging(args.log_level)
    
    # Parse force update
    force_update = args.force_update.lower() == 'true'
    
    logger.info(f"🔧 Processor Rankings Scraper")
    logger.info(f"   Max pages: {args.max_pages or 'ALL'}")
    logger.info(f"   Output file: {args.output_file}")
    logger.info(f"   Force update: {force_update}")
    
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
        
        # Create scraper and run
        scraper = ProcessorRankingScraper(requests_per_minute=20)
        df = scraper.scrape_all_pages(max_pages=args.max_pages)
        
        if not df.empty:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(args.output_file), exist_ok=True)
            
            # Save to CSV
            df.to_csv(args.output_file, index=False)
            logger.info(f"💾 Saved {len(df)} processors to {args.output_file}")
            
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