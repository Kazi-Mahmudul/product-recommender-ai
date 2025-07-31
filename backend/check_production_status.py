#!/usr/bin/env python3
"""
Check if production API has been updated with the fixes
"""

import requests
import json
from datetime import datetime

PRODUCTION_URL = "https://pickbd-ai.onrender.com/api/v1"

def check_production_status():
    print("🔍 Checking Production API Status")
    print("=" * 50)
    print(f"Production URL: {PRODUCTION_URL}")
    
    # Test 1: Check if we can add item without session (should work after fix)
    print("\n1. Testing add item without session cookie...")
    try:
        response = requests.post(
            f"{PRODUCTION_URL}/comparison/items/test-phone-slug",
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            print("✅ SUCCESS: Can add items without session (fix deployed)")
            item_data = response.json()
            print(f"   Created item with ID: {item_data.get('id')}")
            
            # Check if session cookie was set
            if 'comparison_session_id' in response.cookies:
                print(f"✅ Session cookie created: {response.cookies['comparison_session_id']}")
            else:
                print("⚠️  No session cookie in response")
                
        elif response.status_code == 422:
            print("❌ NEEDS UPDATE: Still getting 422 error (fix not deployed)")
            error_detail = response.json()
            print(f"   Error: {error_detail}")
            
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing production: {e}")
    
    # Test 2: Check if we can get items without session (should return empty list)
    print("\n2. Testing get items without session cookie...")
    try:
        response = requests.get(f"{PRODUCTION_URL}/comparison/items")
        
        if response.status_code == 200:
            items = response.json()
            print(f"✅ SUCCESS: Got {len(items)} items without session (fix deployed)")
            
        elif response.status_code == 422:
            print("❌ NEEDS UPDATE: Still getting 422 error (fix not deployed)")
            
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing get items: {e}")
    
    # Test 3: Check session creation
    print("\n3. Testing session creation...")
    try:
        response = requests.get(f"{PRODUCTION_URL}/comparison/session")
        
        if response.status_code == 200:
            session_data = response.json()
            print("✅ Session creation works")
            print(f"   Session ID: {session_data.get('session_id')}")
            
            # Check cookie
            if 'comparison_session_id' in response.cookies:
                print("✅ Session cookie set correctly")
            else:
                print("⚠️  No session cookie found")
                
        else:
            print(f"❌ Session creation failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing session creation: {e}")
    
    print("\n" + "=" * 50)
    print("📊 PRODUCTION STATUS SUMMARY")
    print("=" * 50)
    
    # Overall assessment
    try:
        # Quick test to determine if fixes are deployed
        test_response = requests.post(f"{PRODUCTION_URL}/comparison/items/test-slug")
        
        if test_response.status_code == 200:
            print("🎉 PRODUCTION IS UPDATED!")
            print("✅ Backend fixes have been deployed")
            print("✅ Frontend should now work correctly")
            print("✅ No more 422 errors expected")
            
        elif test_response.status_code == 422:
            print("⚠️  PRODUCTION NEEDS UPDATE")
            print("❌ Backend fixes not yet deployed")
            print("❌ Frontend will still get 422 errors")
            print("🚀 Deploy the updated backend code to fix this")
            
        else:
            print("❓ UNCLEAR STATUS")
            print(f"   Unexpected response: {test_response.status_code}")
            
    except Exception as e:
        print(f"❌ Could not determine status: {e}")

def show_deployment_instructions():
    print("\n🚀 DEPLOYMENT INSTRUCTIONS")
    print("-" * 30)
    print("If production needs update:")
    print("1. Push your code changes to Git repository")
    print("2. Wait for auto-deployment (Render/Vercel)")
    print("3. Or manually deploy to your hosting service")
    print("4. Run this script again to verify")
    print("\nFiles that need to be deployed:")
    print("- app/api/endpoints/comparison.py (backend)")
    print("- frontend/src/api/comparison.ts (frontend)")

if __name__ == "__main__":
    print(f"🚀 Checking production status at {datetime.now()}")
    print()
    
    check_production_status()
    show_deployment_instructions()
    
    print(f"\n✨ Check completed at {datetime.now()}")