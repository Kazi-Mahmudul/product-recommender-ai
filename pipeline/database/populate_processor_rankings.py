#!/usr/bin/env python3
"""
Populate processor rankings table with initial data
"""

import os
import sys
import psycopg2
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def populate_processor_rankings():
    """Populate processor rankings with initial data."""
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres')
    
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    # Initial processor data (top performers)
    processors = [
        ('Apple A17 Pro', 'apple a17 pro', 1, 95.5, 1500000, 2800, '6-core', '3.78 GHz', 'Apple GPU', 'Apple'),
        ('Snapdragon 8 Gen 3', 'snapdragon 8 gen 3', 2, 94.2, 1450000, 2700, '8-core', '3.3 GHz', 'Adreno 750', 'Qualcomm'),
        ('Apple A16 Bionic', 'apple a16 bionic', 3, 92.8, 1400000, 2650, '6-core', '3.46 GHz', 'Apple GPU', 'Apple'),
        ('Snapdragon 8 Gen 2', 'snapdragon 8 gen 2', 4, 91.5, 1350000, 2500, '8-core', '3.2 GHz', 'Adreno 740', 'Qualcomm'),
        ('Dimensity 9300', 'dimensity 9300', 5, 90.2, 1300000, 2400, '8-core', '3.25 GHz', 'Mali-G720', 'MediaTek'),
        ('Google Tensor G3', 'google tensor g3', 6, 88.5, 1200000, 2200, '8-core', '2.91 GHz', 'Mali-G715', 'Google'),
        ('Snapdragon 8+ Gen 1', 'snapdragon 8 gen 1', 7, 87.3, 1150000, 2100, '8-core', '3.0 GHz', 'Adreno 730', 'Qualcomm'),
        ('Exynos 2400', 'exynos 2400', 8, 86.1, 1100000, 2000, '8-core', '3.2 GHz', 'Xclipse 940', 'Samsung'),
        ('Dimensity 9200', 'dimensity 9200', 9, 85.0, 1050000, 1950, '8-core', '3.05 GHz', 'Mali-G715', 'MediaTek'),
        ('Snapdragon 7 Gen 3', 'snapdragon 7 gen 3', 10, 82.5, 950000, 1800, '8-core', '2.63 GHz', 'Adreno 720', 'Qualcomm'),
    ]
    
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