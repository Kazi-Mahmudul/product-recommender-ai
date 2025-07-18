"""
Tests for the AI service
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch
from app.services.ai_service import AIService, AICache
from app.models.phone import Phone

# Mock phone data for testing
@pytest.fixture
def mock_phone():
    phone = MagicMock(spec=Phone)
    phone.id = 1
    phone.name = "Test Phone"
    phone.brand = "Test Brand"
    phone.model = "Test Model"
    phone.price_original = 30000
    phone.overall_device_score = 8.5
    phone.battery_capacity_numeric = 5000
    phone.primary_camera_mp = 64
    phone.selfie_camera_mp = 16
    phone.ram_gb = 8
    phone.storage_gb = 128
    phone.screen_size_numeric = 6.5
    phone.refresh_rate_numeric = 120
    phone.display_score = 8.0
    phone.camera_score = 8.5
    phone.battery_score = 9.0
    phone.performance_score = 8.0
    phone.is_new_release = False
    phone.is_popular_brand = True
    return phone

# Test AICache
class TestAICache:
    def test_cache_get_set(self):
        """Test basic cache get and set operations"""
        cache = AICache(ttl=1)
        
        # Set a value
        cache.set("test_key", "test_value")
        
        # Get the value
        assert cache.get("test_key") == "test_value"
        
        # Get a non-existent key
        assert cache.get("non_existent_key") is None
    
    def test_cache_expiration(self):
        """Test cache entry expiration"""
        cache = AICache(ttl=0.1)  # Very short TTL for testing
        
        # Set a value
        cache.set("test_key", "test_value")
        
        # Get the value before expiration
        assert cache.get("test_key") == "test_value"
        
        # Wait for expiration
        import time
        time.sleep(0.2)
        
        # Get the value after expiration
        assert cache.get("test_key") is None
    
    def test_cache_clear(self):
        """Test cache clear operation"""
        cache = AICache()
        
        # Set some values
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        # Clear the cache
        cache.clear()
        
        # Check that all values are gone
        assert cache.get("key1") is None
        assert cache.get("key2") is None

# Test AIService
class TestAIService:
    @patch("app.services.ai_service.httpx.AsyncClient")
    def test_call_gemini_api_success(self, mock_client):
        """Test successful API call"""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"summary": "test_summary"}
        
        # Set up mock client
        mock_client_instance = MagicMock()
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client_instance.post.return_value = mock_response
        mock_client.return_value = mock_client_instance
        
        # Create AIService instance
        service = AIService(api_url="https://test.com")
        
        # Call the API
        result = asyncio.run(service._call_gemini_api("test_prompt"))
        
        # Check the result
        assert result == "test_summary"
        
        # Check that the client was called correctly
        mock_client_instance.post.assert_called_once_with(
            "https://test.com",
            json={"prompt": "test_prompt"},
            headers={"Content-Type": "application/json"}
        )
    
    @patch("app.services.ai_service.httpx.AsyncClient")
    def test_call_gemini_api_error(self, mock_client):
        """Test API call with error response"""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        
        # Set up mock client
        mock_client_instance = MagicMock()
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client_instance.post.return_value = mock_response
        mock_client.return_value = mock_client_instance
        
        # Create AIService instance
        service = AIService(api_url="https://test.com")
        
        # Call the API
        result = asyncio.run(service._call_gemini_api("test_prompt"))
        
        # Check the result
        assert result is None
    
    def test_process_badge_response(self):
        """Test processing badge responses"""
        service = AIService()
        
        # Test exact match
        assert service._process_badge_response("Popular") == "Popular"
        
        # Test case-insensitive match
        assert service._process_badge_response("popular") == "Popular"
        
        # Test partial match
        assert service._process_badge_response("This phone is Popular because...") == "Popular"
        
        # Test multiple matches (should return the first one)
        assert service._process_badge_response("Popular and Best Value") == "Popular"
        
        # Test no match
        assert service._process_badge_response("This is not a valid badge") is None
        
        # Test empty response
        assert service._process_badge_response("") is None
        assert service._process_badge_response(None) is None
    
    def test_process_highlight_response(self):
        """Test processing highlight responses"""
        service = AIService()
        
        # Test valid highlights
        response = """
        🔥 120Hz refresh rate display
        ⚡ 5000mAh battery with fast charging
        📸 64MP main camera with OIS
        """
        highlights = service._process_highlight_response(response)
        assert len(highlights) == 3
        assert highlights[0].startswith("🔥")
        assert highlights[1].startswith("⚡")
        assert highlights[2].startswith("📸")
        
        # Test invalid highlights (no emoji)
        response = """
        120Hz refresh rate display
        5000mAh battery with fast charging
        64MP main camera with OIS
        """
        highlights = service._process_highlight_response(response)
        assert len(highlights) == 0
        
        # Test mixed valid and invalid highlights
        response = """
        🔥 120Hz refresh rate display
        Invalid highlight
        📸 64MP main camera with OIS
        """
        highlights = service._process_highlight_response(response)
        assert len(highlights) == 2
        assert highlights[0].startswith("🔥")
        assert highlights[1].startswith("📸")
        
        # Test empty response
        assert service._process_highlight_response("") == []
        assert service._process_highlight_response(None) == []
    
    def test_determine_phone_category(self, mock_phone):
        """Test phone category determination"""
        service = AIService()
        
        # Test mid-range category based on price
        assert service._determine_phone_category(mock_phone) == "mid-range"
        
        # Test budget category
        mock_phone.price_original = 20000
        assert service._determine_phone_category(mock_phone) == "budget"
        
        # Test premium category
        mock_phone.price_original = 60000
        assert service._determine_phone_category(mock_phone) == "premium"
        
        # Test flagship category
        mock_phone.price_original = 100000
        assert service._determine_phone_category(mock_phone) == "flagship"
        
        # Test entry-level category
        mock_phone.price_original = 15000
        assert service._determine_phone_category(mock_phone) == "entry-level"
        
        # Test category determination without price
        mock_phone.price_original = None
        mock_phone.chipset = "Snapdragon 8 Gen 2"
        assert service._determine_phone_category(mock_phone) == "flagship"
        
        mock_phone.chipset = "Dimensity 8200"
        mock_phone.ram_gb = 12
        assert service._determine_phone_category(mock_phone) == "premium"
        
        mock_phone.ram_gb = 8
        assert service._determine_phone_category(mock_phone) == "mid-range"
        
        mock_phone.ram_gb = 4
        assert service._determine_phone_category(mock_phone) == "budget"