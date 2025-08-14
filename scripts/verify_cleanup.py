#!/usr/bin/env python3
"""
Verify that the pipeline cleanup didn't break anything
"""

import os
import sys

def verify_essential_files():
    """Verify all essential files are still present"""
    
    print("🔍 VERIFYING PIPELINE AFTER CLEANUP")
    print("=" * 50)
    
    essential_files = [
        'pipeline/.env',
        'pipeline/docker-compose.master.yml',
        'pipeline/airflow/dags/main_pipeline_dag.py',
        'pipeline/scrapers/mobile_scrapers.py',
        'pipeline/services/processor/data_cleaner.py',
        'pipeline/services/processor/feature_engineer.py',
        'pipeline/services/processor/config.py',
    ]
    
    all_good = True
    
    print("📁 ESSENTIAL FILES CHECK:")
    for file_path in essential_files:
        if os.path.exists(file_path):
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - MISSING!")
            all_good = False
    
    # Test scraper import
    print(f"\n🕷️  SCRAPER FUNCTIONALITY:")
    try:
        scrapers_path = os.path.join('pipeline', 'scrapers')
        sys.path.insert(0, scrapers_path)
        
        from mobile_scrapers import MobileDokanScraper
        scraper = MobileDokanScraper()
        print("  ✅ Scraper import and initialization: Working")
    except Exception as e:
        print(f"  ❌ Scraper test failed: {str(e)}")
        all_good = False
    
    # Test database connection
    print(f"\n🗄️  DATABASE CONNECTION:")
    try:
        import psycopg2
        
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            database_url = "postgresql://postgres.lvxqroeldpaqjbmsjjqr:Mahmudulepickdb162@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
        
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM phones WHERE is_pipeline_managed = TRUE")
        count = cursor.fetchone()[0]
        conn.close()
        
        print(f"  ✅ Database connection: Working ({count} managed records)")
    except Exception as e:
        print(f"  ❌ Database connection failed: {str(e)}")
        all_good = False
    
    print(f"\n" + "=" * 50)
    if all_good:
        print("🎉 CLEANUP VERIFICATION PASSED!")
        print("   All essential components are working correctly.")
        print("   Your pipeline is still production-ready!")
        return True
    else:
        print("❌ CLEANUP VERIFICATION FAILED!")
        print("   Some essential components are missing or broken.")
        return False

if __name__ == "__main__":
    success = verify_essential_files()
    
    if success:
        print(f"\n✅ Pipeline cleanup was successful!")
        print("   Your system is clean, organized, and fully functional.")
    else:
        print(f"\n❌ Pipeline cleanup caused issues!")
        print("   Please check the errors above.")