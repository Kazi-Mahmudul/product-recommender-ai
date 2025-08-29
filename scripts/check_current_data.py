#!/usr/bin/env python3
"""
Check current state of database after pipeline runs
"""

import os
import psycopg2
from datetime import datetime

def check_database_state():
    """Check current state of database"""
    
    # Get database connection
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Fallback to hardcoded URL for testing
        database_url = os.getenv('DATABASE_URL')
        print("Using fallback DATABASE_URL")
    else:
        print(f"Using DATABASE_URL from environment")
    
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("📊 DATABASE STATE REPORT")
        print("=" * 50)
        
        # Check pipeline runs
        print("\n🔄 PIPELINE RUNS:")
        cursor.execute("""
            SELECT dag_id, run_id, execution_date, started_at, status
            FROM pipeline_runs 
            ORDER BY started_at DESC 
            LIMIT 10;
        """)
        
        runs = cursor.fetchall()
        if runs:
            for run in runs:
                print(f"  • {run[0]} | {run[1]} | {run[4]} | {run[3]}")
        else:
            print("  No pipeline runs found")
        
        # Check pipeline-managed phones
        print("\n📱 PIPELINE-MANAGED PHONES:")
        cursor.execute("""
            SELECT COUNT(*) as total_managed,
                   COUNT(CASE WHEN scraped_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recently_scraped,
                   MAX(scraped_at) as last_scraped
            FROM phones 
            WHERE is_pipeline_managed = TRUE;
        """)
        
        phone_stats = cursor.fetchone()
        if phone_stats:
            print(f"  • Total managed: {phone_stats[0]}")
            print(f"  • Recently scraped (24h): {phone_stats[1]}")
            print(f"  • Last scraped: {phone_stats[2]}")
        
        # Check scraping sources
        print("\n🌐 SCRAPING SOURCES:")
        cursor.execute("""
            SELECT name, last_scraped_at, total_requests, successful_requests, success_rate
            FROM scraping_sources;
        """)
        
        sources = cursor.fetchall()
        if sources:
            for source in sources:
                print(f"  • {source[0]}: {source[2]} requests, {source[3]} successful, {source[4]:.1f}% success rate")
                print(f"    Last scraped: {source[1]}")
        else:
            print("  No scraping sources found")
        
        # Check recent phone updates
        print("\n📈 RECENT PHONE UPDATES:")
        cursor.execute("""
            SELECT brand, model, scraped_at, pipeline_run_id, data_source
            FROM phones 
            WHERE scraped_at > NOW() - INTERVAL '1 hour'
            ORDER BY scraped_at DESC 
            LIMIT 10;
        """)
        
        recent_phones = cursor.fetchall()
        if recent_phones:
            for phone in recent_phones:
                print(f"  • {phone[0]} {phone[1]} | {phone[2]} | {phone[3]} | {phone[4]}")
        else:
            print("  No recent phone updates found")
        
        # Check price entries
        print("\n💰 PRICE ENTRIES:")
        cursor.execute("""
            SELECT COUNT(*) as total_prices,
                   COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_prices,
                   MAX(created_at) as last_price_entry
            FROM price_entries;
        """)
        
        price_stats = cursor.fetchone()
        if price_stats:
            print(f"  • Total price entries: {price_stats[0]}")
            print(f"  • Recent entries (24h): {price_stats[1]}")
            print(f"  • Last entry: {price_stats[2]}")
        
        conn.close()
        
        print("\n" + "=" * 50)
        print("📊 Database state check completed!")
        
        return True
        
    except Exception as e:
        print(f"❌ Database check failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 Checking current database state...")
    check_database_state()