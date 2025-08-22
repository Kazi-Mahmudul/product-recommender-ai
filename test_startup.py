#!/usr/bin/env python3
"""
Simple test script to verify that the application can start correctly
"""
import os
import sys

# Add the current directory to the path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test importing the main app
try:
    from app.main import app
    print("✅ Successfully imported app")
except Exception as e:
    print(f"❌ Failed to import app: {e}")
    sys.exit(1)

# Test importing settings
try:
    from app.core.config import settings
    print("✅ Successfully imported settings")
except Exception as e:
    print(f"❌ Failed to import settings: {e}")
    sys.exit(1)

# Test database connection
try:
    from app.core.database import engine
    print("✅ Successfully created database engine")
except Exception as e:
    print(f"❌ Failed to create database engine: {e}")
    sys.exit(1)

# Print some debug information
print(f"\nDebug information:")
print(f"PORT: {os.getenv('PORT', 'Not set')}")
print(f"ENVIRONMENT: {os.getenv('ENVIRONMENT', 'Not set')}")

print("\n✅ All tests passed!")