#!/usr/bin/env python3
"""
Check if production API has been updated with the fixes
"""

import requests
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

PRODUCTION_URL = "https://pickbd-ai.onrender.com/api/v1"

def check_production_status():
    logger.info("Checking Production API Status")
    logger.info("=" * 50)
    logger.info(f"Production URL: {PRODUCTION_URL}")
    
    # Test 1: Check if we can add item without session (should work after fix)
    logger.info("1. Testing add item without session cookie...")
    try:
        response = requests.post(
            f"{PRODUCTION_URL}/comparison/items/test-phone-slug",
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            logger.info("SUCCESS: Can add items without session (fix deployed)")
            item_data = response.json()
            logger.info(f"   Created item with ID: {item_data.get('id')}")
            
            # Check if session cookie was set
            if 'comparison_session_id' in response.cookies:
                logger.info(f"Session cookie created: {response.cookies['comparison_session_id']}")
            else:
                logger.warning("No session cookie in response")
                
        elif response.status_code == 422:
            logger.error("NEEDS UPDATE: Still getting 422 error (fix not deployed)")
            error_detail = response.json()
            logger.error(f"   Error: {error_detail}")
            
        else:
            logger.warning(f"Unexpected response: {response.status_code}")
            logger.warning(f"   Response: {response.text}")
            
    except Exception as e:
        logger.error(f"Error testing production: {e}")
    
    # Test 2: Check if we can get items without session (should return empty list)
    logger.info("2. Testing get items without session cookie...")
    try:
        response = requests.get(f"{PRODUCTION_URL}/comparison/items")
        
        if response.status_code == 200:
            items = response.json()
            logger.info(f"SUCCESS: Got {len(items)} items without session (fix deployed)")
            
        elif response.status_code == 422:
            logger.error("NEEDS UPDATE: Still getting 422 error (fix not deployed)")
            
        else:
            logger.warning(f"Unexpected response: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error testing get items: {e}")
    
    # Test 3: Check session creation
    logger.info("3. Testing session creation...")
    try:
        response = requests.get(f"{PRODUCTION_URL}/comparison/session")
        
        if response.status_code == 200:
            session_data = response.json()
            logger.info("Session creation works")
            logger.info(f"   Session ID: {session_data.get('session_id')}")
            
            # Check cookie
            if 'comparison_session_id' in response.cookies:
                logger.info("Session cookie set correctly")
            else:
                logger.warning("No session cookie found")
                
        else:
            logger.error(f"Session creation failed: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error testing session creation: {e}")
    
    logger.info("=" * 50)
    logger.info("PRODUCTION STATUS SUMMARY")
    logger.info("=" * 50)
    
    # Overall assessment
    try:
        # Quick test to determine if fixes are deployed
        test_response = requests.post(f"{PRODUCTION_URL}/comparison/items/test-slug")
        
        if test_response.status_code == 200:
            logger.info("PRODUCTION IS UPDATED!")
            logger.info("Backend fixes have been deployed")
            logger.info("Frontend should now work correctly")
            logger.info("No more 422 errors expected")
            
        elif test_response.status_code == 422:
            logger.warning("PRODUCTION NEEDS UPDATE")
            logger.error("Backend fixes not yet deployed")
            logger.error("Frontend will still get 422 errors")
            logger.info("Deploy the updated backend code to fix this")
            
        else:
            logger.warning("UNCLEAR STATUS")
            logger.warning(f"   Unexpected response: {test_response.status_code}")
            
    except Exception as e:
        logger.error(f"Could not determine status: {e}")

def show_deployment_instructions():
    logger.info("DEPLOYMENT INSTRUCTIONS")
    logger.info("-" * 30)
    logger.info("If production needs update:")
    logger.info("1. Push your code changes to Git repository")
    logger.info("2. Wait for auto-deployment (Render/Vercel)")
    logger.info("3. Or manually deploy to your hosting service")
    logger.info("4. Run this script again to verify")
    logger.info("Files that need to be deployed:")
    logger.info("- app/api/endpoints/comparison.py (backend)")
    logger.info("- frontend/src/api/comparison.ts (frontend)")

if __name__ == "__main__":
    logger.info(f"Checking production status at {datetime.now()}")
    
    check_production_status()
    show_deployment_instructions()
    
    logger.info(f"Check completed at {datetime.now()}")