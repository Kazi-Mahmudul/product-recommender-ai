import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from app.models.phone import Phone
from app.services.highlight_generator import HighlightGenerator

@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return MagicMock(spec=Session)

@pytest.fixture
def highlight_generator(mock_db):
    """Create a HighlightGenerator instance with a mock database"""
    return HighlightGenerator(mock_db)

def test_is_more_affordable_significant_difference(highlight_generator):
    """Test that a significantly lower price is detected as more affordable"""
    # Create a target phone with higher price
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = 50000
    
    # Create a candidate phone with lower price
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 30000  # 40% cheaper
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's detected as more affordable
    assert is_affordable is True
    assert percentage == 40

def test_is_more_affordable_small_difference(highlight_generator):
    """Test that a small price difference is not detected as more affordable"""
    # Create a target phone
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = 50000
    
    # Create a candidate phone with slightly lower price
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 48000  # Only 4% cheaper
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's not detected as significantly more affordable
    assert is_affordable is False
    assert percentage == 4

def test_is_more_affordable_higher_price(highlight_generator):
    """Test that a higher price is not detected as more affordable"""
    # Create a target phone
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = 50000
    
    # Create a candidate phone with higher price
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 60000  # 20% more expensive
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's not detected as more affordable
    assert is_affordable is False
    assert percentage == -20  # Negative percentage indicates more expensive

def test_is_more_affordable_null_prices(highlight_generator):
    """Test handling of null prices"""
    # Create phones with null prices
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = None
    
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 30000
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's not detected as more affordable due to null target price
    assert is_affordable is False
    assert percentage == 0
    
    # Test with null candidate price
    target_phone.price_original = 50000
    candidate_phone.price_original = None
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's not detected as more affordable due to null candidate price
    assert is_affordable is False
    assert percentage == 0
    
    # Test with both null prices
    target_phone.price_original = None
    candidate_phone.price_original = None
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's not detected as more affordable due to null prices
    assert is_affordable is False
    assert percentage == 0

def test_is_more_affordable_zero_prices(highlight_generator):
    """Test handling of zero prices"""
    # Create target phone with zero price
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = 0
    
    # Create candidate phone with normal price
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 30000
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's not detected as more affordable due to zero target price
    assert is_affordable is False
    assert percentage == 0
    
    # Test with zero candidate price
    target_phone.price_original = 50000
    candidate_phone.price_original = 0
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's detected as more affordable (100% cheaper)
    assert is_affordable is True
    assert percentage == 100

def test_is_more_affordable_threshold(highlight_generator):
    """Test the affordability threshold"""
    # Create a target phone
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = 50000
    
    # Create a candidate phone at exactly the threshold (20% cheaper)
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 40000  # 20% cheaper
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's detected as more affordable at the threshold
    assert is_affordable is True
    assert percentage == 20
    
    # Test just below the threshold (19% cheaper)
    candidate_phone.price_original = 40500  # 19% cheaper
    
    # Check if the candidate is more affordable
    is_affordable, percentage = highlight_generator._is_more_affordable(target_phone, candidate_phone)
    
    # Assert that it's not detected as more affordable below the threshold
    assert is_affordable is False
    assert percentage == 19

def test_generate_affordability_highlight(highlight_generator):
    """Test generation of affordability highlight"""
    # Create a target phone
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = 50000
    
    # Create a candidate phone that's significantly cheaper
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 30000  # 40% cheaper
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(target_phone, candidate_phone)
    
    # Check that an affordability highlight is included
    affordability_highlight = next((h for h in highlights if "affordable" in h.lower() or "cheaper" in h.lower() or "price" in h.lower()), None)
    assert affordability_highlight is not None
    
    # Check that the percentage is included in the highlight
    assert "40%" in affordability_highlight

def test_generate_affordability_highlight_with_other_highlights(highlight_generator):
    """Test that affordability highlight is prioritized among other highlights"""
    # Create a target phone
    target_phone = MagicMock(spec=Phone)
    target_phone.price_original = 50000
    target_phone.ram_gb = 6
    target_phone.battery_capacity_numeric = 4000
    target_phone.camera_score = 8.0
    
    # Create a candidate phone that's cheaper but also has other improvements
    candidate_phone = MagicMock(spec=Phone)
    candidate_phone.price_original = 30000  # 40% cheaper
    candidate_phone.ram_gb = 8  # More RAM
    candidate_phone.battery_capacity_numeric = 5000  # Better battery
    candidate_phone.camera_score = 8.5  # Better camera
    
    # Generate highlights with limit=2
    highlights = highlight_generator.generate_highlights(target_phone, candidate_phone, limit=2)
    
    # Check that an affordability highlight is included
    affordability_highlight = next((h for h in highlights if "affordable" in h.lower() or "cheaper" in h.lower() or "price" in h.lower()), None)
    assert affordability_highlight is not None
    
    # Check that there are other highlights as well
    assert len(highlights) > 1