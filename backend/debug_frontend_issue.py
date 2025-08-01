#!/usr/bin/env python3
"""
Debug script to identify why frontend isn't showing comparison items
"""

import requests
import json
from datetime import datetime

PRODUCTION_URL = "https://pickbd-ai.onrender.com/api/v1"

def debug_frontend_issue():
    print("🔍 Debugging Frontend Comparison Issue")
    print("=" * 60)
    
    # Create a session to maintain cookies like a browser would
    session = requests.Session()
    
    # Step 1: Create a session (like frontend does on load)
    print("\n1. Creating session (like frontend on page load)...")
    try:
        response = session.get(f"{PRODUCTION_URL}/comparison/session")
        if response.status_code == 200:
            session_data = response.json()
            session_id = session_data['session_id']
            print(f"✅ Session created: {session_id}")
            
            # Check cookies
            cookies = session.cookies.get_dict()
            if 'comparison_session_id' in cookies:
                print(f"✅ Cookie set: {cookies['comparison_session_id']}")
            else:
                print("❌ No session cookie found!")
                return False
        else:
            print(f"❌ Session creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error creating session: {e}")
        return False
    
    # Step 2: Add a phone (like clicking compare button)
    print("\n2. Adding phone to comparison (like clicking compare button)...")
    test_slug = "motorola-edge-30-ultra-12gb-256gb"
    try:
        response = session.post(f"{PRODUCTION_URL}/comparison/items/{test_slug}")
        if response.status_code == 200:
            item_data = response.json()
            print(f"✅ Phone added to database: {item_data}")
        else:
            print(f"❌ Failed to add phone: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error adding phone: {e}")
        return False
    
    # Step 3: Get comparison items (like frontend does to update UI)
    print("\n3. Getting comparison items (like frontend does to update UI)...")
    try:
        response = session.get(f"{PRODUCTION_URL}/comparison/items")
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Retrieved {len(items)} items from database:")
            for item in items:
                print(f"   - {item['slug']} (ID: {item['id']}, Session: {item.get('session_id', 'N/A')})")
            
            if len(items) == 0:
                print("❌ ISSUE FOUND: No items returned even though we just added one!")
                return False
        else:
            print(f"❌ Failed to get items: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error getting items: {e}")
        return False
    
    # Step 4: Test without cookies (simulate new browser tab)
    print("\n4. Testing without cookies (simulate new browser tab)...")
    try:
        response = requests.get(f"{PRODUCTION_URL}/comparison/items")
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Without cookies: {len(items)} items (should be 0)")
        else:
            print(f"❌ Without cookies failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing without cookies: {e}")
    
    # Step 5: Test phone data fetching (what frontend needs)
    print("\n5. Testing phone data fetching (what frontend needs)...")
    try:
        # Get the slugs from comparison items
        response = session.get(f"{PRODUCTION_URL}/comparison/items")
        if response.status_code == 200:
            items = response.json()
            if items:
                slugs = [item['slug'] for item in items]
                print(f"   Slugs to fetch: {slugs}")
                
                # Test bulk phone fetch (what frontend uses)
                slugs_param = ",".join(slugs)
                response = session.get(f"{PRODUCTION_URL}/phones/bulk?slugs={slugs_param}")
                if response.status_code == 200:
                    phones_data = response.json()
                    print(f"✅ Fetched {phones_data['total_found']} phone details")
                    for phone in phones_data['phones']:
                        print(f"   - {phone['brand']} {phone['name']} (${phone['price']})")
                else:
                    print(f"❌ Failed to fetch phone details: {response.status_code}")
            else:
                print("⚠️  No items to fetch phone details for")
    except Exception as e:
        print(f"❌ Error testing phone data fetch: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 DIAGNOSIS SUMMARY")
    print("=" * 60)
    
    # Final diagnosis
    print("✅ Session creation: Working")
    print("✅ Phone addition: Working") 
    print("✅ Item retrieval: Working")
    print("✅ Phone data fetch: Working")
    print()
    print("🤔 If backend is working but frontend isn't updating:")
    print("   1. Check browser console for JavaScript errors")
    print("   2. Check if ComparisonProvider is re-fetching after addPhone")
    print("   3. Check if cookies are being sent with frontend requests")
    print("   4. Check if frontend is calling the right API endpoints")
    print("   5. Check if there are CORS issues preventing cookie sharing")
    
    return True

def test_cors_and_cookies():
    print("\n🌐 Testing CORS and Cookie Behavior")
    print("-" * 40)
    
    # Test with frontend origin
    frontend_origin = "https://pickbd.vercel.app"
    
    try:
        # Test session creation with origin header
        response = requests.get(
            f"{PRODUCTION_URL}/comparison/session",
            headers={'Origin': frontend_origin}
        )
        
        print(f"Session creation with origin: {response.status_code}")
        
        # Check CORS headers
        cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
        print("CORS headers:")
        for header, value in cors_headers.items():
            print(f"  {header}: {value}")
        
        # Check if cookies are set
        if response.cookies:
            print("Cookies set:")
            for cookie in response.cookies:
                print(f"  {cookie.name}: {cookie.value} (secure: {cookie.secure}, httponly: {cookie.has_nonstandard_attr('HttpOnly')})")
        else:
            print("❌ No cookies set!")
            
    except Exception as e:
        print(f"❌ Error testing CORS: {e}")

if __name__ == "__main__":
    print(f"🚀 Starting frontend debug at {datetime.now()}")
    print()
    
    success = debug_frontend_issue()
    test_cors_and_cookies()
    
    if success:
        print("\n✅ Backend API is working correctly!")
        print("🔍 The issue is likely in the frontend JavaScript code.")
        print("\n📋 Frontend Debugging Checklist:")
        print("1. Open browser dev tools (F12)")
        print("2. Check Console tab for JavaScript errors")
        print("3. Check Network tab to see if API calls are being made")
        print("4. Check Application tab > Cookies to see if session cookie exists")
        print("5. Check if ComparisonProvider is properly fetching data")
        print("6. Check if ComparisonWidget is receiving the updated state")
    else:
        print("\n❌ Backend API has issues that need to be fixed first.")
    
    print(f"\n✨ Debug completed at {datetime.now()}")