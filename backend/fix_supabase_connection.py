#!/usr/bin/env python3
"""
Script to diagnose and fix Supabase connection issues
"""

import socket
import requests
import os
import time
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_dns_resolution(hostname):
    """Test if hostname can be resolved"""
    try:
        ip = socket.gethostbyname(hostname)
        print(f"✅ DNS Resolution: {hostname} -> {ip}")
        return True
    except socket.gaierror as e:
        print(f"❌ DNS Resolution Failed: {hostname} - {e}")
        return False

def test_port_connectivity(hostname, port):
    """Test if port is accessible"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((hostname, port))
        sock.close()
        
        if result == 0:
            print(f"✅ Port Connectivity: {hostname}:{port} is accessible")
            return True
        else:
            print(f"❌ Port Connectivity: {hostname}:{port} is not accessible")
            return False
    except Exception as e:
        print(f"❌ Port Test Error: {e}")
        return False

def test_http_connectivity(url):
    """Test HTTP connectivity to Supabase"""
    try:
        response = requests.get(url, timeout=10)
        print(f"✅ HTTP Connectivity: {url} - Status: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ HTTP Connectivity Failed: {url} - {e}")
        return False

def diagnose_supabase_connection():
    """Comprehensive Supabase connection diagnosis"""
    print("🔍 Diagnosing Supabase Connection Issues")
    print("=" * 50)
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    # Parse the database URL
    parsed = urlparse(database_url)
    hostname = parsed.hostname
    port = parsed.port or 5432
    
    print(f"🎯 Target: {hostname}:{port}")
    print(f"📝 Full URL: {database_url.split('@')[0]}@***")
    
    # Test 1: DNS Resolution
    print("\n1. Testing DNS Resolution...")
    dns_ok = test_dns_resolution(hostname)
    
    # Test 2: Port Connectivity
    print("\n2. Testing Port Connectivity...")
    port_ok = test_port_connectivity(hostname, port) if dns_ok else False
    
    # Test 3: HTTP connectivity to Supabase dashboard
    print("\n3. Testing HTTP Connectivity...")
    project_ref = hostname.split('.')[0] if '.' in hostname else None
    if project_ref:
        dashboard_url = f"https://{project_ref}.supabase.co"
        http_ok = test_http_connectivity(dashboard_url)
    else:
        http_ok = False
        print("❌ Could not determine Supabase project reference")
    
    # Test 4: Alternative DNS servers
    print("\n4. Testing Alternative DNS Servers...")
    try:
        import dns.resolver
        resolver = dns.resolver.Resolver()
        resolver.nameservers = ['8.8.8.8', '1.1.1.1']  # Google and Cloudflare DNS
        answers = resolver.resolve(hostname, 'A')
        for answer in answers:
            print(f"✅ Alternative DNS: {hostname} -> {answer}")
        alt_dns_ok = True
    except ImportError:
        print("⚠️  dnspython not installed, skipping alternative DNS test")
        alt_dns_ok = False
    except Exception as e:
        print(f"❌ Alternative DNS failed: {e}")
        alt_dns_ok = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 DIAGNOSIS SUMMARY")
    print("=" * 50)
    print(f"DNS Resolution: {'✅ OK' if dns_ok else '❌ FAILED'}")
    print(f"Port Connectivity: {'✅ OK' if port_ok else '❌ FAILED'}")
    print(f"HTTP Connectivity: {'✅ OK' if http_ok else '❌ FAILED'}")
    print(f"Alternative DNS: {'✅ OK' if alt_dns_ok else '❌ FAILED'}")
    
    # Recommendations
    print("\n🔧 RECOMMENDATIONS:")
    if not dns_ok:
        print("- Check your internet connection")
        print("- Try using different DNS servers (8.8.8.8, 1.1.1.1)")
        print("- Check if your firewall is blocking DNS requests")
        print("- Try connecting from a different network")
    
    if dns_ok and not port_ok:
        print("- Check if your firewall is blocking port 5432")
        print("- Try connecting from a different network")
        print("- Contact your network administrator")
    
    if not http_ok:
        print("- Check if your Supabase project is active")
        print("- Verify your Supabase project URL")
        print("- Check Supabase status page")
    
    print("\n💡 ALTERNATIVE SOLUTIONS:")
    print("- Use local PostgreSQL database for development")
    print("- Try connecting via VPN")
    print("- Use mobile hotspot to test connectivity")
    
    return dns_ok and port_ok

def suggest_local_setup():
    """Suggest local database setup"""
    print("\n🏠 LOCAL DATABASE SETUP SUGGESTION")
    print("=" * 50)
    print("Since Supabase connection is failing, consider setting up a local PostgreSQL:")
    print()
    print("1. Install PostgreSQL locally")
    print("2. Create database: createdb product_recommender")
    print("3. Create user: createuser -P product_user1")
    print("4. Update .env file:")
    print("   DATABASE_URL=postgresql://product_user1:secure_password@localhost:5432/product_recommender")
    print()
    print("5. Run migrations: alembic upgrade head")
    print("6. Load data: python load_prod.py")

if __name__ == "__main__":
    success = diagnose_supabase_connection()
    
    if not success:
        suggest_local_setup()
    else:
        print("\n🎉 Connection diagnosis completed successfully!")
        print("If you're still experiencing issues, the problem might be intermittent.")