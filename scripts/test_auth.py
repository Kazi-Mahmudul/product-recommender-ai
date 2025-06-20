#!/usr/bin/env python3
"""
Test script for the authentication system.
This script tests the signup, verification, and login flow.
"""

import sys
import os
import requests
import json
from datetime import datetime

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Configuration
BASE_URL = "https://pickbd-ai.onrender.com/api/v1"
TEST_EMAIL = f"test_{int(datetime.now().timestamp())}@example.com"
TEST_PASSWORD = "TestPassword123"

def test_auth_endpoints():
    """Test the authentication endpoints."""
    
    print("🧪 Testing Authentication System")
    print("=" * 50)
    
    # Test 1: Signup
    print("\n1️⃣ Testing Signup...")
    signup_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "confirm_password": TEST_PASSWORD,
        "first_name": "Test",
        "last_name": "User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 201:
            print("   ✅ Signup successful!")
            print(f"   📧 Verification email sent to: {TEST_EMAIL}")
        else:
            print(f"   ❌ Signup failed: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
        return False
    
    # Test 2: Login (should fail - email not verified)
    print("\n2️⃣ Testing Login (unverified user)...")
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("   ✅ Login correctly rejected for unverified user!")
        else:
            print(f"   ⚠️  Unexpected response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
    
    # Test 3: Get current user (should fail - no token)
    print("\n3️⃣ Testing Get Current User (no token)...")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("   ✅ Correctly rejected request without token!")
        else:
            print(f"   ⚠️  Unexpected response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
    
    # Test 4: Resend verification
    print("\n4️⃣ Testing Resend Verification...")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/resend-verification", params={"email": TEST_EMAIL})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Resend verification successful!")
        else:
            print(f"   ⚠️  Resend verification response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎉 Authentication system test completed!")
    print("\n📝 Manual verification required:")
    print("   1. Check your email for verification codes")
    print("   2. Use the verification code to verify your email")
    print("   3. Test login with verified account")
    print("   4. Test protected endpoints with JWT token")
    
    return True

def test_api_documentation():
    """Test if the API documentation is accessible."""
    
    print("\n📚 Testing API Documentation...")
    
    try:
        response = requests.get(f"{BASE_URL}/docs")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ API documentation accessible!")
            print(f"   🌐 Visit: {BASE_URL}/docs")
        else:
            print("   ❌ API documentation not accessible")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting Authentication System Tests")
    print(f"📍 Base URL: {BASE_URL}")
    print(f"📧 Test Email: {TEST_EMAIL}")
    
    # Test API documentation
    test_api_documentation()
    
    # Test authentication endpoints
    success = test_auth_endpoints()
    
    if success:
        print("\n✅ All tests completed successfully!")
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1) 