import requests
import uuid
import sys
import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add current directory to path so we can import app modules if needed
sys.path.append(os.getcwd())

from app.core.config import settings
from app.models.user import User as UserModel
from app.models.guest import GuestUsage

BASE_URL = "http://127.0.0.1:8000/api/v1"
CHAT_URL = f"{BASE_URL}/chat/query"
LOGIN_URL = f"{BASE_URL}/auth/login"

# ...

def verify_user_usage(email, password):
    print(f"\n--- Testing REGISTERED USER Usage ({email}) ---")
    
    # 1. Login
    print(f"1. Logging in...")
    try:
        login_resp = requests.post(
            LOGIN_URL,
            json={"email": email, "password": password},
            timeout=10
        )
        if login_resp.status_code != 200:
            print(f"   [FAIL] Login failed at {login_resp.url}")
            print(f"   Response: {login_resp.text}")
            return
        
        token = login_resp.json().get("access_token")
        print("   [PASS] Login successful. Got token.")
    except Exception as e:
        print(f"   [ERROR] Login exception: {e}")
        return

    # 2. Get Initial Usage Stats from DB
    db = get_db_connection()
    user = db.query(UserModel).filter(UserModel.email == email).first()
    initial_count = 0
    if user and user.usage_stats:
        initial_count = user.usage_stats.get("total_chats", 0)
    print(f"2. Initial DB Chat Count: {initial_count}")
    db.close()

    # 3. Send Chat Request
    print("3. Sending chat request as User...")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        response = requests.post(
            CHAT_URL, 
            json={"query": "Hello user test"}, 
            headers=headers,
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        # Check Headers
        limit = response.headers.get("X-RateLimit-Limit")
        remaining = response.headers.get("X-RateLimit-Remaining")
        print(f"   Headers -> Limit: {limit}, Remaining: {remaining}")

        # 4. Verify DB Update
        db = get_db_connection()
        db.expire_all() # Ensure we get fresh data
        user_fresh = db.query(UserModel).filter(UserModel.email == email).first()
        new_count = user_fresh.usage_stats.get("total_chats", 0)
        
        print(f"4. New DB Chat Count: {new_count}")
        
        if new_count == initial_count + 1:
            print("   [PASS] User usage_stats incremented correctly.")
        else:
            print(f"   [FAIL] Usage stats did not update. Expected {initial_count + 1}, got {new_count}")
            
        db.close()

    except Exception as e:
         print(f"   [ERROR] Request failed: {e}")


if __name__ == "__main__":
    print("Starting Comprehensive Verification...")
    verify_guest_usage()
    # verify_user_usage("shafi16221@gmail.com", "SuperAdminShafiPeyechi162")
    # Commented out user test by default to avoid spamming the real account unless explicitly asked to run.
    # But since user ASKED to test this account, I will uncomment it.
    verify_user_usage("shafi16221@gmail.com", "SuperAdminShafiPeyechi162")
