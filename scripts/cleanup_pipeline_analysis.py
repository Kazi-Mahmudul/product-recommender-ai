#!/usr/bin/env python3
"""
Analyze pipeline folder to identify unused files for cleanup
"""

import os
from pathlib import Path

def analyze_pipeline_files():
    """Analyze which files are actually used in the production pipeline"""
    
    print("🔍 PIPELINE CLEANUP ANALYSIS")
    print("=" * 60)
    
    # Files that are ESSENTIAL for production
    essential_files = {
        # Core pipeline files
        'pipeline/.env',
        'pipeline/.env.example', 
        'pipeline/docker-compose.master.yml',
        'pipeline/README.md',
        
        # Airflow (core orchestration)
        'pipeline/airflow/dags/main_pipeline_dag.py',
        'pipeline/airflow/config/airflow.cfg',
        'pipeline/airflow/requirements.txt',
        'pipeline/airflow/.env',
        'pipeline/airflow/docker-compose.yml',
        
        # Scrapers (core functionality)
        'pipeline/scrapers/mobile_scrapers.py',
        
        # Processor services (data processing)
        'pipeline/services/processor/config.py',
        'pipeline/services/processor/data_cleaner.py',
        'pipeline/services/processor/feature_engineer.py',
        'pipeline/services/processor/performance_scorer.py',
        'pipeline/services/processor/feature_versioning.py',
        'pipeline/services/processor/models.py',
        
        # Scripts (utilities)
        'pipeline/scripts/check_pipeline_results.py',
        'pipeline/scripts/verify_data_collection.py',
    }
    
    # Files that are OPTIONAL but useful
    optional_files = {
        # Alternative DAGs (for testing/backup)
        'pipeline/airflow/dags/simple_pipeline_dag.py',
        'pipeline/airflow/dags/monitoring_dag.py',
        'pipeline/airflow/dags/pipeline_utilities_dag.py',
        
        # Setup scripts (for initial setup)
        'pipeline/quick-start.bat',
        'pipeline/quick-start.sh',
        'pipeline/setup-pipeline.bat', 
        'pipeline/setup-pipeline.sh',
        'pipeline/SETUP_GUIDE.md',
        
        # Additional scripts
        'pipeline/scripts/check_existing_tables.py',
        'pipeline/scripts/update_existing_tables.py',
        'pipeline/scripts/build-images.bat',
        'pipeline/scripts/build-images.sh',
        
        # Docker files (for containerization)
        'pipeline/docker/services/scraper.dockerfile',
        'pipeline/services/scraper/Dockerfile',
        'pipeline/services/processor/Dockerfile',
        'pipeline/services/sync/Dockerfile',
    }
    
    # Files that are UNUSED (can be removed)
    unused_categories = {
        'alerting': 'Not implemented in current pipeline',
        'logging': 'Basic logging already handled in DAG',
        'monitoring': 'Advanced monitoring not required for production',
        'services/scraper': 'Using direct scraper, not containerized service',
        'services/sync': 'Using direct database updates, not separate service',
        'backups': 'Empty directory',
        'data': 'Empty directory',
        'logs': 'Empty directory',
    }
    
    print("✅ ESSENTIAL FILES (Keep):")
    for file in sorted(essential_files):
        if os.path.exists(file):
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} - MISSING!")
    
    print(f"\n🔧 OPTIONAL FILES (Keep for now):")
    for file in sorted(optional_files):
        if os.path.exists(file):
            print(f"  🔧 {file}")
    
    print(f"\n🗑️  UNUSED CATEGORIES (Can remove):")
    for category, reason in unused_categories.items():
        full_path = f"pipeline/{category}"
        if os.path.exists(full_path):
            print(f"  🗑️  {full_path} - {reason}")
    
    return essential_files, optional_files, unused_categories

if __name__ == "__main__":
    essential, optional, unused = analyze_pipeline_files()
    
    print(f"\n📊 SUMMARY:")
    print(f"  Essential files: {len(essential)}")
    print(f"  Optional files: {len(optional)}")
    print(f"  Unused categories: {len(unused)}")
    
    print(f"\n💡 RECOMMENDATION:")
    print(f"  Keep essential and optional files")
    print(f"  Remove unused categories to clean up the pipeline")