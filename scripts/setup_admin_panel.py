#!/usr/bin/env python3
"""
Setup script for the admin panel.
This script will:
1. Run database migrations
2. Initialize admin users
3. Verify the setup
"""

import subprocess
import sys
import os
from pathlib import Path

# Try to import dotenv, fall back to manual loading if not available
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False

def load_env_file():
    """Load environment variables from .env file"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  No .env file found")
        return False
    
    if HAS_DOTENV:
        print("📋 Loading environment variables from .env file...")
        load_dotenv(env_file)
        print("✅ Environment variables loaded")
        return True
    else:
        print("📋 Manually parsing .env file...")
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes if present
                        value = value.strip('"\'')
                        os.environ[key.strip()] = value
            print("✅ Environment variables loaded")
            return True
        except Exception as e:
            print(f"❌ Failed to load .env file: {e}")
            return False

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"📋 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(f"   Output: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed!")
        print(f"   Error: {e.stderr}")
        return False

def check_environment():
    """Check if required environment variables are set"""
    print("🔍 Checking environment variables...")
    
    required_vars = [
        "DATABASE_URL",
        "SECRET_KEY"
    ]
    
    optional_vars = [
        "SUPER_ADMIN_EMAIL", 
        "SUPER_ADMIN_PASSWORD",
        "MODERATOR_EMAIL",
        "MODERATOR_PASSWORD"
    ]
    
    missing_required = []
    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)
    
    if missing_required:
        print(f"❌ Missing required environment variables: {', '.join(missing_required)}")
        return False
    
    print("✅ Required environment variables are set")
    
    missing_optional = []
    for var in optional_vars:
        if not os.getenv(var):
            missing_optional.append(var)
    
    if missing_optional:
        print(f"⚠️  Using default values for: {', '.join(missing_optional)}")
    
    return True

def main():
    """Main setup function"""
    print("🚀 Admin Panel Setup")
    print("=" * 40)
    
    # Check current directory
    if not Path("alembic.ini").exists():
        print("❌ Please run this script from the project root directory")
        return 1
    
    # Load environment variables from .env file
    if not load_env_file():
        print("⚠️  Using system environment variables only")
    
    # Check environment
    if not check_environment():
        print("\n💡 Setup your .env file with required variables:")
        print("   DATABASE_URL=postgresql://user:password@localhost/database")
        print("   SECRET_KEY=your-secret-key")
        print("   SUPER_ADMIN_EMAIL=admin@peyechi.com")
        print("   SUPER_ADMIN_PASSWORD=SuperAdmin@123")
        return 1
    
    # Steps
    steps = [
        ("alembic upgrade 006_add_admin_tables", "Running admin panel database migration"),
        ("python -m app.utils.init_admin", "Initializing admin users"),
    ]
    
    success_count = 0
    for cmd, description in steps:
        if run_command(cmd, description):
            success_count += 1
        else:
            print(f"\n❌ Setup failed at step: {description}")
            print("Please fix the error and run the setup again.")
            return 1
    
    print("\n" + "=" * 40)
    print("🎉 Admin Panel Setup Complete!")
    print(f"✅ {success_count}/{len(steps)} steps completed successfully")
    
    print("\n📋 Next Steps:")
    print("1. 🖥️  Start your backend server:")
    print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("\n2. 🌐 Access the admin panel:")
    print("   http://localhost:8000/admin")
    print("\n3. 🔐 Login with your admin credentials:")
    
    admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@peyechi.com")
    print(f"   Email: {admin_email}")
    print("   Password: (as configured in .env)")
    
    print("\n4. 🧪 Test the setup:")
    print("   python scripts/test_admin_panel.py")
    
    print("\n📚 Documentation:")
    print("   See ADMIN_PANEL.md for detailed usage instructions")
    
    return 0

if __name__ == "__main__":
    exit(main())