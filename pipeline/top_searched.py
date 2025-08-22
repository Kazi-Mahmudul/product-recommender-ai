"""
Top Searched Phones Pipeline Component
This module collects search interest data for phones in Bangladesh using Google Trends API (pytrends)
and updates the top_searched table in the database.
"""

import pandas as pd
from pytrends.request import TrendReq
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
import logging
from datetime import datetime
import time
import random

from app.core.database import SessionLocal
from app.models.phone import Phone
from app.models.top_searched import TopSearchedPhone
from app.crud import top_searched as top_searched_crud

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Popular phone brands in Bangladesh
POPULAR_BRANDS = ["samsung","apple","xiaomi","redmi","poco","realme","oppo","vivo","oneplus","infinix","tecno","motorola","google","huawei","nokia","symphony","honor","nothing","iqoo"]

class TopSearchedPipeline:
    def __init__(self):
        # Initialize with more conservative settings to avoid rate limiting
        self.pytrends = TrendReq(hl='en-US', tz=360, timeout=(10, 25))
        self.db: Session = SessionLocal()
        
    def get_popular_phone_keywords(self) -> List[Dict]:
        """
        Get popular phone names from the database to use as keywords for Google Trends
        Returns a list of dictionaries with phone info
        """
        try:
            # Get phones from popular brands (case-insensitive matching)
            phones = self.db.query(Phone).filter(
                func.lower(Phone.brand).in_([brand.lower() for brand in POPULAR_BRANDS])
            ).all()
            
            phone_keywords = []
            
            for phone in phones:
                # Create a clean keyword for searching
                # Combine brand and model for better search results
                keyword = f"{phone.brand} {phone.model}".strip()
                if keyword:
                    phone_keywords.append({
                        'id': phone.id,
                        'name': phone.name,
                        'brand': phone.brand,
                        'model': phone.model,
                        'keyword': keyword
                    })
            
            logger.info(f"Found {len(phone_keywords)} popular phones for trend analysis")
            return phone_keywords
        except Exception as e:
            logger.error(f"Error fetching phone keywords: {str(e)}")
            return []
    
    def get_search_interest_for_chunk(self, chunk: List[str]) -> pd.DataFrame:
        """
        Get search interest data for a chunk of keywords in Bangladesh
        """
        try:
            # Add a small delay to avoid rate limiting
            time.sleep(random.uniform(1, 3))
            
            # Build payload for Google Trends
            self.pytrends.build_payload(
                kw_list=chunk,
                cat=0,  # All categories
                timeframe='today 12-m',  # Last 12 months
                geo='BD',  # Bangladesh
                gprop=''  # Web search
            )
            
            # Get interest over time data
            interest_over_time_df = self.pytrends.interest_over_time()
            
            # Get average interest for each keyword
            if not interest_over_time_df.empty:
                # Remove the 'isPartial' column if it exists
                if 'isPartial' in interest_over_time_df.columns:
                    interest_over_time_df = interest_over_time_df.drop(columns=['isPartial'])
                
                # Calculate average interest for each keyword
                avg_interest = interest_over_time_df.mean().to_dict()
                return pd.DataFrame(list(avg_interest.items()), columns=['keyword', 'search_index'])
            else:
                return pd.DataFrame(columns=['keyword', 'search_index'])
        except Exception as e:
            logger.warning(f"Error processing chunk {chunk}: {str(e)}")
            return pd.DataFrame(columns=['keyword', 'search_index'])
    
    def get_search_interest(self, keywords: List[str]) -> pd.DataFrame:
        """
        Get search interest data for a list of keywords in Bangladesh
        """
        try:
            # Split keywords into chunks of 5 for pytrends limitation
            chunk_size = 5
            chunks = [keywords[i:i + chunk_size] for i in range(0, len(keywords), chunk_size)]
            
            all_results = []
            
            for chunk in chunks:
                try:
                    chunk_df = self.get_search_interest_for_chunk(chunk)
                    if not chunk_df.empty:
                        all_results.append(chunk_df)
                except Exception as e:
                    logger.warning(f"Error processing chunk {chunk}: {str(e)}")
                    continue
            
            # Combine all results
            if all_results:
                combined_df = pd.concat(all_results, ignore_index=True)
                return combined_df
            else:
                return pd.DataFrame(columns=['keyword', 'search_index'])
                
        except Exception as e:
            logger.error(f"Error getting search interest: {str(e)}")
            return pd.DataFrame(columns=['keyword', 'search_index'])
    
    def match_phones_with_trends(self, phone_keywords: List[Dict], trends_df: pd.DataFrame) -> List[Dict]:
        """
        Match phone keywords with trend data and calculate rankings
        """
        try:
            # Create a mapping of keywords to phone info
            keyword_to_phone = {phone['keyword'].lower(): phone for phone in phone_keywords}
            
            # Match trends with phones
            matched_data = []
            for _, row in trends_df.iterrows():
                keyword = row['keyword'].lower()
                if keyword in keyword_to_phone:
                    phone_info = keyword_to_phone[keyword]
                    matched_data.append({
                        'phone_id': phone_info['id'],
                        'phone_name': phone_info['name'],
                        'brand': phone_info['brand'],
                        'model': phone_info['model'],
                        'keyword': keyword,
                        'search_index': float(row['search_index'])
                    })
            
            # Sort by search index (descending) and assign ranks
            matched_data.sort(key=lambda x: x['search_index'], reverse=True)
            
            # Assign ranks (1-based indexing)
            for i, data in enumerate(matched_data):
                data['rank'] = i + 1
            
            logger.info(f"Matched {len(matched_data)} phones with trend data")
            return matched_data
            
        except Exception as e:
            logger.error(f"Error matching phones with trends: {str(e)}")
            return []
    
    def update_database(self, ranked_phones: List[Dict]):
        """
        Update the top_searched table with new rankings
        """
        try:
            # Clear existing data
            top_searched_crud.delete_all_top_searched_phones(self.db)
            
            # Insert new data
            for phone_data in ranked_phones:
                top_searched_crud.create_top_searched_phone(
                    db=self.db,
                    phone_id=phone_data['phone_id'],
                    phone_name=phone_data['phone_name'],
                    brand=phone_data['brand'],
                    model=phone_data['model'],
                    search_index=phone_data['search_index'],
                    rank=phone_data['rank']
                )
            
            self.db.commit()
            logger.info(f"Updated database with {len(ranked_phones)} top searched phones")
            
        except Exception as e:
            logger.error(f"Error updating database: {str(e)}")
            self.db.rollback()
    
    def run(self, limit: int = 10):
        """
        Main pipeline execution method
        """
        try:
            logger.info("Starting top searched phones pipeline")
            
            # Get popular phone keywords
            phone_keywords = self.get_popular_phone_keywords()
            if not phone_keywords:
                logger.warning("No phone keywords found")
                return
            
            # Extract keywords for trend analysis (limit to first 50 to avoid rate limiting)
            keywords = [phone['keyword'] for phone in phone_keywords[:50]]
            
            # Get search interest data
            trends_df = self.get_search_interest(keywords)
            
            # If we couldn't get real data, create some sample data for testing
            if trends_df.empty:
                logger.warning("No trend data found, creating sample data for testing")
                sample_data = []
                for i, phone in enumerate(phone_keywords[:limit]):
                    sample_data.append({
                        'phone_id': phone['id'],
                        'phone_name': phone['name'],
                        'brand': phone['brand'],
                        'model': phone['model'],
                        'keyword': phone['keyword'],
                        'search_index': 100 - (i * 5),  # Decreasing values for ranking
                        'rank': i + 1
                    })
                self.update_database(sample_data)
                return
            
            # Match phones with trends and rank them
            ranked_phones = self.match_phones_with_trends(phone_keywords, trends_df)
            if not ranked_phones:
                logger.warning("No phones matched with trend data")
                return
            
            # Limit to top N phones
            top_phones = ranked_phones[:limit]
            
            # Update database
            self.update_database(top_phones)
            
            logger.info(f"Successfully updated top {len(top_phones)} searched phones")
            
        except Exception as e:
            logger.error(f"Error in top searched pipeline: {str(e)}")
        finally:
            self.db.close()

if __name__ == "__main__":
    # Run the pipeline
    pipeline = TopSearchedPipeline()
    pipeline.run(limit=10)