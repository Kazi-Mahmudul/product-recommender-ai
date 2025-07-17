import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session

from app.services.matchers.price_proximity_matcher import PriceProximityMatcher

@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return MagicMock(spec=Session)

@pytest.fixture
def price_matcher(mock_db):
    """Create a PriceProximityMatcher instance with a mock database"""
    return PriceProximityMatcher(mock_db)

def test_get_price_range_bounds(price_matcher):
    """Test that price range bounds are calculated correctly"""
    # Test with a mid-range price
    price = 50000
    lower_bound, upper_bound = price_matcher.get_price_range_bounds(price)
    
    # Check that bounds are within expected range (±15%)
    assert lower_bound == 42500  # 50000 * 0.85
    assert upper_bound == 57500  # 50000 * 1.15
    
    # Test with a high price
    price = 100000
    lower_bound, upper_bound = price_matcher.get_price_range_bounds(price)
    
    # Check that bounds are within expected range (±15%)
    assert lower_bound == 85000  # 100000 * 0.85
    assert upper_bound == 115000  # 100000 * 1.15
    
    # Test with a low price
    price = 10000
    lower_bound, upper_bound = price_matcher.get_price_range_bounds(price)
    
    # Check that bounds are within expected range (±15%)
    assert lower_bound == 8500  # 10000 * 0.85
    assert upper_bound == 11500  # 10000 * 1.15

def test_calculate_price_similarity_exact_match(price_matcher):
    """Test price similarity calculation with exact price match"""
    price1 = 50000
    price2 = 50000
    
    similarity = price_matcher.calculate_price_similarity(price1, price2)
    
    # Exact match should have similarity of 1.0
    assert similarity == 1.0

def test_calculate_price_similarity_within_range(price_matcher):
    """Test price similarity calculation with prices within range"""
    price1 = 50000
    
    # Test with price at lower bound (85% of price1)
    price2 = 42500
    similarity = price_matcher.calculate_price_similarity(price1, price2)
    
    # Should have high similarity but less than 1.0
    assert 0.8 <= similarity < 1.0
    
    # Test with price at upper bound (115% of price1)
    price2 = 57500
    similarity = price_matcher.calculate_price_similarity(price1, price2)
    
    # Should have high similarity but less than 1.0
    assert 0.8 <= similarity < 1.0
    
    # Test with price in middle of range
    price2 = 53000  # 6% higher
    similarity = price_matcher.calculate_price_similarity(price1, price2)
    
    # Should have very high similarity
    assert 0.9 <= similarity < 1.0

def test_calculate_price_similarity_outside_range(price_matcher):
    """Test price similarity calculation with prices outside range"""
    price1 = 50000
    
    # Test with price below lower bound
    price2 = 30000  # 40% lower
    similarity = price_matcher.calculate_price_similarity(price1, price2)
    
    # Should have lower similarity
    assert similarity < 0.8
    
    # Test with price above upper bound
    price2 = 80000  # 60% higher
    similarity = price_matcher.calculate_price_similarity(price1, price2)
    
    # Should have lower similarity
    assert similarity < 0.8
    
    # Test with very different price
    price2 = 200000  # 300% higher
    similarity = price_matcher.calculate_price_similarity(price1, price2)
    
    # Should have very low similarity
    assert similarity < 0.5

def test_calculate_price_similarity_with_null_prices(price_matcher):
    """Test price similarity calculation with null prices"""
    # Test with first price null
    similarity = price_matcher.calculate_price_similarity(None, 50000)
    
    # Should return default similarity
    assert similarity == 0.5
    
    # Test with second price null
    similarity = price_matcher.calculate_price_similarity(50000, None)
    
    # Should return default similarity
    assert similarity == 0.5
    
    # Test with both prices null
    similarity = price_matcher.calculate_price_similarity(None, None)
    
    # Should return default similarity
    assert similarity == 0.5

def test_calculate_price_similarity_with_zero_prices(price_matcher):
    """Test price similarity calculation with zero prices"""
    # Test with first price zero
    similarity = price_matcher.calculate_price_similarity(0, 50000)
    
    # Should return default similarity
    assert similarity == 0.5
    
    # Test with second price zero
    similarity = price_matcher.calculate_price_similarity(50000, 0)
    
    # Should return default similarity
    assert similarity == 0.5
    
    # Test with both prices zero
    similarity = price_matcher.calculate_price_similarity(0, 0)
    
    # Should return exact match similarity
    assert similarity == 1.0

def test_calculate_price_similarity_negative_prices(price_matcher):
    """Test price similarity calculation with negative prices"""
    # Negative prices should be handled gracefully
    similarity = price_matcher.calculate_price_similarity(-10000, 50000)
    
    # Should return default similarity
    assert similarity == 0.5

def test_calculate_price_similarity_different_price_categories(price_matcher):
    """Test price similarity across different price categories"""
    # Budget vs. Flagship
    budget_price = 15000
    flagship_price = 100000
    
    similarity = price_matcher.calculate_price_similarity(budget_price, flagship_price)
    
    # Should have very low similarity
    assert similarity < 0.3
    
    # Mid-range vs. High-end
    midrange_price = 40000
    highend_price = 70000
    
    similarity = price_matcher.calculate_price_similarity(midrange_price, highend_price)
    
    # Should have moderate similarity
    assert 0.3 <= similarity < 0.7