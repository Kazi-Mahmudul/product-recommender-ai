#!/usr/bin/env python3
"""
Test script to verify frontend integration with cookies
"""

import requests
import json
from datetime import datetime

# Use the production URL that frontend is using
BASE_URL = "https://pickbd-ai.onrender.com/api/v1"

def test_frontend_integration():
    print("🧪 Testing Frontend Integration with Production API")
    print("=" * 60)
    print(f"API Base URL: {BASE_URL}")
    
    # Create a session to maintain cookies
    session = requests.Session()
    
    # Test 1: Create/Get a session (this should set the cookie)
    print("\n1. Testing session creation...")
    try:
        response = session.get(f"{BASE_URL}/comparison/session")
        if response.status_code == 200:
            session_data = response.json()
            print(f"✅ Session created: {session_data['session_id']}")
            
            # Check if cookie was set
            cookies = session.cookies.get_dict()
            if 'comparison_session_id' in cookies:
                print(f"✅ Session cookie set: {cookies['comparison_session_id']}")
            else:
                print("⚠️  No session cookie found in response")
        else:
            print(f"❌ Failed to create session: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating session: {e}")
        return False
    
    # Test 2: Add item without explicit cookie (should work now)
    print("\n2. Testing adding item with session cookie...")
    test_slug = "motorola-edge-30-ultra-12gb-256gb"
    try:
        response = session.post(f"{BASE_URL}/comparison/items/{test_slug}")
        if response.status_code == 200:
            item_data = response.json()
            print(f"✅ Added {test_slug} to comparison")
            print(f"   Item ID: {item_data['id']}")
        else:
            print(f"❌ Failed to add item: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error adding item: {e}")
        return False
    
    # Test 3: Get items
    print("\n3. Testing getting comparison items...")
    try:
        response = session.get(f"{BASE_URL}/comparison/items")
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Retrieved {len(items)} comparison items")
            for item in items:
                print(f"   - {item['slug']} (ID: {item['id']})")
        else:
            print(f"❌ Failed to get items: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error getting items: {e}")
    
    # Test 4: Test without cookies (new session)
    print("\n4. Testing add item without existing session...")
    try:
        # Use a new session without cookies
        response = requests.post(f"{BASE_URL}/comparison/items/honor-400-pro-china")
        if response.status_code == 200:
            item_data = response.json()
            print(f"✅ Added item without existing session")
            print(f"   Item ID: {item_data['id']}")
            
            # Check if new cookie was set
            if 'comparison_session_id' in response.cookies:
                print(f"✅ New session cookie created: {response.cookies['comparison_session_id']}")
            else:
                print("⚠️  No new session cookie found")
        else:
            print(f"❌ Failed to add item without session: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error testing without session: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Frontend integration test completed!")
    return True

def test_cors_headers():
    """Test CORS headers"""
    print("\n🌐 Testing CORS Headers")
    print("-" * 30)
    
    try:
        # Test preflight request
        response = requests.options(
            f"{BASE_URL}/comparison/session",
            headers={
                'Origin': 'https://pickbd.vercel.app',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        )
        
        print(f"Preflight response: {response.status_code}")
        print("CORS Headers:")
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        for header, value in cors_headers.items():
            print(f"  {header}: {value}")
            
        if 'access-control-allow-credentials' in cors_headers:
            print("✅ Credentials allowed in CORS")
        else:
            print("❌ Credentials not allowed in CORS")
            
    except Exception as e:
        print(f"❌ Error testing CORS: {e}")

if __name__ == "__main__":
    print(f"🚀 Starting frontend integration tests at {datetime.now()}")
    print("Testing against production API...")
    print()
    
    # Test main functionality
    test_frontend_integration()
    
    # Test CORS
    test_cors_headers()
    
    print(f"\n✨ Tests completed at {datetime.now()}")
    print("\n💡 If tests pass, the frontend should now work correctly!")
    print("   Make sure to rebuild/restart your frontend application.")