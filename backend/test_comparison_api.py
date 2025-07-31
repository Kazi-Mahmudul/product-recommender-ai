#!/usr/bin/env python3
"""
Test script to verify the session-based comparison system is working
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_comparison_system():
    print("🧪 Testing Session-Based Comparison System")
    print("=" * 50)
    
    # Test 1: Create/Get a session
    print("\n1. Testing session creation...")
    try:
        response = requests.get(f"{BASE_URL}/comparison/session")
        if response.status_code == 200:
            session_data = response.json()
            print(f"✅ Session created/retrieved: {session_data['session_id']}")
            print(f"   Created at: {session_data['created_at']}")
            print(f"   Expires at: {session_data['expires_at']}")
            
            # Extract session cookie
            session_cookie = None
            for cookie in response.cookies:
                if cookie.name == "comparison_session_id":
                    session_cookie = cookie.value
                    break
            
            if session_cookie:
                print(f"✅ Session cookie set: {session_cookie}")
            else:
                print("❌ No session cookie found")
                return False
        else:
            print(f"❌ Failed to create session: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating session: {e}")
        return False
    
    # Test 2: Get some sample phone slugs from the database
    print("\n2. Getting sample phone slugs...")
    try:
        response = requests.get(f"{BASE_URL}/phones?limit=5")
        if response.status_code == 200:
            phones_data = response.json()
            sample_slugs = [phone['slug'] for phone in phones_data['items'] if phone.get('slug')][:3]
            print(f"✅ Found sample slugs: {sample_slugs}")
        else:
            print(f"⚠️  Could not get phones: {response.status_code}")
            # Use fallback slugs
            sample_slugs = ["samsung-galaxy-a15", "realme-narzo-70", "xiaomi-redmi-note-13"]
            print(f"Using fallback slugs: {sample_slugs}")
    except Exception as e:
        print(f"⚠️  Error getting phones: {e}")
        sample_slugs = ["samsung-galaxy-a15", "realme-narzo-70", "xiaomi-redmi-note-13"]
        print(f"Using fallback slugs: {sample_slugs}")
    
    # Test 3: Add items to comparison
    print("\n3. Testing adding items to comparison...")
    cookies = {"comparison_session_id": session_cookie}
    
    added_items = []
    for slug in sample_slugs:
        try:
            response = requests.post(
                f"{BASE_URL}/comparison/items/{slug}",
                cookies=cookies
            )
            if response.status_code == 200:
                item_data = response.json()
                print(f"✅ Added {slug} to comparison")
                print(f"   Item ID: {item_data['id']}")
                print(f"   Added at: {item_data['added_at']}")
                added_items.append(slug)
            else:
                print(f"⚠️  Could not add {slug}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error adding {slug}: {e}")
    
    # Test 4: Get comparison items
    print("\n4. Testing retrieval of comparison items...")
    try:
        response = requests.get(f"{BASE_URL}/comparison/items", cookies=cookies)
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Retrieved {len(items)} comparison items:")
            for item in items:
                print(f"   - {item['slug']} (ID: {item['id']})")
        else:
            print(f"❌ Failed to get items: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error getting items: {e}")
    
    # Test 5: Remove an item
    if added_items:
        print("\n5. Testing item removal...")
        slug_to_remove = added_items[0]
        try:
            response = requests.delete(
                f"{BASE_URL}/comparison/items/{slug_to_remove}",
                cookies=cookies
            )
            if response.status_code == 200:
                print(f"✅ Removed {slug_to_remove} from comparison")
            else:
                print(f"❌ Failed to remove {slug_to_remove}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error removing {slug_to_remove}: {e}")
        
        # Test 6: Verify removal
        print("\n6. Verifying item removal...")
        try:
            response = requests.get(f"{BASE_URL}/comparison/items", cookies=cookies)
            if response.status_code == 200:
                items = response.json()
                print(f"✅ Now have {len(items)} comparison items:")
                for item in items:
                    print(f"   - {item['slug']} (ID: {item['id']})")
            else:
                print(f"❌ Failed to get items: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error getting items: {e}")
    
    # Test 7: Test session persistence (create new request with same cookie)
    print("\n7. Testing session persistence...")
    try:
        response = requests.get(f"{BASE_URL}/comparison/session", cookies=cookies)
        if response.status_code == 200:
            session_data = response.json()
            if session_data['session_id'] == session_cookie:
                print("✅ Session persisted correctly")
            else:
                print(f"⚠️  Session changed: {session_cookie} -> {session_data['session_id']}")
        else:
            print(f"❌ Failed to get session: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing session persistence: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Session-based comparison system test completed!")
    return True

def test_phone_api():
    """Test phone API endpoints"""
    print("\n📱 Testing Phone API Endpoints")
    print("-" * 30)
    
    # Test getting phones
    try:
        response = requests.get(f"{BASE_URL}/phones?limit=3")
        if response.status_code == 200:
            phones_data = response.json()
            print(f"✅ Retrieved {len(phones_data['items'])} phones")
            
            # Test getting a phone by slug
            if phones_data['items']:
                first_phone = phones_data['items'][0]
                if first_phone.get('slug'):
                    slug = first_phone['slug']
                    response = requests.get(f"{BASE_URL}/phones/slug/{slug}")
                    if response.status_code == 200:
                        phone_data = response.json()
                        print(f"✅ Retrieved phone by slug: {phone_data['name']}")
                    else:
                        print(f"⚠️  Could not get phone by slug: {response.status_code}")
        else:
            print(f"⚠️  Could not get phones: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing phone API: {e}")

if __name__ == "__main__":
    print(f"🚀 Starting API tests at {datetime.now()}")
    print("Make sure your server is running: uvicorn app.main:app --reload")
    print()
    
    # Test phone API first
    test_phone_api()
    
    # Test comparison system
    test_comparison_system()
    
    print(f"\n✨ Tests completed at {datetime.now()}")