#!/usr/bin/env python3
"""
Database Migration: Add Timestamp Columns
Adds missing created_at and updated_at columns to phones and top_searched tables.
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

def add_timestamp_columns():
    """Add timestamp columns to tables that need them."""
    database_url = get_database_url()
    
    logger.info("🔧 Starting database migration: Add timestamp columns")
    logger.info(f"   Database: {database_url.split('@')[1] if '@' in database_url else 'localhost'}")
    
    conn = psycopg2.connect(database_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    migrations_applied = []
    
    try:
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
        
        # Summary
        logger.info("🎉 Database migration completed successfully!")
        if migrations_applied:
            logger.info(f"   Migrations applied: {', '.join(migrations_applied)}")
        else:
            logger.info("   No migrations needed - all columns already exist")
        
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