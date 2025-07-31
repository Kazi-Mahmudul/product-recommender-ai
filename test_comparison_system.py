#!/usr/bin/env python3
"""
Test script to verify the session-based comparison system
"""

import requests
import json
import uuid
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_comparison_system():
    print("🧪 Testing Session-Based Comparison System")
    print("=" * 50)
    
    # Test 1: Create a new session
    print("\n1. Testing session creation...")
    try:
        response = requests.get(f"{BASE_URL}/comparison/session")
        if response.status_code == 200:
            session_data = response.json()
            print(f"✅ Session created: {session_data['session_id']}")
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
            print(f"❌ Failed to create session: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error creating session: {e}")
        return False
    
    # Test 2: Add items to comparison
    print("\n2. Testing adding items to comparison...")
    cookies = {"comparison_session_id": session_cookie}
    
    # Test with some sample phone slugs (you may need to adjust these based on your data)
    test_slugs = ["samsung-galaxy-a15", "realme-narzo-70", "xiaomi-redmi-note-13"]
    
    for slug in test_slugs:
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
            else:
                print(f"⚠️  Could not add {slug}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error adding {slug}: {e}")
    
    # Test 3: Get comparison items
    print("\n3. Testing retrieval of comparison items...")
    try:
        response = requests.get(f"{BASE_URL}/comparison/items", cookies=cookies)
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Retrieved {len(items)} comparison items:")
            for item in items:
                print(f"   - {item['slug']} (ID: {item['id']})")
        else:
            print(f"❌ Failed to get items: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting items: {e}")
    
    # Test 4: Remove an item
    print("\n4. Testing item removal...")
    if test_slugs:
        slug_to_remove = test_slugs[0]
        try:
            response = requests.delete(
                f"{BASE_URL}/comparison/items/{slug_to_remove}",
                cookies=cookies
            )
            if response.status_code == 200:
                print(f"✅ Removed {slug_to_remove} from comparison")
            else:
                print(f"❌ Failed to remove {slug_to_remove}: {response.status_code}")
        except Exception as e:
            print(f"❌ Error removing {slug_to_remove}: {e}")
    
    # Test 5: Verify removal
    print("\n5. Verifying item removal...")
    try:
        response = requests.get(f"{BASE_URL}/comparison/items", cookies=cookies)
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Now have {len(items)} comparison items:")
            for item in items:
                print(f"   - {item['slug']} (ID: {item['id']})")
        else:
            print(f"❌ Failed to get items: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting items: {e}")
    
    # Test 6: Test slug-based phone API
    print("\n6. Testing slug-based phone API...")
    try:
        # Test getting a phone by slug
        response = requests.get(f"{BASE_URL}/phones/slug/samsung-galaxy-a15")
        if response.status_code == 200:
            phone_data = response.json()
            print(f"✅ Retrieved phone by slug: {phone_data['name']}")
            print(f"   Brand: {phone_data['brand']}")
            print(f"   Price: {phone_data['price']}")
        else:
            print(f"⚠️  Could not get phone by slug: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting phone by slug: {e}")
    
    # Test 7: Test bulk phone fetch by slugs
    print("\n7. Testing bulk phone fetch by slugs...")
    try:
        slugs_param = ",".join(test_slugs[:2])  # Test with first 2 slugs
        response = requests.get(f"{BASE_URL}/phones/bulk?slugs={slugs_param}")
        if response.status_code == 200:
            bulk_data = response.json()
            print(f"✅ Bulk fetch successful:")
            print(f"   Requested: {bulk_data['total_requested']}")
            print(f"   Found: {bulk_data['total_found']}")
            print(f"   Not found: {bulk_data['not_found']}")
        else:
            print(f"⚠️  Bulk fetch failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error in bulk fetch: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Session-based comparison system test completed!")
    return True

if __name__ == "__main__":
    test_comparison_system()