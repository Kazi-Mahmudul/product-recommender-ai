"""
Tests for the AI-enhanced badge generator
"""

import pytest
from unittest.mock import MagicMock, patch
import asyncio
from app.services.badge_generator import BadgeGenerator
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

# Mock database session
@pytest.fixture
def mock_db():
    return MagicMock()

class TestBadgeGenerator:
    @patch("app.services.badge_generator.asyncio.run")
    def test_generate_badges_ai_success(self, mock_run, mock_db, mock_phone):
        """Test badge generation with successful AI response"""
        # Set up mock AI response
        mock_run.return_value = ["Best Value"]
        
        # Create BadgeGenerator instance
        generator = BadgeGenerator(mock_db)
        
        # Generate badges
        badges = generator.generate_badges(mock_phone)
        
        # Check the result
        assert badges == ["Best Value"]
        
        # Check that asyncio.run was called with the correct method
        mock_run.assert_called_once()
    
    @patch("app.services.badge_generator.asyncio.run")
    def test_generate_badges_ai_failure(self, mock_run, mock_db, mock_phone):
        """Test badge generation with AI failure"""
        # Set up mock AI response to fail
        mock_run.return_value = []
        
        # Create BadgeGenerator instance
        generator = BadgeGenerator(mock_db)
        
        # Generate badges
        badges = generator.generate_badges(mock_phone)
        
        # Check that we got rule-based badges
        assert "Battery King" in badges  # Based on battery_score = 9.0
        
        # Check that asyncio.run was called
        mock_run.assert_called_once()
    
    @patch("app.services.badge_generator.asyncio.run")
    def test_generate_badges_ai_exception(self, mock_run, mock_db, mock_phone):
        """Test badge generation with AI exception"""
        # Set up mock AI response to raise exception
        mock_run.side_effect = Exception("Test exception")
        
        # Create BadgeGenerator instance
        generator = BadgeGenerator(mock_db)
        
        # Generate badges
        badges = generator.generate_badges(mock_phone)
        
        # Check that we got rule-based badges
        assert "Battery King" in badges  # Based on battery_score = 9.0
        
        # Check that asyncio.run was called
        mock_run.assert_called_once()
    
    def test_generate_badges_for_mock(self, mock_db):
        """Test badge generation for mock objects"""
        # Create a mock phone for testing
        mock_phone = MagicMock()
        mock_phone._mock_name = "Mock"
        mock_phone._mock_methods = []
        mock_phone.price_original = 70000
        mock_phone.battery_score = 9.5
        mock_phone.camera_score = 9.5
        mock_phone.value_for_money_score = 9.5
        mock_phone.battery_capacity_numeric = 6500
        mock_phone.popularity_score = 90
        
        # Create BadgeGenerator instance
        generator = BadgeGenerator(mock_db)
        
        # Generate badges
        badges = generator.generate_badges(mock_phone)
        
        # Check that we got the expected badges
        assert "Premium" in badges
        assert "Popular" in badges
        assert "Best Value" in badges
        assert "Battery King" in badges
        assert "Top Camera" in badges
    
    def test_generate_badges_with_rules(self, mock_db, mock_phone):
        """Test rule-based badge generation"""
        # Create BadgeGenerator instance
        generator = BadgeGenerator(mock_db)
        
        # Generate badges using rule-based approach
        badges = generator._generate_badges_with_rules(mock_phone)
        
        # Check that we got the expected badges
        assert "Battery King" in badges  # Based on battery_score = 9.0
        
        # Modify phone to trigger more badges
        mock_phone.is_new_release = True
        mock_phone.camera_score = 9.5
        mock_phone.price_original = 70000
        
        # Generate badges again
        badges = generator._generate_badges_with_rules(mock_phone)
        
        # Check that we got the expected badges
        assert "Battery King" in badges
        assert "New Launch" in badges
        assert "Top Camera" in badges
        assert "Premium" in badges
    
    @patch("app.services.ai_service.AIService.generate_badge")
    async def test_generate_badges_with_ai(self, mock_generate_badge, mock_db, mock_phone):
        """Test AI-based badge generation"""
        # Set up mock AI response
        mock_generate_badge.return_value = "Best Value"
        
        # Create BadgeGenerator instance
        generator = BadgeGenerator(mock_db)
        
        # Generate badges using AI-based approach
        badges = await generator._generate_badges_with_ai(mock_phone)
        
        # Check that we got the expected badge
        assert badges == ["Best Value"]
        
        # Check that generate_badge was called with the correct phone
        mock_generate_badge.assert_called_once_with(mock_phone)
        
        # Test with AI failure
        mock_generate_badge.return_value = None
        
        # Generate badges again
        badges = await generator._generate_badges_with_ai(mock_phone)
        
        # Check that we got an empty list
        assert badges == []