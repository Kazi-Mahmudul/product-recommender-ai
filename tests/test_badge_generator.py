import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from app.models.phone import Phone
from app.services.badge_generator import BadgeGenerator

@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return MagicMock(spec=Session)

@pytest.fixture
def badge_generator(mock_db):
    """Create a BadgeGenerator instance with a mock database"""
    return BadgeGenerator(mock_db)

@pytest.fixture
def mock_phones():
    """Create mock phone objects for testing"""
    phones = []
    
    # Create a flagship phone
    flagship = MagicMock(spec=Phone)
    flagship.id = 1
    flagship.brand = "Samsung"
    flagship.name = "Galaxy S21 Ultra"
    flagship.price_original = 120000
    flagship.price_category = "flagship"
    flagship.ram_gb = 12
    flagship.storage_gb = 256
    flagship.primary_camera_mp = 108
    flagship.battery_capacity_numeric = 5000
    flagship.screen_size_inches = 6.8
    flagship.overall_device_score = 9.5
    flagship.camera_score = 9.8
    flagship.battery_score = 9.0
    flagship.performance_score = 9.7
    flagship.display_score = 9.6
    flagship.popularity_score = 95
    flagship.value_for_money_score = 8.5
    phones.append(flagship)
    
    # Create a mid-range phone with good value
    midrange = MagicMock(spec=Phone)
    midrange.id = 2
    midrange.brand = "Xiaomi"
    midrange.name = "Redmi Note 10 Pro"
    midrange.price_original = 30000
    midrange.price_category = "mid-range"
    midrange.ram_gb = 6
    midrange.storage_gb = 128
    midrange.primary_camera_mp = 64
    midrange.battery_capacity_numeric = 5020
    midrange.screen_size_inches = 6.67
    midrange.overall_device_score = 8.2
    midrange.camera_score = 8.0
    midrange.battery_score = 9.2
    midrange.performance_score = 7.8
    midrange.display_score = 8.5
    midrange.popularity_score = 90
    midrange.value_for_money_score = 9.5
    phones.append(midrange)
    
    # Create a budget phone
    budget = MagicMock(spec=Phone)
    budget.id = 3
    budget.brand = "Realme"
    budget.name = "C25"
    budget.price_original = 15000
    budget.price_category = "budget"
    budget.ram_gb = 4
    budget.storage_gb = 64
    budget.primary_camera_mp = 48
    budget.battery_capacity_numeric = 6000
    budget.screen_size_inches = 6.5
    budget.overall_device_score = 7.0
    budget.camera_score = 6.5
    budget.battery_score = 9.5
    budget.performance_score = 6.8
    budget.display_score = 7.0
    budget.popularity_score = 85
    budget.value_for_money_score = 8.8
    phones.append(budget)
    
    # Create a phone with exceptional camera
    camera_phone = MagicMock(spec=Phone)
    camera_phone.id = 4
    camera_phone.brand = "Google"
    camera_phone.name = "Pixel 6 Pro"
    camera_phone.price_original = 90000
    camera_phone.price_category = "flagship"
    camera_phone.ram_gb = 12
    camera_phone.storage_gb = 128
    camera_phone.primary_camera_mp = 50
    camera_phone.battery_capacity_numeric = 4500
    camera_phone.screen_size_inches = 6.7
    camera_phone.overall_device_score = 9.0
    camera_phone.camera_score = 9.9
    camera_phone.battery_score = 8.5
    camera_phone.performance_score = 9.0
    camera_phone.display_score = 9.2
    camera_phone.popularity_score = 88
    camera_phone.value_for_money_score = 8.0
    phones.append(camera_phone)
    
    # Create a phone with exceptional battery
    battery_phone = MagicMock(spec=Phone)
    battery_phone.id = 5
    battery_phone.brand = "Motorola"
    battery_phone.name = "Moto G Power"
    battery_phone.price_original = 25000
    battery_phone.price_category = "mid-range"
    battery_phone.ram_gb = 4
    battery_phone.storage_gb = 64
    battery_phone.primary_camera_mp = 48
    battery_phone.battery_capacity_numeric = 6000
    battery_phone.screen_size_inches = 6.6
    battery_phone.overall_device_score = 7.8
    battery_phone.camera_score = 7.5
    battery_phone.battery_score = 9.8
    battery_phone.performance_score = 7.0
    battery_phone.display_score = 7.5
    battery_phone.popularity_score = 82
    battery_phone.value_for_money_score = 8.7
    phones.append(battery_phone)
    
    return phones

def test_generate_badges_flagship(badge_generator, mock_phones):
    """Test badge generation for a flagship phone"""
    # Get the flagship phone
    flagship = mock_phones[0]
    
    # Generate badges
    badges = badge_generator.generate_badges(flagship)
    
    # Check that appropriate badges are generated
    assert "Premium" in badges
    assert "Top Camera" in badges
    
    # Check that inappropriate badges are not generated
    assert "Best Value" not in badges
    assert "Battery King" not in badges

def test_generate_badges_value(badge_generator, mock_phones):
    """Test badge generation for a value-oriented phone"""
    # Get the mid-range phone
    midrange = mock_phones[1]
    
    # Generate badges
    badges = badge_generator.generate_badges(midrange)
    
    # Check that appropriate badges are generated
    assert "Best Value" in badges
    assert "Popular" in badges
    
    # Check that inappropriate badges are not generated
    assert "Premium" not in badges
    assert "Top Camera" not in badges

def test_generate_badges_battery(badge_generator, mock_phones):
    """Test badge generation for a phone with exceptional battery"""
    # Get the battery-focused phone
    battery_phone = mock_phones[4]
    
    # Generate badges
    badges = badge_generator.generate_badges(battery_phone)
    
    # Check that appropriate badges are generated
    assert "Battery King" in badges
    
    # Check that inappropriate badges are not generated
    assert "Premium" not in badges
    assert "Top Camera" not in badges

def test_generate_badges_camera(badge_generator, mock_phones):
    """Test badge generation for a phone with exceptional camera"""
    # Get the camera-focused phone
    camera_phone = mock_phones[3]
    
    # Generate badges
    badges = badge_generator.generate_badges(camera_phone)
    
    # Check that appropriate badges are generated
    assert "Top Camera" in badges
    
    # Check that inappropriate badges are not generated
    assert "Battery King" not in badges
    assert "Best Value" not in badges

def test_generate_badges_budget(badge_generator, mock_phones):
    """Test badge generation for a budget phone"""
    # Get the budget phone
    budget = mock_phones[2]
    
    # Generate badges
    badges = badge_generator.generate_badges(budget)
    
    # Check that appropriate badges are generated
    assert "Battery King" in badges  # Due to 6000mAh battery
    
    # Check that inappropriate badges are not generated
    assert "Premium" not in badges
    assert "Top Camera" not in badges

def test_generate_badges_limit(badge_generator, mock_phones):
    """Test that badge generation respects the limit parameter"""
    # Get the flagship phone which could qualify for multiple badges
    flagship = mock_phones[0]
    
    # Generate badges with limit=1
    badges = badge_generator.generate_badges(flagship, limit=1)
    
    # Check that only one badge is generated
    assert len(badges) == 1

def test_generate_badges_empty(badge_generator):
    """Test badge generation for a phone with no standout features"""
    # Create a phone with average scores
    average_phone = MagicMock(spec=Phone)
    average_phone.id = 6
    average_phone.brand = "Generic"
    average_phone.name = "Average Phone"
    average_phone.price_original = 40000
    average_phone.price_category = "mid-range"
    average_phone.ram_gb = 6
    average_phone.storage_gb = 128
    average_phone.primary_camera_mp = 48
    average_phone.battery_capacity_numeric = 4000
    average_phone.screen_size_inches = 6.5
    average_phone.overall_device_score = 7.5
    average_phone.camera_score = 7.5
    average_phone.battery_score = 7.5
    average_phone.performance_score = 7.5
    average_phone.display_score = 7.5
    average_phone.popularity_score = 50
    average_phone.value_for_money_score = 7.5
    
    # Generate badges
    badges = badge_generator.generate_badges(average_phone)
    
    # Check that no badges are generated for an average phone
    assert len(badges) == 0

def test_generate_badges_with_db_query(badge_generator, mock_db, mock_phones):
    """Test badge generation with database queries for thresholds"""
    # Setup mock database queries for thresholds
    mock_db.query().filter().order_by().limit().all.return_value = [mock_phones[0]]
    mock_db.query().filter().order_by().first.return_value = mock_phones[0]
    
    # Generate badges for a phone
    badges = badge_generator.generate_badges(mock_phones[1])
    
    # Check that the database was queried
    assert mock_db.query.called