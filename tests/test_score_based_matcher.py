import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session

from app.models.phone import Phone
from app.services.matchers.score_based_matcher import ScoreBasedMatcher

@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return MagicMock(spec=Session)

@pytest.fixture
def score_matcher(mock_db):
    """Create a ScoreBasedMatcher instance with a mock database"""
    return ScoreBasedMatcher(mock_db)

@pytest.fixture
def mock_phones():
    """Create mock phone objects for testing"""
    phones = []
    
    # Create a balanced high-end phone
    balanced_phone = MagicMock(spec=Phone)
    balanced_phone.id = 1
    balanced_phone.brand = "Samsung"
    balanced_phone.name = "Galaxy S21"
    balanced_phone.camera_score = 9.0
    balanced_phone.battery_score = 8.5
    balanced_phone.performance_score = 9.2
    balanced_phone.display_score = 9.0
    balanced_phone.overall_device_score = 9.0
    phones.append(balanced_phone)
    
    # Create another balanced high-end phone
    similar_balanced = MagicMock(spec=Phone)
    similar_balanced.id = 2
    similar_balanced.brand = "Apple"
    similar_balanced.name = "iPhone 13"
    similar_balanced.camera_score = 9.2
    similar_balanced.battery_score = 8.3
    similar_balanced.performance_score = 9.5
    similar_balanced.display_score = 9.1
    similar_balanced.overall_device_score = 9.1
    phones.append(similar_balanced)
    
    # Create a camera-focused phone
    camera_phone = MagicMock(spec=Phone)
    camera_phone.id = 3
    camera_phone.brand = "Google"
    camera_phone.name = "Pixel 6 Pro"
    camera_phone.camera_score = 9.8
    camera_phone.battery_score = 8.0
    camera_phone.performance_score = 8.5
    camera_phone.display_score = 8.8
    camera_phone.overall_device_score = 8.8
    phones.append(camera_phone)
    
    # Create a battery-focused phone
    battery_phone = MagicMock(spec=Phone)
    battery_phone.id = 4
    battery_phone.brand = "Motorola"
    battery_phone.name = "Moto G Power"
    battery_phone.camera_score = 7.0
    battery_phone.battery_score = 9.8
    battery_phone.performance_score = 7.5
    battery_phone.display_score = 7.5
    battery_phone.overall_device_score = 7.8
    phones.append(battery_phone)
    
    # Create a mid-range phone
    midrange_phone = MagicMock(spec=Phone)
    midrange_phone.id = 5
    midrange_phone.brand = "Xiaomi"
    midrange_phone.name = "Redmi Note 10 Pro"
    midrange_phone.camera_score = 8.0
    midrange_phone.battery_score = 8.5
    midrange_phone.performance_score = 7.8
    midrange_phone.display_score = 8.2
    midrange_phone.overall_device_score = 8.0
    phones.append(midrange_phone)
    
    return phones

def test_get_matching_score_similar_balanced_phones(score_matcher, mock_phones):
    """Test matching score for similar balanced phones"""
    # Get two balanced high-end phones
    balanced_phone = mock_phones[0]
    similar_balanced = mock_phones[1]
    
    # Calculate similarity score
    score = score_matcher.get_matching_score(balanced_phone, similar_balanced)
    
    # Check that similar balanced phones have a high score
    assert score > 0.9

def test_get_matching_score_different_focus_phones(score_matcher, mock_phones):
    """Test matching score for phones with different focus areas"""
    # Get a balanced phone and a camera-focused phone
    balanced_phone = mock_phones[0]
    camera_phone = mock_phones[2]
    
    # Calculate similarity score
    score = score_matcher.get_matching_score(balanced_phone, camera_phone)
    
    # Check that the score is moderate due to different focus areas
    assert 0.7 < score < 0.9
    
    # Get a balanced phone and a battery-focused phone
    battery_phone = mock_phones[3]
    
    # Calculate similarity score
    score2 = score_matcher.get_matching_score(balanced_phone, battery_phone)
    
    # Check that the score is lower due to more different focus areas
    assert score2 < score

def test_get_matching_score_different_tiers(score_matcher, mock_phones):
    """Test matching score for phones from different tiers"""
    # Get a high-end phone and a mid-range phone
    balanced_phone = mock_phones[0]
    midrange_phone = mock_phones[4]
    
    # Calculate similarity score
    score = score_matcher.get_matching_score(balanced_phone, midrange_phone)
    
    # Check that the score is lower due to different tiers
    assert score < 0.8

def test_get_matching_score_with_missing_scores(score_matcher):
    """Test matching score calculation with missing scores"""
    # Create phones with some missing scores
    phone1 = MagicMock(spec=Phone)
    phone1.id = 10
    phone1.camera_score = 9.0
    phone1.battery_score = None
    phone1.performance_score = 9.2
    phone1.display_score = 9.0
    phone1.overall_device_score = 9.0
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 11
    phone2.camera_score = 9.2
    phone2.battery_score = 8.3
    phone2.performance_score = None
    phone2.display_score = 9.1
    phone2.overall_device_score = 9.1
    
    # Calculate similarity score
    score = score_matcher.get_matching_score(phone1, phone2)
    
    # Check that a reasonable score is calculated despite missing values
    assert 0 <= score <= 1

def test_get_matching_score_camera_similarity(score_matcher, mock_phones):
    """Test matching score based on camera score similarity"""
    # Get a balanced phone and a camera-focused phone
    balanced_phone = mock_phones[0]  # Camera score: 9.0
    camera_phone = mock_phones[2]    # Camera score: 9.8
    
    # Calculate similarity score
    score1 = score_matcher.get_matching_score(balanced_phone, camera_phone)
    
    # Create a phone with very different camera score
    different_camera = MagicMock(spec=Phone)
    different_camera.id = 10
    different_camera.camera_score = 6.0
    different_camera.battery_score = 8.5
    different_camera.performance_score = 9.2
    different_camera.display_score = 9.0
    different_camera.overall_device_score = 8.0
    
    # Calculate similarity score
    score2 = score_matcher.get_matching_score(balanced_phone, different_camera)
    
    # Check that camera score difference affects the overall score
    assert score1 > score2

def test_get_matching_score_battery_similarity(score_matcher, mock_phones):
    """Test matching score based on battery score similarity"""
    # Get a balanced phone and a battery-focused phone
    balanced_phone = mock_phones[0]  # Battery score: 8.5
    battery_phone = mock_phones[3]   # Battery score: 9.8
    
    # Calculate similarity score
    score1 = score_matcher.get_matching_score(balanced_phone, battery_phone)
    
    # Create a phone with very different battery score
    different_battery = MagicMock(spec=Phone)
    different_battery.id = 10
    different_battery.camera_score = 9.0
    different_battery.battery_score = 6.0
    different_battery.performance_score = 9.2
    different_battery.display_score = 9.0
    different_battery.overall_device_score = 8.0
    
    # Calculate similarity score
    score2 = score_matcher.get_matching_score(balanced_phone, different_battery)
    
    # Check that battery score difference affects the overall score
    assert score1 > score2

def test_get_matching_score_performance_similarity(score_matcher, mock_phones):
    """Test matching score based on performance score similarity"""
    # Get a balanced phone and create a performance-focused phone
    balanced_phone = mock_phones[0]  # Performance score: 9.2
    
    performance_phone = MagicMock(spec=Phone)
    performance_phone.id = 10
    performance_phone.camera_score = 8.0
    performance_phone.battery_score = 8.0
    performance_phone.performance_score = 9.8
    performance_phone.display_score = 8.5
    performance_phone.overall_device_score = 8.5
    
    # Calculate similarity score
    score1 = score_matcher.get_matching_score(balanced_phone, performance_phone)
    
    # Create a phone with very different performance score
    different_performance = MagicMock(spec=Phone)
    different_performance.id = 11
    different_performance.camera_score = 9.0
    different_performance.battery_score = 8.5
    different_performance.performance_score = 7.0
    different_performance.display_score = 9.0
    different_performance.overall_device_score = 8.0
    
    # Calculate similarity score
    score2 = score_matcher.get_matching_score(balanced_phone, different_performance)
    
    # Check that performance score difference affects the overall score
    assert score1 > score2

def test_get_matching_score_display_similarity(score_matcher, mock_phones):
    """Test matching score based on display score similarity"""
    # Get a balanced phone and create a display-focused phone
    balanced_phone = mock_phones[0]  # Display score: 9.0
    
    display_phone = MagicMock(spec=Phone)
    display_phone.id = 10
    display_phone.camera_score = 8.0
    display_phone.battery_score = 8.0
    display_phone.performance_score = 8.5
    display_phone.display_score = 9.8
    display_phone.overall_device_score = 8.5
    
    # Calculate similarity score
    score1 = score_matcher.get_matching_score(balanced_phone, display_phone)
    
    # Create a phone with very different display score
    different_display = MagicMock(spec=Phone)
    different_display.id = 11
    different_display.camera_score = 9.0
    different_display.battery_score = 8.5
    different_display.performance_score = 9.2
    different_display.display_score = 7.0
    different_display.overall_device_score = 8.0
    
    # Calculate similarity score
    score2 = score_matcher.get_matching_score(balanced_phone, different_display)
    
    # Check that display score difference affects the overall score
    assert score1 > score2

def test_get_matching_score_overall_similarity(score_matcher, mock_phones):
    """Test matching score based on overall device score similarity"""
    # Get two phones with similar overall scores but different component scores
    balanced_phone = mock_phones[0]  # Overall score: 9.0
    similar_balanced = mock_phones[1]  # Overall score: 9.1
    
    # Calculate similarity score
    score1 = score_matcher.get_matching_score(balanced_phone, similar_balanced)
    
    # Create a phone with very different overall score
    different_overall = MagicMock(spec=Phone)
    different_overall.id = 10
    different_overall.camera_score = 7.0
    different_overall.battery_score = 7.0
    different_overall.performance_score = 7.0
    different_overall.display_score = 7.0
    different_overall.overall_device_score = 7.0
    
    # Calculate similarity score
    score2 = score_matcher.get_matching_score(balanced_phone, different_overall)
    
    # Check that overall score difference affects the similarity score
    assert score1 > score2