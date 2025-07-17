import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session

from app.models.phone import Phone
from app.services.matchers.spec_similarity_matcher import SpecSimilarityMatcher

@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return MagicMock(spec=Session)

@pytest.fixture
def spec_matcher(mock_db):
    """Create a SpecSimilarityMatcher instance with a mock database"""
    return SpecSimilarityMatcher(mock_db)

@pytest.fixture
def mock_phones():
    """Create mock phone objects for testing"""
    phones = []
    
    # Create a base phone
    base_phone = MagicMock(spec=Phone)
    base_phone.id = 1
    base_phone.brand = "Samsung"
    base_phone.name = "Galaxy A52"
    base_phone.ram_gb = 6
    base_phone.storage_gb = 128
    base_phone.primary_camera_mp = 64
    base_phone.battery_capacity_numeric = 4500
    base_phone.screen_size_inches = 6.5
    base_phone.screen_refresh_rate = 90
    base_phone.chipset = "Snapdragon 720G"
    base_phone.display_type = "AMOLED"
    base_phone.os = "Android 11"
    phones.append(base_phone)
    
    # Create a very similar phone
    similar_phone = MagicMock(spec=Phone)
    similar_phone.id = 2
    similar_phone.brand = "Samsung"
    similar_phone.name = "Galaxy A72"
    similar_phone.ram_gb = 8
    similar_phone.storage_gb = 128
    similar_phone.primary_camera_mp = 64
    similar_phone.battery_capacity_numeric = 5000
    similar_phone.screen_size_inches = 6.7
    similar_phone.screen_refresh_rate = 90
    similar_phone.chipset = "Snapdragon 720G"
    similar_phone.display_type = "AMOLED"
    similar_phone.os = "Android 11"
    phones.append(similar_phone)
    
    # Create a somewhat similar phone
    somewhat_similar = MagicMock(spec=Phone)
    somewhat_similar.id = 3
    somewhat_similar.brand = "Xiaomi"
    somewhat_similar.name = "Redmi Note 10 Pro"
    somewhat_similar.ram_gb = 6
    somewhat_similar.storage_gb = 128
    somewhat_similar.primary_camera_mp = 108
    somewhat_similar.battery_capacity_numeric = 5020
    somewhat_similar.screen_size_inches = 6.67
    somewhat_similar.screen_refresh_rate = 120
    somewhat_similar.chipset = "Snapdragon 732G"
    somewhat_similar.display_type = "AMOLED"
    somewhat_similar.os = "Android 11"
    phones.append(somewhat_similar)
    
    # Create a different phone
    different_phone = MagicMock(spec=Phone)
    different_phone.id = 4
    different_phone.brand = "Apple"
    different_phone.name = "iPhone 13"
    different_phone.ram_gb = 4
    different_phone.storage_gb = 128
    different_phone.primary_camera_mp = 12
    different_phone.battery_capacity_numeric = 3240
    different_phone.screen_size_inches = 6.1
    different_phone.screen_refresh_rate = 60
    different_phone.chipset = "A15 Bionic"
    different_phone.display_type = "OLED"
    different_phone.os = "iOS 15"
    phones.append(different_phone)
    
    # Create a very different phone
    very_different = MagicMock(spec=Phone)
    very_different.id = 5
    very_different.brand = "Nokia"
    very_different.name = "3310"
    very_different.ram_gb = 0.016
    very_different.storage_gb = 0.016
    very_different.primary_camera_mp = None
    very_different.battery_capacity_numeric = 900
    very_different.screen_size_inches = 2.4
    very_different.screen_refresh_rate = None
    very_different.chipset = "MAD2WD1"
    very_different.display_type = "LCD"
    very_different.os = "Series 30+"
    phones.append(very_different)
    
    return phones

def test_get_matching_score_identical_phones(spec_matcher):
    """Test matching score for identical phones"""
    # Create identical phones
    phone1 = MagicMock(spec=Phone)
    phone1.id = 1
    phone1.ram_gb = 8
    phone1.storage_gb = 128
    phone1.primary_camera_mp = 64
    phone1.battery_capacity_numeric = 5000
    phone1.screen_size_inches = 6.5
    phone1.chipset = "Snapdragon 888"
    phone1.display_type = "AMOLED"
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 2
    phone2.ram_gb = 8
    phone2.storage_gb = 128
    phone2.primary_camera_mp = 64
    phone2.battery_capacity_numeric = 5000
    phone2.screen_size_inches = 6.5
    phone2.chipset = "Snapdragon 888"
    phone2.display_type = "AMOLED"
    
    # Calculate similarity score
    score = spec_matcher.get_matching_score(phone1, phone2)
    
    # Check that identical phones have a perfect score
    assert score == 1.0

def test_get_matching_score_very_similar_phones(spec_matcher, mock_phones):
    """Test matching score for very similar phones"""
    base_phone = mock_phones[0]
    similar_phone = mock_phones[1]
    
    # Calculate similarity score
    score = spec_matcher.get_matching_score(base_phone, similar_phone)
    
    # Check that very similar phones have a high score
    assert score > 0.9

def test_get_matching_score_somewhat_similar_phones(spec_matcher, mock_phones):
    """Test matching score for somewhat similar phones"""
    base_phone = mock_phones[0]
    somewhat_similar = mock_phones[2]
    
    # Calculate similarity score
    score = spec_matcher.get_matching_score(base_phone, somewhat_similar)
    
    # Check that somewhat similar phones have a moderate score
    assert 0.7 < score < 0.9

def test_get_matching_score_different_phones(spec_matcher, mock_phones):
    """Test matching score for different phones"""
    base_phone = mock_phones[0]
    different_phone = mock_phones[3]
    
    # Calculate similarity score
    score = spec_matcher.get_matching_score(base_phone, different_phone)
    
    # Check that different phones have a lower score
    assert 0.4 < score < 0.7

def test_get_matching_score_very_different_phones(spec_matcher, mock_phones):
    """Test matching score for very different phones"""
    base_phone = mock_phones[0]
    very_different = mock_phones[4]
    
    # Calculate similarity score
    score = spec_matcher.get_matching_score(base_phone, very_different)
    
    # Check that very different phones have a very low score
    assert score < 0.4

def test_get_matching_score_with_missing_values(spec_matcher):
    """Test matching score calculation with missing values"""
    # Create phones with some missing values
    phone1 = MagicMock(spec=Phone)
    phone1.id = 1
    phone1.ram_gb = 8
    phone1.storage_gb = 128
    phone1.primary_camera_mp = None
    phone1.battery_capacity_numeric = 5000
    phone1.screen_size_inches = None
    phone1.chipset = "Snapdragon 888"
    phone1.display_type = "AMOLED"
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 2
    phone2.ram_gb = 8
    phone2.storage_gb = 128
    phone2.primary_camera_mp = 64
    phone2.battery_capacity_numeric = None
    phone2.screen_size_inches = 6.5
    phone2.chipset = None
    phone2.display_type = "AMOLED"
    
    # Calculate similarity score
    score = spec_matcher.get_matching_score(phone1, phone2)
    
    # Check that a reasonable score is calculated despite missing values
    assert 0 <= score <= 1

def test_get_matching_score_ram_similarity(spec_matcher):
    """Test matching score based on RAM similarity"""
    # Create phones with different RAM
    phone1 = MagicMock(spec=Phone)
    phone1.id = 1
    phone1.ram_gb = 8
    phone1.storage_gb = 128
    phone1.primary_camera_mp = 64
    phone1.battery_capacity_numeric = 5000
    phone1.screen_size_inches = 6.5
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 2
    phone2.ram_gb = 12
    phone2.storage_gb = 128
    phone2.primary_camera_mp = 64
    phone2.battery_capacity_numeric = 5000
    phone2.screen_size_inches = 6.5
    
    # Calculate similarity score
    score1 = spec_matcher.get_matching_score(phone1, phone2)
    
    # Create a phone with very different RAM
    phone3 = MagicMock(spec=Phone)
    phone3.id = 3
    phone3.ram_gb = 2
    phone3.storage_gb = 128
    phone3.primary_camera_mp = 64
    phone3.battery_capacity_numeric = 5000
    phone3.screen_size_inches = 6.5
    
    # Calculate similarity score
    score2 = spec_matcher.get_matching_score(phone1, phone3)
    
    # Check that RAM difference affects the score
    assert score1 > score2

def test_get_matching_score_storage_similarity(spec_matcher):
    """Test matching score based on storage similarity"""
    # Create phones with different storage
    phone1 = MagicMock(spec=Phone)
    phone1.id = 1
    phone1.ram_gb = 8
    phone1.storage_gb = 128
    phone1.primary_camera_mp = 64
    phone1.battery_capacity_numeric = 5000
    phone1.screen_size_inches = 6.5
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 2
    phone2.ram_gb = 8
    phone2.storage_gb = 256
    phone2.primary_camera_mp = 64
    phone2.battery_capacity_numeric = 5000
    phone2.screen_size_inches = 6.5
    
    # Calculate similarity score
    score1 = spec_matcher.get_matching_score(phone1, phone2)
    
    # Create a phone with very different storage
    phone3 = MagicMock(spec=Phone)
    phone3.id = 3
    phone3.ram_gb = 8
    phone3.storage_gb = 32
    phone3.primary_camera_mp = 64
    phone3.battery_capacity_numeric = 5000
    phone3.screen_size_inches = 6.5
    
    # Calculate similarity score
    score2 = spec_matcher.get_matching_score(phone1, phone3)
    
    # Check that storage difference affects the score
    assert score1 > score2

def test_get_matching_score_camera_similarity(spec_matcher):
    """Test matching score based on camera similarity"""
    # Create phones with different cameras
    phone1 = MagicMock(spec=Phone)
    phone1.id = 1
    phone1.ram_gb = 8
    phone1.storage_gb = 128
    phone1.primary_camera_mp = 64
    phone1.battery_capacity_numeric = 5000
    phone1.screen_size_inches = 6.5
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 2
    phone2.ram_gb = 8
    phone2.storage_gb = 128
    phone2.primary_camera_mp = 108
    phone2.battery_capacity_numeric = 5000
    phone2.screen_size_inches = 6.5
    
    # Calculate similarity score
    score1 = spec_matcher.get_matching_score(phone1, phone2)
    
    # Create a phone with very different camera
    phone3 = MagicMock(spec=Phone)
    phone3.id = 3
    phone3.ram_gb = 8
    phone3.storage_gb = 128
    phone3.primary_camera_mp = 12
    phone3.battery_capacity_numeric = 5000
    phone3.screen_size_inches = 6.5
    
    # Calculate similarity score
    score2 = spec_matcher.get_matching_score(phone1, phone3)
    
    # Check that camera difference affects the score
    assert score1 > score2

def test_get_matching_score_battery_similarity(spec_matcher):
    """Test matching score based on battery similarity"""
    # Create phones with different batteries
    phone1 = MagicMock(spec=Phone)
    phone1.id = 1
    phone1.ram_gb = 8
    phone1.storage_gb = 128
    phone1.primary_camera_mp = 64
    phone1.battery_capacity_numeric = 5000
    phone1.screen_size_inches = 6.5
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 2
    phone2.ram_gb = 8
    phone2.storage_gb = 128
    phone2.primary_camera_mp = 64
    phone2.battery_capacity_numeric = 5500
    phone2.screen_size_inches = 6.5
    
    # Calculate similarity score
    score1 = spec_matcher.get_matching_score(phone1, phone2)
    
    # Create a phone with very different battery
    phone3 = MagicMock(spec=Phone)
    phone3.id = 3
    phone3.ram_gb = 8
    phone3.storage_gb = 128
    phone3.primary_camera_mp = 64
    phone3.battery_capacity_numeric = 3000
    phone3.screen_size_inches = 6.5
    
    # Calculate similarity score
    score2 = spec_matcher.get_matching_score(phone1, phone3)
    
    # Check that battery difference affects the score
    assert score1 > score2

def test_get_matching_score_screen_size_similarity(spec_matcher):
    """Test matching score based on screen size similarity"""
    # Create phones with different screen sizes
    phone1 = MagicMock(spec=Phone)
    phone1.id = 1
    phone1.ram_gb = 8
    phone1.storage_gb = 128
    phone1.primary_camera_mp = 64
    phone1.battery_capacity_numeric = 5000
    phone1.screen_size_inches = 6.5
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 2
    phone2.ram_gb = 8
    phone2.storage_gb = 128
    phone2.primary_camera_mp = 64
    phone2.battery_capacity_numeric = 5000
    phone2.screen_size_inches = 6.7
    
    # Calculate similarity score
    score1 = spec_matcher.get_matching_score(phone1, phone2)
    
    # Create a phone with very different screen size
    phone3 = MagicMock(spec=Phone)
    phone3.id = 3
    phone3.ram_gb = 8
    phone3.storage_gb = 128
    phone3.primary_camera_mp = 64
    phone3.battery_capacity_numeric = 5000
    phone3.screen_size_inches = 5.5
    
    # Calculate similarity score
    score2 = spec_matcher.get_matching_score(phone1, phone3)
    
    # Check that screen size difference affects the score
    assert score1 > score2