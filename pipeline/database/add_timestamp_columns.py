#!/usr/bin/env python3
"""
Database Migration: Add Timestamp Columns and Create Missing Tables
Adds missing created_at and updated_at columns to phones and top_searched tables.
Also creates processor_rankings table if missing.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    # Handle postgres:// vs postgresql:// URL schemes
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    return database_url

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table."""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        )
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def check_table_exists(cursor, table_name):
    """Check if a table exists."""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = %s AND table_schema = 'public'
        )
    """, (table_name,))
    return cursor.fetchone()[0]

def create_processor_rankings_table(cursor):
    """Create processor_rankings table if it doesn't exist."""
    logger.info("🔧 Creating processor_rankings table...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS processor_rankings (
            id SERIAL PRIMARY KEY,
            processor_name VARCHAR(255) NOT NULL,
            processor_key VARCHAR(255) UNIQUE NOT NULL,
            rank INTEGER,
            rating DECIMAL(4,2),
            antutu10 INTEGER,
            geekbench6 INTEGER,
            cores VARCHAR(50),
            clock VARCHAR(50),
            gpu VARCHAR(255),
            company VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_processor_rankings_processor_key 
        ON processor_rankings (processor_key)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_processor_rankings_rank 
        ON processor_rankings (rank)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_processor_rankings_company 
        ON processor_rankings (company)
    """)
    
    logger.info("   ✅ Created processor_rankings table with indexes")
    return True

def populate_initial_processor_data(cursor):
    """Populate processor_rankings with initial data if empty."""
    # Check if table has data
    cursor.execute("SELECT COUNT(*) FROM processor_rankings")
    count = cursor.fetchone()[0]
    
    if count > 0:
        logger.info(f"   ✅ processor_rankings already has {count} records")
        return True
    
    logger.info("   📊 Populating initial processor data...")
    
    # Initial processor data (top performers)
    processors = [
        ('Apple A17 Pro', 'apple_a17_pro', 1, 95.5, 1500000, 2800, '6-core', '3.78 GHz', 'Apple GPU', 'Apple'),
        ('Snapdragon 8 Gen 3', 'snapdragon_8_gen_3', 2, 94.2, 1450000, 2700, '8-core', '3.3 GHz', 'Adreno 750', 'Qualcomm'),
        ('Apple A16 Bionic', 'apple_a16_bionic', 3, 92.8, 1400000, 2650, '6-core', '3.46 GHz', 'Apple GPU', 'Apple'),
        ('Snapdragon 8 Gen 2', 'snapdragon_8_gen_2', 4, 91.5, 1350000, 2500, '8-core', '3.2 GHz', 'Adreno 740', 'Qualcomm'),
        ('Dimensity 9300', 'dimensity_9300', 5, 90.2, 1300000, 2400, '8-core', '3.25 GHz', 'Mali-G720', 'MediaTek'),
        ('Google Tensor G3', 'google_tensor_g3', 6, 88.5, 1200000, 2200, '8-core', '2.91 GHz', 'Mali-G715', 'Google'),
        ('Snapdragon 8+ Gen 1', 'snapdragon_8_plus_gen_1', 7, 87.3, 1150000, 2100, '8-core', '3.0 GHz', 'Adreno 730', 'Qualcomm'),
        ('Exynos 2400', 'exynos_2400', 8, 86.1, 1100000, 2000, '8-core', '3.2 GHz', 'Xclipse 940', 'Samsung'),
        ('Dimensity 9200', 'dimensity_9200', 9, 85.0, 1050000, 1950, '8-core', '3.05 GHz', 'Mali-G715', 'MediaTek'),
        ('Snapdragon 7 Gen 3', 'snapdragon_7_gen_3', 10, 82.5, 950000, 1800, '8-core', '2.63 GHz', 'Adreno 720', 'Qualcomm'),
    ]
    
    insert_query = """
        INSERT INTO processor_rankings 
        (processor_name, processor_key, rank, rating, antutu10, geekbench6, cores, clock, gpu, company)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    cursor.executemany(insert_query, processors)
    logger.info(f"   ✅ Inserted {len(processors)} initial processor records")
    return True

def add_timestamp_columns():
    """Add timestamp columns to tables that need them."""
    database_url = get_database_url()
    
    logger.info("🔧 Starting database migration: Add timestamp columns and create missing tables")
    logger.info(f"   Database: {database_url.split('@')[1] if '@' in database_url else 'localhost'}")
    
    conn = psycopg2.connect(database_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    migrations_applied = []
    
    try:
        # Create processor_rankings table if missing
        if not check_table_exists(cursor, 'processor_rankings'):
            create_processor_rankings_table(cursor)
            populate_initial_processor_data(cursor)
            migrations_applied.append("processor_rankings.table_created")
        else:
            logger.info("🔧 processor_rankings table already exists")
            # Check if it has timestamp columns
            if not check_column_exists(cursor, 'processor_rankings', 'created_at'):
                cursor.execute("""
                    ALTER TABLE processor_rankings 
                    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """)
                migrations_applied.append("processor_rankings.created_at")
                logger.info("   ✅ Added created_at column to processor_rankings table")
            
            if not check_column_exists(cursor, 'processor_rankings', 'updated_at'):
                cursor.execute("""
                    ALTER TABLE processor_rankings 
                    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """)
                migrations_applied.append("processor_rankings.updated_at")
                logger.info("   ✅ Added updated_at column to processor_rankings table")
        
        # Check and migrate phones table
        if check_table_exists(cursor, 'phones'):
            logger.info("📱 Checking phones table...")
            
            # Add created_at column if missing
            if not check_column_exists(cursor, 'phones', 'created_at'):
                logger.info("   Adding created_at column to phones table...")
                cursor.execute("""
                    ALTER TABLE phones 
                    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """)
                # Update existing records with a reasonable default
                cursor.execute("""
                    UPDATE phones 
                    SET created_at = NOW() - INTERVAL '30 days'
                    WHERE created_at IS NULL
                """)
                migrations_applied.append("phones.created_at")
                logger.info("   ✅ Added created_at column to phones table")
            else:
                logger.info("   ✅ created_at column already exists in phones table")
            
            # Add updated_at column if missing
            if not check_column_exists(cursor, 'phones', 'updated_at'):
                logger.info("   Adding updated_at column to phones table...")
                cursor.execute("""
                    ALTER TABLE phones 
                    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """)
                # Update existing records with current timestamp
                cursor.execute("""
                    UPDATE phones 
                    SET updated_at = NOW()
                    WHERE updated_at IS NULL
                """)
                migrations_applied.append("phones.updated_at")
                logger.info("   ✅ Added updated_at column to phones table")
            else:
                logger.info("   ✅ updated_at column already exists in phones table")
        else:
            logger.warning("   ⚠️ phones table does not exist")
        
        # Check and migrate top_searched table
        if check_table_exists(cursor, 'top_searched'):
            logger.info("🔍 Checking top_searched table...")
            
            # Add created_at column if missing
            if not check_column_exists(cursor, 'top_searched', 'created_at'):
                logger.info("   Adding created_at column to top_searched table...")
                cursor.execute("""
                    ALTER TABLE top_searched 
                    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """)
                migrations_applied.append("top_searched.created_at")
                logger.info("   ✅ Added created_at column to top_searched table")
            else:
                logger.info("   ✅ created_at column already exists in top_searched table")
            
            # Add updated_at column if missing
            if not check_column_exists(cursor, 'top_searched', 'updated_at'):
                logger.info("   Adding updated_at column to top_searched table...")
                cursor.execute("""
                    ALTER TABLE top_searched 
                    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """)
                migrations_applied.append("top_searched.updated_at")
                logger.info("   ✅ Added updated_at column to top_searched table")
            else:
                logger.info("   ✅ updated_at column already exists in top_searched table")
        else:
            logger.warning("   ⚠️ top_searched table does not exist")
        
        # Create indexes for better performance
        logger.info("📊 Creating performance indexes...")
        
        # Index on phones.updated_at for recent data queries
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_phones_updated_at 
                ON phones (updated_at DESC)
            """)
            logger.info("   ✅ Created index on phones.updated_at")
        except Exception as e:
            logger.warning(f"   ⚠️ Could not create index on phones.updated_at: {e}")
        
        # Index on phones.created_at for new data queries
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_phones_created_at 
                ON phones (created_at DESC)
            """)
            logger.info("   ✅ Created index on phones.created_at")
        except Exception as e:
            logger.warning(f"   ⚠️ Could not create index on phones.created_at: {e}")
        
        # Index on phones.release_date_clean for release date sorting
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_phones_release_date_clean 
                ON phones (release_date_clean DESC)
            """)
            logger.info("   ✅ Created index on phones.release_date_clean")
        except Exception as e:
            logger.warning(f"   ⚠️ Could not create index on phones.release_date_clean: {e}")
        
        # Summary
        logger.info("🎉 Database migration completed successfully!")
        if migrations_applied:
            logger.info(f"   Migrations applied: {', '.join(migrations_applied)}")
        else:
            logger.info("   No migrations needed - all columns and tables already exist")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = add_timestamp_columns()
    sys.exit(0 if success else 1)