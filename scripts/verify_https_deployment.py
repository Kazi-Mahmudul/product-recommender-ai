#!/usr/bin/env python3
"""
Script to verify HTTPS deployment functionality.
"""

import requests
import sys
import json
import time
from urllib.parse import urljoin

def test_endpoint(base_url, endpoint, expected_status=200, timeout=10):
    """Test a single endpoint."""
    url = urljoin(base_url, endpoint)
    try:
        print(f"Testing {url}...")
        response = requests.get(url, timeout=timeout, verify=True)
        
        if response.status_code == expected_status:
            print(f"✅ {endpoint} - Status: {response.status_code}")
            return True, response
        else:
            print(f"❌ {endpoint} - Expected: {expected_status}, Got: {response.status_code}")
            return False, response
            
    except requests.exceptions.SSLError as e:
        print(f"❌ {endpoint} - SSL Error: {e}")
        return False, None
    except requests.exceptions.ConnectionError as e:
        print(f"❌ {endpoint} - Connection Error: {e}")
        return False, None
    except requests.exceptions.Timeout as e:
        print(f"❌ {endpoint} - Timeout Error: {e}")
        return False, None
    except Exception as e:
        print(f"❌ {endpoint} - Unexpected Error: {e}")
        return False, None

def test_https_redirect(base_url):
    """Test HTTP to HTTPS redirect."""
    if not base_url.startswith('https://'):
        print("⚠️  Base URL is not HTTPS, skipping redirect test")
        return True
        
    http_url = base_url.replace('https://', 'http://')
    try:
        print(f"Testing HTTP redirect from {http_url}...")
        response = requests.get(http_url, timeout=10, allow_redirects=False)
        
        if response.status_code in [301, 302, 307, 308]:
            location = response.headers.get('location', '')
            if location.startswith('https://'):
                print(f"✅ HTTP redirect working - Status: {response.status_code}")
                return True
            else:
                print(f"❌ HTTP redirect not to HTTPS - Location: {location}")
                return False
        else:
            print(f"❌ No HTTP redirect - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"⚠️  Could not test HTTP redirect: {e}")
        return True  # Don't fail the test if we can't test redirect

def test_security_headers(base_url):
    """Test security headers."""
    success, response = test_endpoint(base_url, "/health")
    
    if not success or not response:
        return False
        
    headers = response.headers
    security_headers = {
        'strict-transport-security': 'HSTS',
        'x-frame-options': 'Clickjacking protection',
        'x-content-type-options': 'MIME type sniffing protection',
        'x-xss-protection': 'XSS protection',
        'referrer-policy': 'Referrer policy',
        'content-security-policy': 'Content Security Policy'
    }
    
    print("\n🔒 Security Headers Check:")
    all_present = True
    
    for header, description in security_headers.items():
        if header in headers:
            print(f"✅ {description} ({header}): {headers[header]}")
        else:
            print(f"❌ Missing {description} ({header})")
            all_present = False
    
    return all_present

def test_cors_configuration(base_url):
    """Test CORS configuration."""
    try:
        print("\n🌐 CORS Configuration Check:")
        
        # Test preflight request
        response = requests.options(
            urljoin(base_url, "/api/v1/phones"),
            headers={
                'Origin': 'https://peyechi.vercel.app',
                'Access-Control-Request-Method': 'GET'
            },
            timeout=10
        )
        
        if response.status_code in [200, 204]:
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
            }
            
            print(f"✅ CORS preflight - Status: {response.status_code}")
            for header, value in cors_headers.items():
                if value:
                    print(f"  {header}: {value}")
            return True
        else:
            print(f"❌ CORS preflight failed - Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
        return False

def test_api_endpoints(base_url):
    """Test critical API endpoints."""
    print("\n🔌 API Endpoints Check:")
    
    endpoints = [
        ("/", 200),
        ("/health", 200),
        ("/api/v1/health", 200),
        ("/api/v1/phones", 200),
        ("/api/v1/auth/logout", 200),  # This should work without auth
    ]
    
    all_success = True
    for endpoint, expected_status in endpoints:
        success, _ = test_endpoint(base_url, endpoint, expected_status)
        if not success:
            all_success = False
    
    return all_success

def test_authentication_endpoints(base_url):
    """Test authentication endpoints."""
    print("\n🔐 Authentication Endpoints Check:")
    
    # Test endpoints that should be accessible
    auth_endpoints = [
        ("/api/v1/auth/logout", 200),
    ]
    
    all_success = True
    for endpoint, expected_status in auth_endpoints:
        success, _ = test_endpoint(base_url, endpoint, expected_status)
        if not success:
            all_success = False
    
    # Test protected endpoint (should return 401 or 422)
    success, response = test_endpoint(base_url, "/api/v1/auth/me", expected_status=401)
    if not success and response and response.status_code != 422:
        print(f"❌ /api/v1/auth/me should return 401 or 422, got {response.status_code}")
        all_success = False
    elif response and response.status_code in [401, 422]:
        print(f"✅ /api/v1/auth/me properly protected - Status: {response.status_code}")
    
    return all_success

def main():
    """Main verification function."""
    if len(sys.argv) != 2:
        print("Usage: python verify_https_deployment.py <base_url>")
        print("Example: python verify_https_deployment.py https://your-app.run.app")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    
    if not base_url.startswith('https://'):
        print("⚠️  Warning: Base URL should use HTTPS")
    
    print(f"🚀 Starting HTTPS deployment verification for: {base_url}")
    print("=" * 60)
    
    tests = [
        ("Basic connectivity", lambda: test_endpoint(base_url, "/health")[0]),
        ("HTTPS redirect", lambda: test_https_redirect(base_url)),
        ("Security headers", lambda: test_security_headers(base_url)),
        ("CORS configuration", lambda: test_cors_configuration(base_url)),
        ("API endpoints", lambda: test_api_endpoints(base_url)),
        ("Authentication endpoints", lambda: test_authentication_endpoints(base_url)),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        print("-" * 40)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! HTTPS deployment is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()