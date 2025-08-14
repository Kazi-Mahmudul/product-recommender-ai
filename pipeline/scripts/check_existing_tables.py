#!/usr/bin/env python3
"""
Script to check the structure of existing tables in Supabase
"""

import os
import psycopg2
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
        print("✅ Successfully connected to Supabase database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return None

def describe_table(cursor, table_name):
    """Get detailed information about a table structure"""
    print(f"\n📋 Table: {table_name}")
    print("-" * 50)
    
    try:
        # Get column information
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = %s 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        """, (table_name,))
        
        columns = cursor.fetchall()
        
        if not columns:
            print(f"  ❌ Table '{table_name}' not found")
            return False
        
        print("  Columns:")
        for col_name, data_type, nullable, default, max_length in columns:
            nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
            length_str = f"({max_length})" if max_length else ""
            default_str = f" DEFAULT {default}" if default else ""
            print(f"    {col_name}: {data_type}{length_str} {nullable_str}{default_str}")
        
        # Get indexes
        cursor.execute("""
            SELECT 
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE tablename = %s 
            AND schemaname = 'public';
        """, (table_name,))
        
        indexes = cursor.fetchall()
        if indexes:
            print("  Indexes:")
            for idx_name, idx_def in indexes:
                print(f"    {idx_name}")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        row_count = cursor.fetchone()[0]
        print(f"  Row Count: {row_count:,}")
        
        # Get sample data (first 3 rows)
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
        sample_rows = cursor.fetchall()
        
        if sample_rows:
            print("  Sample Data (first 3 rows):")
            col_names = [desc[0] for desc in cursor.description]
            for i, row in enumerate(sample_rows, 1):
                print(f"    Row {i}:")
                for col_name, value in zip(col_names, row):
                    # Truncate long values
                    str_value = str(value)
                    if len(str_value) > 50:
                        str_value = str_value[:47] + "..."
                    print(f"      {col_name}: {str_value}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error describing table {table_name}: {e}")
        return False

def main():
    """Main function to check existing tables"""
    print("🔍 CHECKING EXISTING DATABASE TABLES")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Tables we're interested in
        tables_to_check = [
            'phones',
            'users', 
            'phone_aliases',
            'phone_popularity_metrics',
            'query_history',
            'comparison_sessions',
            'comparison_items'
        ]
        
        for table in tables_to_check:
            describe_table(cursor, table)
        
        print("\n" + "=" * 50)
        print("✅ TABLE ANALYSIS COMPLETED")
        print("=" * 50)
        
        return True
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()