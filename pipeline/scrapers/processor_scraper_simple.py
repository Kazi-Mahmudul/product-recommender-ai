#!/usr/bin/env python3
"""
Simple Processor Rankings Scraper (Requests-only, no Selenium)

This is a lightweight alternative that uses only requests and BeautifulSoup
for faster and more reliable processor data scraping.
"""

import requests
import pandas as pd
import time
import re
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import logging

def setup_logging(level: str = 'INFO') -> logging.Logger:
    """Setup logging for the processor scraper"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)

class SimpleProcessorScraper:
    """
    Simple processor scraper using only requests (no Selenium)
    """
    
    def __init__(self):
        self.logger = setup_logging()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
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
        key = str(processor_name).lower()
        # Remove company names
        key = re.sub(r'\\b(qualcomm|mediatek|apple|samsung|google|huawei|hisilicon|unisoc)\\b', '', key)
        # Replace non-alphanumeric with spaces
        key = re.sub(r'[^a-z0-9]+', ' ', key)
        # Normalize whitespace
        key = re.sub(r'\\s+', ' ', key).strip()
        return key
    
    def scrape_page(self, page_number: int) -> List[Dict]:
        """Scrape a single page using requests"""
        try:
            url = f"https://nanoreview.net/en/soc-list/rating?page={page_number}"
            self.logger.info(f"🔍 Scraping page {page_number}: {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the table
            table = soup.find('table', class_='table-list')
            if not table:
                self.logger.info(f"   No table found on page {page_number}")
                return []
            
            rows = table.find_all('tr')[1:]  # Skip header
            
            if not rows:
                self.logger.info(f"   No data rows found on page {page_number}")
                return []
            
            processors = []
            
            for row in rows:
                try:
                    cols = row.find_all('td')
                    
                    if len(cols) >= 8:
                        # Extract data from columns
                        rank_text = cols[0].get_text(strip=True).split('\\n')[0]
                        processor_text = cols[1].get_text(strip=True).split('\\n')[0]
                        rating_text = cols[2].get_text(strip=True)
                        antutu_text = cols[3].get_text(strip=True).split('\\n')[0]
                        geekbench_text = cols[4].get_text(strip=True)
                        cores_text = cols[5].get_text(strip=True)
                        clock_text = cols[6].get_text(strip=True)
                        gpu_text = cols[7].get_text(strip=True)
                        
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
            
            self.logger.info(f"   ✅ Extracted {len(processors)} processors from page {page_number}")
            return processors
            
        except Exception as e:
            self.logger.error(f"   ❌ Error scraping page {page_number}: {str(e)}")
            return []
    
    def scrape_all_pages(self, max_pages: Optional[int] = None) -> pd.DataFrame:
        """Scrape all pages"""
        self.logger.info(f"🚀 Starting simple processor scraping (requests-only)")
        self.logger.info(f"   Max pages: {max_pages or 'ALL'}")
        
        all_processors = []
        page = 1
        consecutive_empty_pages = 0
        max_consecutive_empty = 2
        
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
                    
                    if page == 1:
                        self.logger.error("❌ First page is empty - website might be down")
                        break
                    
                    if consecutive_empty_pages >= max_consecutive_empty:
                        self.logger.info(f"🏁 Reached end: {consecutive_empty_pages} consecutive empty pages")
                        break
                else:
                    consecutive_empty_pages = 0
                    all_processors.extend(processors)
                    self.logger.info(f"   Total processors collected: {len(all_processors)}")
                
                page += 1
                time.sleep(0.5)  # Small delay to be respectful
            
            # Create DataFrame
            if all_processors:
                df = pd.DataFrame(all_processors)
                df = df.sort_values('rank', na_position='last').reset_index(drop=True)
                
                self.logger.info(f"✅ Scraping completed successfully!")
                self.logger.info(f"   Total processors: {len(df)}")
                self.logger.info(f"   Pages scraped: {page - 1}")
                
                return df
            else:
                self.logger.warning("⚠️ No processors found")
                return pd.DataFrame()
                
        except Exception as e:
            self.logger.error(f"❌ Scraping failed: {str(e)}")
            return pd.DataFrame()

def main():
    """Test the simple scraper"""
    scraper = SimpleProcessorScraper()
    df = scraper.scrape_all_pages(max_pages=2)  # Test with 2 pages
    
    if not df.empty:
        print(f"\\n📊 Sample data:")
        for i, row in df.head(3).iterrows():
            print(f"   {row['rank']}. {row['processor']} ({row['company']}) - {row['rating']}")
    else:
        print("❌ No data scraped")

if __name__ == "__main__":
    main()