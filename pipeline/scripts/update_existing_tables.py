#!/usr/bin/env python3
"""
Script to add pipeline-specific columns to existing tables
"""

import os
import sys
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

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
        conn.autocommit = True
        print("✅ Successfully connected to Supabase database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return None

def add_pipeline_columns_to_phones(cursor):
    """Add pipeline-specific columns to the phones table"""
    print("📱 Adding pipeline columns to phones table...")
    
    # Columns to add for pipeline tracking
    columns_to_add = [
        ("scraped_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", "Track when data was last scraped"),
        ("pipeline_run_id", "VARCHAR(255)", "Track which pipeline run created/updated this record"),
        ("data_source", "VARCHAR(100)", "Track which website/source this data came from"),
        ("last_price_check", "TIMESTAMP", "Track when price was last checked"),
        ("price_change_detected", "BOOLEAN DEFAULT FALSE", "Flag for price changes"),
        ("data_quality_score", "DECIMAL(3,2)", "Overall data quality score for this record"),
        ("is_pipeline_managed", "BOOLEAN DEFAULT FALSE", "Flag to indicate pipeline-managed records")
    ]
    
    for col_name, col_type, description in columns_to_add:
        try:
            # Check if column already exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'phones' 
                AND column_name = %s 
                AND table_schema = 'public';
            """, (col_name,))
            
            if cursor.fetchone():
                print(f"  ⚠️  Column '{col_name}' already exists, skipping")
                continue
            
            # Add the column
            cursor.execute(f"ALTER TABLE phones ADD COLUMN {col_name} {col_type};")
            print(f"  ✅ Added column: {col_name} ({description})")
            
        except Exception as e:
            print(f"  ❌ Error adding column {col_name}: {e}")

def create_pipeline_runs_table(cursor):
    """Create pipeline_runs table to track pipeline executions"""
    print("🔄 Creating pipeline_runs table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS pipeline_runs (
        id SERIAL PRIMARY KEY,
        dag_id VARCHAR(100) NOT NULL,
        run_id VARCHAR(255) NOT NULL,
        execution_date TIMESTAMP NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'running',
        records_scraped INTEGER DEFAULT 0,
        records_processed INTEGER DEFAULT 0,
        records_synced INTEGER DEFAULT 0,
        quality_score DECIMAL(3,2),
        error_message TEXT,
        metadata JSONB,
        
        CONSTRAINT unique_pipeline_run UNIQUE(dag_id, run_id)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_dag_id ON pipeline_runs(dag_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_execution_date ON pipeline_runs(execution_date);
    """
    
    try:
        cursor.execute(sql)
        print("  ✅ pipeline_runs table created successfully")
    except Exception as e:
        print(f"  ❌ Error creating pipeline_runs table: {e}")

def create_price_tracking_table(cursor):
    """Create price_tracking table for historical price data"""
    print("💰 Creating price_tracking table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS price_tracking (
        id SERIAL PRIMARY KEY,
        phone_id INTEGER REFERENCES phones(id) ON DELETE CASCADE,
        price_text VARCHAR(1024),  -- Original price text from scraping
        price_numeric DECIMAL(10,2),  -- Parsed numeric price
        currency VARCHAR(3) DEFAULT 'BDT',
        source_url TEXT,
        data_source VARCHAR(100),  -- Which website
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pipeline_run_id VARCHAR(255),
        availability_status VARCHAR(50),
        is_official_price BOOLEAN DEFAULT FALSE,
        price_change_from_previous DECIMAL(10,2),
        
        -- Add index for better performance
        CONSTRAINT idx_price_tracking_phone_recorded UNIQUE(phone_id, recorded_at, data_source)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_price_tracking_phone_id ON price_tracking(phone_id);
    CREATE INDEX IF NOT EXISTS idx_price_tracking_recorded_at ON price_tracking(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_price_tracking_source ON price_tracking(data_source);
    CREATE INDEX IF NOT EXISTS idx_price_tracking_pipeline_run ON price_tracking(pipeline_run_id);
    """
    
    try:
        cursor.execute(sql)
        print("  ✅ price_tracking table created successfully")
    except Exception as e:
        print(f"  ❌ Error creating price_tracking table: {e}")

def create_data_quality_metrics_table(cursor):
    """Create data_quality_metrics table"""
    print("📊 Creating data_quality_metrics table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS data_quality_metrics (
        id SERIAL PRIMARY KEY,
        pipeline_run_id VARCHAR(255) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,4),
        threshold_value DECIMAL(10,4),
        passed BOOLEAN,
        details JSONB,
        measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_data_quality_pipeline_run ON data_quality_metrics(pipeline_run_id);
    CREATE INDEX IF NOT EXISTS idx_data_quality_table ON data_quality_metrics(table_name);
    CREATE INDEX IF NOT EXISTS idx_data_quality_metric ON data_quality_metrics(metric_name);
    """
    
    try:
        cursor.execute(sql)
        print("  ✅ data_quality_metrics table created successfully")
    except Exception as e:
        print(f"  ❌ Error creating data_quality_metrics table: {e}")

def create_scraping_sources_table(cursor):
    """Create scraping_sources table"""
    print("🌐 Creating scraping_sources table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS scraping_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        base_url TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_scraped_at TIMESTAMP,
        scraping_frequency_hours INTEGER DEFAULT 24,
        success_rate DECIMAL(5,2) DEFAULT 100.00,
        total_requests INTEGER DEFAULT 0,
        successful_requests INTEGER DEFAULT 0,
        configuration JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_scraping_sources_active ON scraping_sources(is_active);
    CREATE INDEX IF NOT EXISTS idx_scraping_sources_last_scraped ON scraping_sources(last_scraped_at);
    """
    
    try:
        cursor.execute(sql)
        print("  ✅ scraping_sources table created successfully")
    except Exception as e:
        print(f"  ❌ Error creating scraping_sources table: {e}")

def insert_sample_scraping_sources(cursor):
    """Insert sample scraping sources"""
    print("📝 Inserting sample scraping sources...")
    
    sources = [
        ('MobileDokan', 'https://www.mobiledokan.com', True),
        ('PickBD', 'https://www.pickbd.com', True),
        ('PriyoShop', 'https://www.priyoshop.com', True),
        ('Daraz', 'https://www.daraz.com.bd', True),
        ('Gadget & Gear', 'https://www.gadgetandgear.com', True),
        ('Star Tech', 'https://www.startech.com.bd', True)
    ]
    
    for name, url, is_active in sources:
        try:
            cursor.execute("""
                INSERT INTO scraping_sources (name, base_url, is_active)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    base_url = EXCLUDED.base_url,
                    is_active = EXCLUDED.is_active,
                    updated_at = CURRENT_TIMESTAMP;
            """, (name, url, is_active))
            print(f"  ✅ Added source: {name}")
        except Exception as e:
            print(f"  ❌ Error adding source {name}: {e}")

def create_indexes_for_pipeline(cursor):
    """Create additional indexes for pipeline performance"""
    print("⚡ Creating pipeline-specific indexes...")
    
    indexes = [
        ("idx_phones_pipeline_managed", "phones", "is_pipeline_managed"),
        ("idx_phones_scraped_at", "phones", "scraped_at"),
        ("idx_phones_last_price_check", "phones", "last_price_check"),
        ("idx_phones_data_source", "phones", "data_source"),
        ("idx_phones_pipeline_run_id", "phones", "pipeline_run_id"),
        ("idx_phones_price_change", "phones", "price_change_detected"),
    ]
    
    for idx_name, table_name, column_name in indexes:
        try:
            cursor.execute(f"""
                CREATE INDEX IF NOT EXISTS {idx_name} 
                ON {table_name}({column_name});
            """)
            print(f"  ✅ Created index: {idx_name}")
        except Exception as e:
            print(f"  ❌ Error creating index {idx_name}: {e}")

def verify_pipeline_setup(cursor):
    """Verify that all pipeline components are set up correctly"""
    print("\\n🔍 Verifying pipeline setup...")
    
    # Check if pipeline columns were added to phones table
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'phones' 
        AND column_name IN ('scraped_at', 'pipeline_run_id', 'data_source', 'is_pipeline_managed')
        AND table_schema = 'public';
    """)
    
    pipeline_columns = [row[0] for row in cursor.fetchall()]
    
    print("\\n📊 Pipeline Setup Verification:")
    expected_columns = ['scraped_at', 'pipeline_run_id', 'data_source', 'is_pipeline_managed']
    for col in expected_columns:
        if col in pipeline_columns:
            print(f"  ✅ phones.{col}")
        else:
            print(f"  ❌ phones.{col} - MISSING")
    
    # Check pipeline tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('pipeline_runs', 'price_tracking', 'data_quality_metrics', 'scraping_sources')
        ORDER BY table_name;
    """)
    
    pipeline_tables = [row[0] for row in cursor.fetchall()]
    expected_tables = ['pipeline_runs', 'price_tracking', 'data_quality_metrics', 'scraping_sources']
    
    for table in expected_tables:
        if table in pipeline_tables:
            print(f"  ✅ {table} table")
        else:
            print(f"  ❌ {table} table - MISSING")
    
    # Check scraping sources
    cursor.execute("SELECT COUNT(*) FROM scraping_sources WHERE is_active = TRUE;")
    active_sources = cursor.fetchone()[0]
    print(f"  📊 Active scraping sources: {active_sources}")
    
    return len(pipeline_columns) == len(expected_columns) and len(pipeline_tables) == len(expected_tables)

def main():
    """Main setup function"""
    print("🔧 UPDATING EXISTING TABLES FOR PIPELINE")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        print("\\n❌ Cannot proceed without database connection")
        return False
    
    try:
        cursor = conn.cursor()
        
        # Add pipeline columns to existing phones table
        add_pipeline_columns_to_phones(cursor)
        
        # Create pipeline-specific tables
        create_pipeline_runs_table(cursor)
        create_price_tracking_table(cursor)
        create_data_quality_metrics_table(cursor)
        create_scraping_sources_table(cursor)
        
        # Insert sample data
        insert_sample_scraping_sources(cursor)
        
        # Create indexes
        create_indexes_for_pipeline(cursor)
        
        # Verify setup
        setup_complete = verify_pipeline_setup(cursor)
        
        if setup_complete:
            print("\\n✅ PIPELINE SETUP COMPLETED SUCCESSFULLY!")
            print("\\n🎯 Your existing 'phones' table is now pipeline-ready!")
            print("\\n📊 Summary:")
            print(f"  • Existing phones: 5,179 records")
            print(f"  • Pipeline columns added to phones table")
            print(f"  • Pipeline tracking tables created")
            print(f"  • Scraping sources configured")
            print("\\n🚀 Next Steps:")
            print("  1. Update pipeline services to use 'phones' table")
            print("  2. Run: python scripts/verify_data_collection.py")
            print("  3. Test pipeline with real data collection")
        else:
            print("\\n⚠️  Pipeline setup incomplete - some components missing")
            return False
        
        return True
        
    except Exception as e:
        print(f"\\n❌ Error during setup: {e}")
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)