#!/usr/bin/env python3
"""
Populate processor rankings table with scraped data from CSV
"""

import os
import sys
import psycopg2
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_processors_from_csv(csv_file='pipeline/cache/processor_rankings.csv'):
    """Load processor data from CSV file."""
    if not os.path.exists(csv_file):
        logger.error(f"CSV file not found: {csv_file}")
        return None
    
    try:
        df = pd.read_csv(csv_file)
        logger.info(f"Loaded {len(df)} processors from {csv_file}")
        
        processors = []
        for _, row in df.iterrows():
            # Clean processor name (remove newlines)
            processor_name = str(row['processor']).replace('\n', ' ').strip()
            
            processors.append((
                processor_name,
                str(row['processor_key']),
                int(row['rank']) if pd.notna(row['rank']) else None,
                str(row['rating']) if pd.notna(row['rating']) else None,
                int(row['antutu10']) if pd.notna(row['antutu10']) else None,
                str(row['geekbench6']) if pd.notna(row['geekbench6']) else None,
                str(row['cores']) if pd.notna(row['cores']) else None,
                str(row['clock']) if pd.notna(row['clock']) else None,
                str(row['gpu']) if pd.notna(row['gpu']) else None,
                str(row['company']) if pd.notna(row['company']) else None
            ))
        
        return processors
        
    except Exception as e:
        logger.error(f"Error loading CSV file: {e}")
        return None

def populate_processor_rankings(csv_file='pipeline/cache/processor_rankings.csv'):
    """Populate processor rankings with data from CSV file."""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    # Load processors from CSV
    processors = load_processors_from_csv(csv_file)
    if not processors:
        logger.error("Failed to load processor data from CSV")
        return False
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Clear existing data
        cursor.execute("DELETE FROM processor_rankings")
        logger.info("Cleared existing processor rankings")
        
        # Insert new data
        insert_query = """
            INSERT INTO processor_rankings 
            (processor_name, processor_key, rank, rating, antutu10, geekbench6, cores, clock, gpu, company)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.executemany(insert_query, processors)
        conn.commit()
        
        logger.info(f"Inserted {len(processors)} processor rankings")
        
        # Verify insertion
        cursor.execute("SELECT COUNT(*) FROM processor_rankings")
        count = cursor.fetchone()[0]
        logger.info(f"Total processor rankings in database: {count}")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"Error populating processor rankings: {e}")
        return False

if __name__ == "__main__":
    if populate_processor_rankings():
        print("✅ Processor rankings populated successfully!")
    else:
        print("❌ Failed to populate processor rankings")
        sys.exit(1)