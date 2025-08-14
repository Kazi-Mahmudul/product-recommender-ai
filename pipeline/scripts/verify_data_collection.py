#!/usr/bin/env python3
"""
Script to verify if the pipeline is actually collecting and storing data in Supabase
"""

import os
import sys
import psycopg2
from datetime import datetime, timedelta
from dotenv import load_dotenv
import pandas as pd

# Load environment variables
load_dotenv()

def connect_to_database():
    """Connect to the Supabase database"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return None
    
    try:
        # Handle postgres:// to postgresql:// URL scheme issue
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        conn = psycopg2.connect(database_url)
        print("✅ Successfully connected to Supabase database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return None

def check_tables_exist(conn):
    """Check if the expected tables exist in the database"""
    try:
        cursor = conn.cursor()
        
        # Query to get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        table_names = [table[0] for table in tables]
        
        print(f"\\n📊 Found {len(table_names)} tables in database:")
        for table in table_names:
            print(f"  - {table}")
        
        # Check for expected pipeline tables
        expected_tables = [
            'phones',  # Using existing phones table
            'price_tracking',  # Our new price tracking table
            'pipeline_runs',
            'data_quality_metrics',
            'scraping_sources'
        ]
        
        print("\\n🔍 Checking for expected pipeline tables:")
        for expected_table in expected_tables:
            if expected_table in table_names:
                print(f"  ✅ {expected_table} - EXISTS")
            else:
                print(f"  ❌ {expected_table} - MISSING")
        
        cursor.close()
        return table_names
        
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return []

def check_recent_data(conn, table_names):
    """Check for recent data in the tables"""
    cursor = conn.cursor()
    
    print("\\n📈 Checking for recent data (last 24 hours):")
    
    # Check phones table
    if 'phones' in table_names:
        try:
            cursor.execute("""
                SELECT COUNT(*) as total_phones,
                       COUNT(CASE WHEN scraped_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_phones,
                       COUNT(CASE WHEN is_pipeline_managed = TRUE THEN 1 END) as pipeline_managed
                FROM phones;
            """)
            result = cursor.fetchone()
            total_phones, recent_phones, pipeline_managed = result
            print(f"  📱 phones: {total_phones} total, {recent_phones} scraped in last 24h, {pipeline_managed} pipeline-managed")
        except Exception as e:
            print(f"  ❌ Error checking phones: {e}")
    
    # Check price_tracking table
    if 'price_tracking' in table_names:
        try:
            cursor.execute("""
                SELECT COUNT(*) as total_prices,
                       COUNT(CASE WHEN recorded_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_prices
                FROM price_tracking;
            """)
            result = cursor.fetchone()
            total_prices, recent_prices = result
            print(f"  💰 price_tracking: {total_prices} total, {recent_prices} added in last 24h")
        except Exception as e:
            print(f"  ❌ Error checking price_tracking: {e}")
    
    # Check pipeline_runs table (if exists)
    if 'pipeline_runs' in table_names:
        try:
            cursor.execute("""
                SELECT COUNT(*) as total_runs,
                       MAX(started_at) as last_run
                FROM pipeline_runs;
            """)
            result = cursor.fetchone()
            total_runs, last_run = result
            print(f"  🔄 pipeline_runs: {total_runs} total runs, last run: {last_run}")
        except Exception as e:
            print(f"  ❌ Error checking pipeline_runs: {e}")
    
    cursor.close()

def check_data_quality(conn, table_names):
    """Check data quality metrics"""
    cursor = conn.cursor()
    
    print("\\n🎯 Data Quality Analysis:")
    
    if 'phones' in table_names:
        try:
            # Check for missing data
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
                    COUNT(CASE WHEN brand IS NULL OR brand = '' THEN 1 END) as missing_brands,
                    COUNT(CASE WHEN price_original IS NULL THEN 1 END) as missing_prices,
                    COUNT(CASE WHEN is_pipeline_managed = TRUE THEN 1 END) as pipeline_managed,
                    AVG(data_quality_score) as avg_quality_score
                FROM phones;
            """)
            result = cursor.fetchone()
            total, missing_names, missing_brands, missing_prices, pipeline_managed, avg_quality = result
            
            print(f"  📊 Total Records: {total:,}")
            print(f"  📝 Missing Names: {missing_names} ({missing_names/total*100:.1f}%)")
            print(f"  🏷️  Missing Brands: {missing_brands} ({missing_brands/total*100:.1f}%)")
            print(f"  💵 Missing Prices: {missing_prices} ({missing_prices/total*100:.1f}%)")
            print(f"  🔧 Pipeline Managed: {pipeline_managed} ({pipeline_managed/total*100:.1f}%)")
            if avg_quality:
                print(f"  ⭐ Avg Quality Score: {avg_quality:.2f}")
            
            # Check for duplicates
            cursor.execute("""
                SELECT COUNT(*) - COUNT(DISTINCT name, brand) as potential_duplicates
                FROM phones;
            """)
            duplicates = cursor.fetchone()[0]
            print(f"  🔄 Potential Duplicates: {duplicates}")
            
        except Exception as e:
            print(f"  ❌ Error checking data quality: {e}")
    
    cursor.close()

def check_pipeline_activity(conn):
    """Check recent pipeline activity"""
    cursor = conn.cursor()
    
    print("\\n🔄 Pipeline Activity Check:")
    
    try:
        # Check if there are any recent updates (proxy for pipeline activity)
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public'
            ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC;
        """)
        
        results = cursor.fetchall()
        
        if results:
            print("  📈 Table Activity (inserts/updates/deletes):")
            for schema, table, inserts, updates, deletes in results:
                total_activity = inserts + updates + deletes
                if total_activity > 0:
                    print(f"    {table}: {inserts}I / {updates}U / {deletes}D (total: {total_activity})")
        else:
            print("  ⚠️  No table activity statistics available")
            
    except Exception as e:
        print(f"  ❌ Error checking pipeline activity: {e}")
    
    cursor.close()

def generate_data_report(conn, table_names):
    """Generate a comprehensive data report"""
    print("\\n📋 COMPREHENSIVE DATA REPORT")
    print("=" * 50)
    
    cursor = conn.cursor()
    
    # Database size
    try:
        cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()));")
        db_size = cursor.fetchone()[0]
        print(f"Database Size: {db_size}")
    except Exception as e:
        print(f"Database Size: Unable to determine ({e})")
    
    # Table sizes
    print("\\nTable Sizes:")
    for table in table_names:
        try:
            cursor.execute(f"SELECT pg_size_pretty(pg_total_relation_size('{table}'));")
            table_size = cursor.fetchone()[0]
            
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            row_count = cursor.fetchone()[0]
            
            print(f"  {table}: {table_size} ({row_count:,} rows)")
        except Exception as e:
            print(f"  {table}: Unable to determine size ({e})")
    
    cursor.close()

def main():
    """Main verification function"""
    print("🔍 PIPELINE DATA COLLECTION VERIFICATION")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        print("\\n❌ Cannot proceed without database connection")
        return False
    
    try:
        # Check tables
        table_names = check_tables_exist(conn)
        
        if not table_names:
            print("\\n❌ No tables found - pipeline may not be set up correctly")
            return False
        
        # Check recent data
        check_recent_data(conn, table_names)
        
        # Check data quality
        check_data_quality(conn, table_names)
        
        # Check pipeline activity
        check_pipeline_activity(conn)
        
        # Generate report
        generate_data_report(conn, table_names)
        
        print("\\n" + "=" * 50)
        print("✅ VERIFICATION COMPLETED")
        print("=" * 50)
        
        # Recommendations
        print("\\n💡 RECOMMENDATIONS:")
        if 'mobile_phones' not in table_names:
            print("- ⚠️  Core tables missing - run database migrations")
            print("- 🔧 Execute: python scripts/setup_database.py")
        
        print("- 📊 Check Airflow UI for recent DAG runs")
        print("- 🔍 Monitor logs for any errors")
        print("- 📈 Set up monitoring dashboards in Grafana")
        
        return True
        
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)