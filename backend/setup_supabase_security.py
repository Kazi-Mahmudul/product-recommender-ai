#!/usr/bin/env python3
"""
Script to set up proper security policies for Supabase
This script will create RLS policies and fix security issues
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_supabase_connection():
    """Get connection to Supabase database"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment variables")
    
    # Handle postgres:// to postgresql:// URL scheme issue
    sqlalchemy_url = database_url.replace("postgres://", "postgresql://", 1) if database_url.startswith("postgres://") else database_url
    
    engine = create_engine(
        sqlalchemy_url,
        connect_args={"sslmode": "require"}
    )
    
    return engine

def execute_sql_commands(engine, commands, description):
    """Execute a list of SQL commands"""
    print(f"\n🔧 {description}")
    print("-" * 50)
    
    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()
        try:
            for i, command in enumerate(commands, 1):
                if command.strip():  # Skip empty commands
                    print(f"  {i}. Executing: {command.split()[0]} {command.split()[1] if len(command.split()) > 1 else ''}...")
                    conn.execute(text(command))
            
            trans.commit()
            print(f"✅ {description} completed successfully!")
            return True
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Error in {description}: {str(e)}")
            return False

def setup_rls_policies():
    """Set up Row Level Security policies for all tables"""
    
    try:
        engine = get_supabase_connection()
        print("🔐 Setting up Supabase Row Level Security (RLS)")
        print("=" * 60)
        
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("✅ Connected to Supabase successfully")
        
        # 1. Enable RLS on all tables
        enable_rls_commands = [
            "ALTER TABLE public.phones ENABLE ROW LEVEL SECURITY;",
            "ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;", 
            "ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;",
            "ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;",
            "ALTER TABLE public.comparison_items ENABLE ROW LEVEL SECURITY;",
            "ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;"
        ]
        
        if not execute_sql_commands(engine, enable_rls_commands, "Enabling RLS on all tables"):
            return False
        
        # 2. Drop existing policies (if any) to avoid conflicts
        drop_policies_commands = [
            "DROP POLICY IF EXISTS \"Allow public read access on phones\" ON public.phones;",
            "DROP POLICY IF EXISTS \"Users can view own profile\" ON public.users;",
            "DROP POLICY IF EXISTS \"Users can update own profile\" ON public.users;",
            "DROP POLICY IF EXISTS \"Users can access own email verifications\" ON public.email_verifications;",
            "DROP POLICY IF EXISTS \"Allow access to comparison sessions\" ON public.comparison_sessions;",
            "DROP POLICY IF EXISTS \"Allow access to own comparison items\" ON public.comparison_items;",
            "DROP POLICY IF EXISTS \"Restrict alembic_version access\" ON public.alembic_version;"
        ]
        
        execute_sql_commands(engine, drop_policies_commands, "Dropping existing policies")
        
        # 3. Create policies for phones table (public read access)
        phones_policies = [
            """CREATE POLICY "Allow public read access on phones" ON public.phones
               FOR SELECT USING (true);"""
        ]
        
        if not execute_sql_commands(engine, phones_policies, "Creating phones table policies"):
            return False
        
        # 4. Create policies for users table (users can only access their own data)
        users_policies = [
            """CREATE POLICY "Users can view own profile" ON public.users
               FOR SELECT USING (auth.uid()::text = id::text);""",
            """CREATE POLICY "Users can update own profile" ON public.users
               FOR UPDATE USING (auth.uid()::text = id::text);"""
        ]
        
        if not execute_sql_commands(engine, users_policies, "Creating users table policies"):
            return False
        
        # 5. Create policies for email_verifications table
        email_policies = [
            """CREATE POLICY "Users can access own email verifications" ON public.email_verifications
               FOR ALL USING (
                   EXISTS (
                       SELECT 1 FROM public.users 
                       WHERE users.id = email_verifications.user_id 
                       AND auth.uid()::text = users.id::text
                   )
               );"""
        ]
        
        if not execute_sql_commands(engine, email_policies, "Creating email_verifications policies"):
            return False
        
        # 6. Create policies for comparison_sessions table
        sessions_policies = [
            """CREATE POLICY "Allow access to comparison sessions" ON public.comparison_sessions
               FOR ALL USING (true);"""
        ]
        
        if not execute_sql_commands(engine, sessions_policies, "Creating comparison_sessions policies"):
            return False
        
        # 7. Create policies for comparison_items table
        items_policies = [
            """CREATE POLICY "Allow access to own comparison items" ON public.comparison_items
               FOR ALL USING (
                   (user_id IS NOT NULL AND auth.uid()::text = user_id::text)
                   OR
                   (session_id IS NOT NULL AND user_id IS NULL)
               );"""
        ]
        
        if not execute_sql_commands(engine, items_policies, "Creating comparison_items policies"):
            return False
        
        # 8. Create restrictive policy for alembic_version
        alembic_policies = [
            """CREATE POLICY "Restrict alembic_version access" ON public.alembic_version
               FOR ALL USING (false);"""
        ]
        
        if not execute_sql_commands(engine, alembic_policies, "Creating alembic_version policies"):
            return False
        
        # 9. Grant necessary permissions
        grant_commands = [
            "GRANT USAGE ON SCHEMA public TO authenticated;",
            "GRANT USAGE ON SCHEMA public TO anon;",
            "GRANT SELECT ON public.phones TO anon, authenticated;",
            "GRANT SELECT, UPDATE ON public.users TO authenticated;",
            "GRANT ALL ON public.email_verifications TO authenticated;",
            "GRANT ALL ON public.comparison_sessions TO anon, authenticated;",
            "GRANT ALL ON public.comparison_items TO anon, authenticated;",
            "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;",
            "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;"
        ]
        
        if not execute_sql_commands(engine, grant_commands, "Granting table permissions"):
            return False
        
        print("\n🎉 SUCCESS!")
        print("=" * 60)
        print("✅ Row Level Security has been enabled on all tables")
        print("✅ Security policies have been created")
        print("✅ Proper permissions have been granted")
        print("✅ Your Supabase database is now secure!")
        print("\n📋 What was secured:")
        print("  • phones: Public read access")
        print("  • users: Users can only access their own data")
        print("  • email_verifications: Users can only access their own verifications")
        print("  • comparison_sessions: Anonymous session access allowed")
        print("  • comparison_items: Session-based and user-based access")
        print("  • alembic_version: Restricted access (system only)")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to set up RLS policies: {str(e)}")
        return False

def verify_rls_setup():
    """Verify that RLS is properly set up"""
    try:
        engine = get_supabase_connection()
        
        print("\n🔍 Verifying RLS Setup")
        print("-" * 30)
        
        with engine.connect() as conn:
            # Check if RLS is enabled on all tables
            result = conn.execute(text("""
                SELECT schemaname, tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename IN ('phones', 'users', 'email_verifications', 'comparison_sessions', 'comparison_items', 'alembic_version')
                ORDER BY tablename;
            """))
            
            tables = result.fetchall()
            all_secured = True
            
            for table in tables:
                schema, table_name, rls_enabled = table
                status = "✅ SECURED" if rls_enabled else "❌ NOT SECURED"
                print(f"  {table_name}: {status}")
                if not rls_enabled:
                    all_secured = False
            
            if all_secured:
                print("\n✅ All tables are properly secured with RLS!")
            else:
                print("\n❌ Some tables are not secured. Please run the setup again.")
            
            return all_secured
            
    except Exception as e:
        print(f"❌ Failed to verify RLS setup: {str(e)}")
        return False

if __name__ == "__main__":
    print("🛡️  SUPABASE SECURITY SETUP")
    print("=" * 60)
    print("This script will enable Row Level Security (RLS) on your Supabase tables")
    print("and create appropriate security policies.")
    print()
    
    # Check if we can connect to Supabase
    try:
        engine = get_supabase_connection()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Supabase connection successful")
    except Exception as e:
        print(f"❌ Cannot connect to Supabase: {str(e)}")
        print("\n💡 Please check:")
        print("  1. Your internet connection")
        print("  2. DATABASE_URL in .env file")
        print("  3. Supabase project status")
        print("  4. Run 'python fix_supabase_connection.py' for diagnosis")
        sys.exit(1)
    
    # Ask for confirmation
    response = input("\n⚠️  This will modify your database security settings. Continue? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("❌ Setup cancelled by user")
        sys.exit(0)
    
    # Set up RLS policies
    if setup_rls_policies():
        # Verify the setup
        verify_rls_setup()
        print("\n🎯 Next steps:")
        print("  1. Test your application to ensure it works correctly")
        print("  2. Check Supabase dashboard for any remaining security warnings")
        print("  3. Consider setting up additional security measures if needed")
    else:
        print("\n❌ Setup failed. Please check the errors above and try again.")
        sys.exit(1)