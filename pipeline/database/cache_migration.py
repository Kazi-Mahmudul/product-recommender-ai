#!/usr/bin/env python3
"""
Database migration for processor cache metadata
"""

import os
import sys
import psycopg2
import logging
from datetime import datetime

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # If python-dotenv is not available, try manual loading
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#') and '=' in line:
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def setup_logging():
    """Setup logging"""
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    return logging.getLogger(__name__)

def migrate_processor_cache_schema():
    """Add cache metadata columns to processor_rankings table"""
    logger = setup_logging()
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL not set")
        return False
    
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        logger.info("🔧 Adding cache metadata columns to processor_rankings table...")
        
        # Add cache metadata columns
        migration_sql = """
        -- Add last_updated column if it doesn't exist
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'processor_rankings' 
                          AND column_name = 'last_updated') THEN
                ALTER TABLE processor_rankings ADD COLUMN last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            END IF;
        END $$;
        
        -- Add data_source column if it doesn't exist
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'processor_rankings' 
                          AND column_name = 'data_source') THEN
                ALTER TABLE processor_rankings ADD COLUMN data_source VARCHAR(20) DEFAULT 'scraped';
            END IF;
        END $$;
        
        -- Update existing rows to have current timestamp if they don't have one
        UPDATE processor_rankings 
        SET last_updated = CURRENT_TIMESTAMP 
        WHERE last_updated IS NULL;
        
        -- Update existing rows to have 'scraped' as data source if they don't have one
        UPDATE processor_rankings 
        SET data_source = 'scraped' 
        WHERE data_source IS NULL;
        """
        
        cursor.execute(migration_sql)
        conn.commit()
        
        logger.info("✅ Cache metadata columns added successfully")
        
        # Verify the migration
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'processor_rankings' 
            AND column_name IN ('last_updated', 'data_source')
            ORDER BY column_name
        """)
        
        columns = cursor.fetchall()
        logger.info("📊 Migration verification:")
        for col in columns:
            logger.info(f"   {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False

def get_cache_age_days():
    """Get the age of cached data in days"""
    logger = setup_logging()
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        return None
    
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT MAX(last_updated) as latest_update,
                   COUNT(*) as total_processors
            FROM processor_rankings
        """)
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result and result[0]:
            latest_update = result[0]
            total_processors = result[1]
            age_days = (datetime.now() - latest_update).total_seconds() / (24 * 3600)
            
            logger.info(f"📊 Cache status: {total_processors} processors, {age_days:.1f} days old")
            return age_days
        else:
            logger.info("📭 No cached data found")
            return None
            
    except Exception as e:
        logger.error(f"❌ Failed to check cache age: {str(e)}")
        return None

if __name__ == "__main__":
    success = migrate_processor_cache_schema()
    if success:
        age = get_cache_age_days()
        if age is not None:
            print(f"Cache age: {age:.1f} days")
        else:
            print("No cached data")
    else:
        print("Migration failed")