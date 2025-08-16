#!/usr/bin/env python3
"""
Database Analysis and Migration Script
Analyzes current database structure and applies necessary migrations for enhanced pipeline.
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

class DatabaseMigrator:
    def __init__(self, database_url):
        self.database_url = database_url
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)
    
    def get_connection(self):
        """Get database connection."""
        return psycopg2.connect(self.database_url)
    
    def analyze_current_structure(self):
        """Analyze current database structure."""
        logger.info("Analyzing current database structure...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        analysis = {
            'tables': {},
            'indexes': [],
            'missing_tables': [],
            'missing_columns': []
        }
        
        try:
            # Check existing tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            existing_tables = [row[0] for row in cursor.fetchall()]
            analysis['tables']['existing'] = existing_tables
            
            # Check if phones table exists
            if 'phones' in existing_tables:
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'phones'
                    ORDER BY ordinal_position
                """)
                phones_columns = cursor.fetchall()
                analysis['tables']['phones_columns'] = phones_columns
                logger.info(f"Found phones table with {len(phones_columns)} columns")
            else:
                analysis['missing_tables'].append('phones')
                logger.warning("phones table not found!")
            
            # Check if processor_rankings table exists
            if 'processor_rankings' not in existing_tables:
                analysis['missing_tables'].append('processor_rankings')
                logger.info("processor_rankings table needs to be created")
            
            # Check for missing columns in phones table
            if 'phones' in existing_tables:
                existing_columns = [col[0] for col in phones_columns]
                required_columns = [
                    'price_original', 'price_category', 'price_per_gb', 'price_per_gb_ram',
                    'screen_size_numeric', 'resolution_width', 'resolution_height',
                    'ppi_numeric', 'refresh_rate_numeric', 'display_score',
                    'camera_count', 'primary_camera_mp', 'selfie_camera_mp', 'camera_score',
                    'ram_gb', 'storage_gb', 'processor_rank', 'performance_score',
                    'battery_capacity_numeric', 'charging_wattage', 'has_fast_charging',
                    'has_wireless_charging', 'battery_score', 'connectivity_score',
                    'security_score', 'overall_device_score', 'is_popular_brand',
                    'slug', 'data_quality_score', 'last_price_check'
                ]
                
                missing_columns = [col for col in required_columns if col not in existing_columns]
                analysis['missing_columns'] = missing_columns
                logger.info(f"Found {len(missing_columns)} missing columns in phones table")
            
            # Check existing indexes
            cursor.execute("""
                SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname
            """)
            analysis['indexes'] = cursor.fetchall()
            
        except Exception as e:
            logger.error(f"Error analyzing database: {e}")
        finally:
            conn.close()
        
        return analysis  
  
    def execute_migration_file(self, migration_file):
        """Execute a migration SQL file."""
        logger.info(f"Executing migration: {migration_file}")
        
        try:
            with open(migration_file, 'r') as f:
                sql_content = f.read()
            
            conn = self.get_connection()
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            
            # Split SQL content by statements (simple approach)
            statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
            
            for statement in statements:
                if statement.strip():
                    try:
                        cursor.execute(statement)
                        logger.debug(f"Executed: {statement[:100]}...")
                    except psycopg2.Error as e:
                        if "already exists" in str(e).lower():
                            logger.info(f"Skipping existing object: {str(e)}")
                        else:
                            logger.error(f"Error executing statement: {e}")
                            logger.error(f"Statement: {statement}")
            
            conn.close()
            logger.info(f"Migration {migration_file} completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error executing migration {migration_file}: {e}")
            return False
    
    def apply_migrations(self):
        """Apply all necessary migrations."""
        logger.info("Starting database migrations...")
        
        migration_files = [
            'migrations/001_create_processor_rankings.sql',
            'migrations/002_add_derived_columns_to_phones.sql',
            'migrations/003_create_performance_indexes.sql'
        ]
        
        success_count = 0
        for migration_file in migration_files:
            full_path = os.path.join(os.path.dirname(__file__), migration_file)
            if os.path.exists(full_path):
                if self.execute_migration_file(full_path):
                    success_count += 1
            else:
                logger.warning(f"Migration file not found: {full_path}")
        
        logger.info(f"Applied {success_count}/{len(migration_files)} migrations successfully")
        return success_count == len(migration_files)
    
    def verify_migrations(self):
        """Verify that migrations were applied correctly."""
        logger.info("Verifying migrations...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        verification_results = {
            'processor_rankings_table': False,
            'phones_new_columns': 0,
            'indexes_created': 0
        }
        
        try:
            # Check processor_rankings table
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'processor_rankings'
            """)
            if cursor.fetchone()[0] > 0:
                verification_results['processor_rankings_table'] = True
                logger.info("✓ processor_rankings table exists")
            
            # Check new columns in phones table
            new_columns = [
                'price_original', 'overall_device_score', 'display_score',
                'camera_score', 'battery_score', 'performance_score'
            ]
            
            for column in new_columns:
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_name = 'phones' AND column_name = %s
                """, (column,))
                if cursor.fetchone()[0] > 0:
                    verification_results['phones_new_columns'] += 1
            
            logger.info(f"✓ {verification_results['phones_new_columns']}/{len(new_columns)} new columns found in phones table")
            
            # Check some key indexes
            key_indexes = [
                'idx_phones_price_original',
                'idx_phones_overall_device_score',
                'idx_processor_rankings_rank'
            ]
            
            for index in key_indexes:
                cursor.execute("""
                    SELECT COUNT(*) FROM pg_indexes 
                    WHERE indexname = %s
                """, (index,))
                if cursor.fetchone()[0] > 0:
                    verification_results['indexes_created'] += 1
            
            logger.info(f"✓ {verification_results['indexes_created']}/{len(key_indexes)} key indexes found")
            
        except Exception as e:
            logger.error(f"Error verifying migrations: {e}")
        finally:
            conn.close()
        
        return verification_results


def main():
    """Main function to analyze and migrate database."""
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)
    
    logger.info("Starting database analysis and migration...")
    logger.info(f"Database URL: {database_url.split('@')[1] if '@' in database_url else 'localhost'}")
    
    migrator = DatabaseMigrator(database_url)
    
    # Step 1: Analyze current structure
    analysis = migrator.analyze_current_structure()
    
    print("\n" + "="*60)
    print("DATABASE ANALYSIS RESULTS")
    print("="*60)
    print(f"Existing tables: {', '.join(analysis['tables'].get('existing', []))}")
    print(f"Missing tables: {', '.join(analysis['missing_tables']) if analysis['missing_tables'] else 'None'}")
    print(f"Missing columns in phones table: {len(analysis['missing_columns'])}")
    if analysis['missing_columns']:
        print(f"  - {', '.join(analysis['missing_columns'][:5])}{'...' if len(analysis['missing_columns']) > 5 else ''}")
    print(f"Existing indexes: {len(analysis['indexes'])}")
    
    # Step 2: Apply migrations
    print("\n" + "="*60)
    print("APPLYING MIGRATIONS")
    print("="*60)
    
    if migrator.apply_migrations():
        logger.info("All migrations applied successfully!")
    else:
        logger.warning("Some migrations failed - check logs above")
    
    # Step 3: Verify migrations
    print("\n" + "="*60)
    print("VERIFICATION RESULTS")
    print("="*60)
    
    verification = migrator.verify_migrations()
    
    print(f"Processor rankings table: {'✓ Created' if verification['processor_rankings_table'] else '✗ Missing'}")
    print(f"New columns in phones table: {verification['phones_new_columns']} added")
    print(f"Performance indexes: {verification['indexes_created']} created")
    
    # Step 4: Final status
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    
    if (verification['processor_rankings_table'] and 
        verification['phones_new_columns'] >= 5 and 
        verification['indexes_created'] >= 2):
        print("🎉 DATABASE MIGRATION COMPLETED SUCCESSFULLY!")
        print("Your enhanced pipeline is ready to use.")
    else:
        print("⚠️  MIGRATION PARTIALLY COMPLETED")
        print("Some components may not work as expected.")
        print("Check the logs above for details.")


if __name__ == "__main__":
    main()