import requests
import sys
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login"
ME_URL = f"{BASE_URL}/auth/me"
PHONES_URL = f"{BASE_URL}/phones/"
COMPARISON_URL = f"{BASE_URL}/comparison/items/apple-iphone-13-pro-max" # Using a known slug, hopefully exists or we need to find one first

def verify_actions(email, password):
    print(f"--- Verifying Actions for {email} ---")
    
    # 1. Login
    s = requests.Session()
    try:
        resp = s.post(LOGIN_URL, json={"email": email, "password": password})
        if resp.status_code != 200:
            print(f"Login Failed: {resp.text}")
            return
        
        token = resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        s.headers.update(headers)
        print("Login Successful.")
        
        # 2. Get Initial Stats from /auth/me
        me_resp = s.get(ME_URL)
        if me_resp.status_code != 200:
             print(f"Failed to get profile: {me_resp.text}")
             return
             
        user_data = me_resp.json()
        initial_stats = user_data.get("usage_stats", {})
        print(f"Initial Stats: {initial_stats}")
        
        init_searches = initial_stats.get("total_searches", 0)
        init_compares = initial_stats.get("total_comparisons", 0)

        # 3. Perform Search
        print("Performing Search...")
        search_resp = s.get(PHONES_URL, params={"search": "test_search_action"})
        if search_resp.status_code != 200:
            print(f"Search Failed: {search_resp.status_code}")
        
        # 4. Perform Comparison Add
        # Need to ensure we have a session
        print("Performing Comparison Add...")
        # We need a valid slug. Let's get one from the search result if possible
        slug = "apple-iphone-13" # Fallback
        if search_resp.status_code == 200:
             items = search_resp.json().get("items", [])
             if items:
                 slug = items[0].get("slug")
        
        comp_resp = s.post(f"{BASE_URL}/comparison/items/{slug}")
        if comp_resp.status_code != 200:
             print(f"Comparison Add Failed: {comp_resp.status_code} - {comp_resp.text}")
        else:
             print(f"Added {slug} to comparison.")

        # 5. Verify Stats Increment
        # Fetch profile again
        me_resp_new = s.get(ME_URL)
        new_stats = me_resp_new.json().get("usage_stats", {})
        print(f"New Stats: {new_stats}")
        
        new_searches = new_stats.get("total_searches", 0)
        new_compares = new_stats.get("total_comparisons", 0)
        
        if new_searches > init_searches:
            print("✅ Total Searches incremented.")
        else:
            print(f"❌ Total Searches NOT incremented. ({init_searches} -> {new_searches})")
            
        if new_compares > init_compares:
             print("✅ Total Comparisons incremented.")
        else:
             print(f"❌ Total Comparisons NOT incremented. ({init_compares} -> {new_compares})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_actions("shafi16221@gmail.com", "SuperAdminShafiPeyechi162")
