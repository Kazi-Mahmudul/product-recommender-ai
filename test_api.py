import requests
import json
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000/api/v1"

def test_endpoint(endpoint: str, method: str = "GET", params: Dict[str, Any] = None, expected_status: int = 200) -> bool:
    """Test an API endpoint and log the results."""
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.request(method, url, params=params)
        if response.status_code == expected_status:
            logger.info(f"✅ {endpoint} - Status: {response.status_code}")
            if response.content:
                data = response.json()
                logger.info(f"   Response: {json.dumps(data, indent=2)[:200]}...")
            return True
        else:
            logger.error(f"❌ {endpoint} - Status: {response.status_code}")
            logger.error(f"   Error: {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ {endpoint} - Error: {str(e)}")
        return False

def run_all_tests():
    """Run all API endpoint tests."""
    logger.info("Starting API endpoint tests...\n")

    # Test 1: Get all phones (paginated)
    test_endpoint("/phones/", params={"limit": 5})

    # Test 2: Get phones with filters
    test_endpoint("/phones/", params={
        "brand": "Samsung",
        "min_price": 30000,
        "max_price": 100000,
        "limit": 3
    })

    # Test 3: Get all brands
    test_endpoint("/phones/brands")

    # Test 4: Get price range
    test_endpoint("/phones/price-range")

    # Test 5: Get specific phone by ID (using a known ID from your database)
    test_endpoint("/phones/38845")  # Using the Samsung Galaxy XCover7 Pro ID from earlier

    # Test 6: Get phone by name
    test_endpoint("/phones/name/Samsung Galaxy XCover7 Pro")

    # Test 7: Get recommendations
    test_endpoint("/phones/recommendations", params={
        "min_performance_score": 0.7,
        "max_price": 100000
    })

    # Test 8: Test error handling - non-existent phone
    test_endpoint("/phones/999999", expected_status=404)

    # Test 9: Test error handling - invalid price range
    test_endpoint("/phones/", params={
        "min_price": 1000000,
        "max_price": 1000
    })

    logger.info("\nAPI endpoint tests completed!")

if __name__ == "__main__":
    run_all_tests() 