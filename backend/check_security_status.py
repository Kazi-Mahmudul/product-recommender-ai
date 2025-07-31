#!/usr/bin/env python3
"""
Check the current security status of Supabase tables
"""

from sqlalchemy import create_engine, text
from app.core.config import settings
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_rls_status():
    """Check RLS status for all tables"""
    try:
        # Create database engine
        database_url = settings.DATABASE_URL
        sqlalchemy_url = database_url.replace("postgres://", "postgresql://", 1) if database_url.startswith("postgres://") else database_url
        
        engine = create_engine(
            sqlalchemy_url,
            connect_args={"sslmode": "require"}
        )
        
        print("🔍 Checking Row Level Security Status")
        print("=" * 50)
        
        with engine.connect() as conn:
            # Check RLS status for all public tables
            result = conn.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    rowsecurity,
                    CASE 
                        WHEN rowsecurity THEN '✅ SECURED'
                        ELSE '❌ NOT SECURED'
                    END as status
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY tablename;
            """))
            
            tables = result.fetchall()
            secured_count = 0
            total_count = len(tables)
            
            print("Table Security Status:")
            print("-" * 30)
            
            for table in tables:
                schema, table_name, rls_enabled, status = table
                print(f"  {table_name:<20} {status}")
                if rls_enabled:
                    secured_count += 1
            
            print("-" * 30)
            print(f"Summary: {secured_count}/{total_count} tables secured")
            
            # Check for policies
            print("\n🛡️ Checking Security Policies")
            print("-" * 30)
            
            result = conn.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    policyname,
                    cmd,
                    qual
                FROM pg_policies 
                WHERE schemaname = 'public'
                ORDER BY tablename, policyname;
            """))
            
            policies = result.fetchall()
            
            if policies:
                current_table = None
                for policy in policies:
                    schema, table_name, policy_name, cmd, qual = policy
                    if table_name != current_table:
                        print(f"\n📋 {table_name}:")
                        current_table = table_name
                    print(f"  • {policy_name} ({cmd})")
                
                print(f"\n✅ Found {len(policies)} security policies")
            else:
                print("❌ No security policies found")
            
            # Overall status
            print("\n" + "=" * 50)
            if secured_count == total_count and len(policies) > 0:
                print("🎉 ALL SECURITY ISSUES RESOLVED!")
                print("✅ All tables have RLS enabled")
                print("✅ Security policies are in place")
                print("✅ Your database is secure")
            else:
                print("⚠️  Some security issues remain:")
                if secured_count < total_count:
                    print(f"   - {total_count - secured_count} tables without RLS")
                if len(policies) == 0:
                    print("   - No security policies found")
            
            return secured_count == total_count and len(policies) > 0
            
    except Exception as e:
        print(f"❌ Error checking security status: {str(e)}")
        return False

if __name__ == "__main__":
    check_rls_status()