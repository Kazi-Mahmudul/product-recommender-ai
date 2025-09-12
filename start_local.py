#!/usr/bin/env python3
"""
Local development startup script for the Product Recommender API.

This script helps set up and start the application for local development,
including health checks and service validation.
"""

import os
import sys
import asyncio
import subprocess
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

async def check_services():
    """Check if all required services are available for local development."""
    print("🔍 Checking local development environment...")
    
    # Check if .env.local exists
    if os.path.exists('.env.local'):
        print("✅ Found .env.local file")
        # Load local environment
        from dotenv import load_dotenv
        load_dotenv('.env.local')
    else:
        print("⚠️ No .env.local file found, using .env")
        from dotenv import load_dotenv
        load_dotenv('.env')
    
    # Import after loading environment
    from app.services.health_check_service import HealthCheckService
    
    health_service = HealthCheckService()
    results = await health_service.check_all_services()
    
    print(f"\n📊 Health Check Results:")
    print(f"Overall Status: {results['status'].upper()}")
    
    for service_name, service_status in results['services'].items():
        status_icon = "✅" if service_status.get('healthy', False) else "❌"
        print(f"{status_icon} {service_name}: {service_status.get('status', 'unknown')}")
        
        if not service_status.get('healthy', False) and service_status.get('error'):
            print(f"   Error: {service_status['error']}")
    
    return results['overall_health']

def start_gemini_service():
    """Start the local Gemini service if it's not running."""
    print("\n🚀 Starting local Gemini AI service...")
    
    gemini_service_path = Path("backend/gemini_service")
    if not gemini_service_path.exists():
        print("❌ Gemini service directory not found at backend/gemini_service")
        return False
    
    try:
        # Check if Node.js is available
        subprocess.run(["node", "--version"], check=True, capture_output=True)
        
        # Check if dependencies are installed
        if not (gemini_service_path / "node_modules").exists():
            print("📦 Installing Gemini service dependencies...")
            subprocess.run(["npm", "install"], cwd=gemini_service_path, check=True)
        
        # Start the service in background
        print("🎯 Starting Gemini service on port 3001...")
        process = subprocess.Popen(
            ["node", "index.js"],
            cwd=gemini_service_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Give it a moment to start
        import time
        time.sleep(3)
        
        # Check if it's still running
        if process.poll() is None:
            print("✅ Gemini service started successfully")
            return True
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Gemini service failed to start:")
            print(f"   stdout: {stdout.decode()}")
            print(f"   stderr: {stderr.decode()}")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start Gemini service: {e}")
        return False
    except FileNotFoundError:
        print("❌ Node.js not found. Please install Node.js to run the Gemini service locally.")
        return False

def main():
    """Main function to start local development environment."""
    print("🏠 Product Recommender API - Local Development Setup")
    print("=" * 60)
    
    # Check if we should start Gemini service locally
    gemini_url = os.getenv('GEMINI_SERVICE_URL', 'http://localhost:3001')
    if 'localhost:3001' in gemini_url:
        print("🤖 Local Gemini service required...")
        if not start_gemini_service():
            print("\n⚠️ Gemini service failed to start. You can:")
            print("   1. Fix the Gemini service setup")
            print("   2. Use production Gemini service by setting:")
            print("      GEMINI_SERVICE_URL=https://ai-service-188950165425.asia-southeast1.run.app")
            print("   3. Continue anyway (some features may not work)")
            
            response = input("\nContinue anyway? (y/N): ")
            if response.lower() != 'y':
                sys.exit(1)
    
    # Run health checks
    print("\n🔍 Running health checks...")
    try:
        healthy = asyncio.run(check_services())
        
        if healthy:
            print("\n🎉 All services are healthy! Ready to start the API server.")
        else:
            print("\n⚠️ Some services have issues, but the API can still start.")
            print("   Check the health check results above for details.")
        
    except Exception as e:
        print(f"\n❌ Health check failed: {e}")
        print("   The API may still work, but some features might be limited.")
    
    # Start the FastAPI server
    print("\n🚀 Starting FastAPI server...")
    print("   API will be available at: http://localhost:8000")
    print("   API docs will be available at: http://localhost:8000/api/v1/docs")
    print("   Health check: http://localhost:8000/health")
    print("\n   Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        # Import and run the FastAPI app
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="debug"
        )
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
    except Exception as e:
        print(f"\n❌ Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()