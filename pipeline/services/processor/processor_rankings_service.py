"""
Processor Rankings Service for mobile phones.
"""

import logging
import pandas as pd
import numpy as np
import re
import time
import os
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ProcessorRankingsService:
    """
    Handles processor performance rankings from NanoReview.
    """
    
    def __init__(self, database_url: str = None):
        """Initialize the processor rankings service."""
        self.database_url = database_url
        self.cache_file = "processor_rankings_cache.csv"
        logger.info("Processor rankings service initialized")
    
    def _init_selenium(self):
        """Initialize a headless Selenium Chrome driver if available, else return None."""
        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager
            from selenium.webdriver.chrome.options import Options

            chrome_options = Options()
            chrome_options.add_argument('--headless=new')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')

            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
            return driver
        except Exception as e:
            logger.warning(f"Selenium not available: {e}")
            return None

    def scrape_processor_rankings(self, max_pages: int = 10, sleep_sec: float = 1.0) -> pd.DataFrame:
        """
        Scrape all pages of NanoReview SoC rankings into a DataFrame.
        Columns: ['rank','processor','rating','antutu10','geekbench6','cores','clock','gpu','company','processor_key']
        """
        driver = self._init_selenium()
        if driver is None:
            logger.error("Selenium/Chrome not available. Cannot scrape processor rankings.")
            return pd.DataFrame()

        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC

        all_rows = []
        page = 1

        try:
            while page <= max_pages:
                url = f"https://nanoreview.net/en/soc-list/rating?page={page}"
                logger.info(f"Scraping {url}")
                driver.get(url)

                wait = WebDriverWait(driver, 20)
                table = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "table-list")))
                time.sleep(0.5)

                rows = table.find_elements(By.TAG_NAME, "tr")
                if len(rows) <= 1:
                    logger.info("No more rows found; stopping.")
                    break

                new_count = 0
                for row in rows[1:]:
                    try:
                        cols = row.find_elements(By.TAG_NAME, "td")
                        if len(cols) >= 8:
                            all_rows.append({
                                "rank": cols[0].text.split('\n')[0].strip(),
                                "processor": cols[1].text.split('\n')[0].strip(),
                                "rating": cols[2].text.strip(),
                                "antutu10": cols[3].text.split('\n')[0].strip(),
                                "geekbench6": cols[4].text.split('\n')[0].strip(),
                                "cores": cols[5].text.strip(),
                                "clock": cols[6].text.strip(),
                                "gpu": cols[7].text.strip(),
                            })
                            new_count += 1
                    except Exception:
                        continue

                logger.info(f"Page {page}: +{new_count} rows")
                if new_count == 0:
                    break
                page += 1
                time.sleep(sleep_sec)
        finally:
            try:
                driver.quit()
            except Exception:
                pass

        df = pd.DataFrame(all_rows)
        if df.empty:
            logger.error("Failed to scrape processor rankings.")
            return df
        
        # Clean and process data
        df["rank"] = pd.to_numeric(df["rank"], errors="coerce")
        df["antutu10"] = pd.to_numeric(df["antutu10"].str.replace(",", "", regex=False), errors="coerce")

        def _company(p):
            p = str(p)
            if "Snapdragon" in p: return "Qualcomm"
            if "Dimensity" in p or "Helio" in p: return "MediaTek"
            if "Exynos" in p: return "Samsung"
            if "Apple" in p: return "Apple"
            if "Kirin" in p: return "Huawei"
            if "Tensor" in p: return "Google"
            if "Unisoc" in p or "Tiger" in p: return "Unisoc"
            return "Other"
        
        df["company"] = df["processor"].apply(_company)
        df["processor_key"] = (
            df["processor"]
            .astype(str).str.lower()
            .str.replace(r"[^a-z0-9]+", " ", regex=True)
            .str.replace(r"\s+", " ", regex=True)
            .str.strip()
        )
        
        logger.info(f"Successfully scraped {len(df)} processor rankings")
        return df

    def cache_rankings(self, df: pd.DataFrame) -> bool:
        """Store rankings in cache file."""
        try:
            df.to_csv(self.cache_file, index=False)
            logger.info(f"Processor rankings cached to {self.cache_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to cache processor rankings: {e}")
            return False

    def load_cached_rankings(self) -> Optional[pd.DataFrame]:
        """Load rankings from cache file."""
        try:
            if os.path.exists(self.cache_file):
                # Check if cache is recent (less than 7 days old)
                cache_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(self.cache_file))
                if cache_age < timedelta(days=7):
                    df = pd.read_csv(self.cache_file)
                    logger.info(f"Loaded {len(df)} processor rankings from cache")
                    return df
                else:
                    logger.info("Cache is stale, will refresh")
            return None
        except Exception as e:
            logger.error(f"Failed to load cached processor rankings: {e}")
            return None

    def normalize_processor_name(self, name: str) -> str:
        """Normalize processor name for matching."""
        return (
            str(name).lower()
            .replace("qualcomm", "")
            .replace("mediatek", "")
            .replace("apple", "")
            .replace("samsung", "")
            .replace("google", "")
            .replace("huawei", "")
            .replace("hisilicon", "")
            .replace("kirin", "")
            .replace("unisoc", "")
            .strip()
        )

    def get_processor_rank(self, proc_df: pd.DataFrame, processor_name: str) -> Optional[int]:
        """Fuzzy-ish lookup: exact/contains match over normalized 'processor_key'."""
        if pd.isna(processor_name): 
            return None
        
        key = self.normalize_processor_name(processor_name)
        key = re.sub(r'[^a-z0-9]+', ' ', key).strip()
        if not key:
            return None
        
        # Exact match
        exact = proc_df.loc[proc_df["processor_key"] == key, "rank"]
        if len(exact):
            return int(exact.iloc[0])
        
        # Contains match
        cand = proc_df[proc_df["processor_key"].str.contains(key, na=False)]
        if len(cand):
            return int(cand.iloc[0]["rank"])
        
        # Substring match
        cand2 = proc_df[proc_df["processor_key"].apply(lambda s: key in str(s))]
        if len(cand2):
            return int(cand2.iloc[0]["rank"])
        
        return None

    def get_or_refresh_rankings(self, force_refresh: bool = False) -> pd.DataFrame:
        """Get processor rankings from cache, database, or refresh if needed."""
        if not force_refresh:
            cached_df = self.load_cached_rankings()
            if cached_df is not None:
                return cached_df
        
        # Try to load from database first
        db_df = self.load_from_database()
        if not db_df.empty:
            logger.info(f"Loaded {len(db_df)} processor rankings from database")
            return db_df
        
        # Scrape fresh rankings as last resort
        logger.info("Refreshing processor rankings from NanoReview...")
        df = self.scrape_processor_rankings()
        
        if not df.empty:
            self.cache_rankings(df)
        else:
            # Return empty DataFrame with correct columns if scraping fails
            logger.warning("Failed to scrape processor rankings, returning empty DataFrame")
            df = pd.DataFrame(columns=['rank', 'processor', 'processor_key', 'rating', 'company'])
        
        return df
    
    def load_from_database(self) -> pd.DataFrame:
        """Load processor rankings from database."""
        try:
            import psycopg2
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                return pd.DataFrame()
            
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            
            conn = psycopg2.connect(database_url)
            
            query = """
                SELECT processor_name as processor, processor_key, rank, rating, 
                       antutu10, geekbench6, cores, clock, gpu, company
                FROM processor_rankings 
                ORDER BY rank
            """
            
            df = pd.read_sql_query(query, conn)
            conn.close()
            
            return df
            
        except Exception as e:
            logger.error(f"Error loading processor rankings from database: {e}")
            return pd.DataFrame()