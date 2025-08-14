#!/usr/bin/env python3
"""
Quick script to check if the pipeline actually updated the database
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check_pipeline_results():
    database_url = os.getenv("DATABASE_URL")
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("🔍 CHECKING PIPELINE RESULTS")
        print("=" * 40)
        
        # Check pipeline runs
        cursor.execute("SELECT COUNT(*), MAX(started_at) FROM pipeline_runs;")
        run_count, last_run = cursor.fetchone()
        print(f"📊 Pipeline Runs: {run_count}")
        if last_run:
            print(f"📅 Last Run: {last_run}")
        
        # Check pipeline-managed phones
        cursor.execute("""
            SELECT COUNT(*) as pipeline_managed,
                   COUNT(CASE WHEN scraped_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recently_updated
            FROM phones 
            WHERE is_pipeline_managed = TRUE;
        """)
        managed, recent = cursor.fetchone()
        print(f"📱 Pipeline-managed phones: {managed}")
        print(f"🕐 Recently updated: {recent}")
        
        # Check price tracking
        cursor.execute("SELECT COUNT(*) FROM price_tracking;")
        price_count = cursor.fetchone()[0]
        print(f"💰 Price tracking entries: {price_count}")
        
        # Check data quality metrics
        cursor.execute("SELECT COUNT(*) FROM data_quality_metrics;")
        quality_count = cursor.fetchone()[0]
        print(f"📊 Quality metrics: {quality_count}")
        
        # Show sample pipeline-managed phone
        cursor.execute("""
            SELECT name, brand, scraped_at, pipeline_run_id, data_source 
            FROM phones 
            WHERE is_pipeline_managed = TRUE 
            LIMIT 3;
        """)
        
        samples = cursor.fetchall()
        if samples:
            print("\\n📱 Sample pipeline-managed phones:")
            for name, brand, scraped_at, run_id, source in samples:
                print(f"  • {brand} {name} (scraped: {scraped_at}, run: {run_id[:8]}...)")
        
        conn.close()
        
        if managed > 0:
            print("\\n✅ SUCCESS: Pipeline is working and updating the database!")
        else:
            print("\\n⚠️  Pipeline hasn't updated any records yet. Try running the DAG.")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_pipeline_results()