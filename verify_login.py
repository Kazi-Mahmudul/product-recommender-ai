import requests
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login"
CHAT_URL = f"{BASE_URL}/chat/query"

def verify_login_and_usage(email, password):
    print(f"Testing Login for {email} to {LOGIN_URL}")
    
    try:
        # 1. Login
        resp = requests.post(LOGIN_URL, json={"email": email, "password": password})
        print(f"Login Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Login Response: {resp.text}")
            return
            
        data = resp.json()
        token = data.get("access_token")
        print(f"Token received: {token[:10]}...")
        
        # 2. Chat
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Sending chat to {CHAT_URL}")
        chat_resp = requests.post(CHAT_URL, json={"query": "usage verification"}, headers=headers)
        
        print(f"Chat Status: {chat_resp.status_code}")
        print("Headers:")
        for k, v in chat_resp.headers.items():
            if "RateLimit" in k:
                print(f"  {k}: {v}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_login_and_usage("shafi16221@gmail.com", "SuperAdminShafiPeyechi162")
