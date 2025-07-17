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

@pytest.fixture
def mock_phones():
    """Create mock phone objects for testing"""
    phones = []
    
    # Create a base phone (target)
    base_phone = MagicMock(spec=Phone)
    base_phone.id = 1
    base_phone.brand = "Samsung"
    base_phone.name = "Galaxy A52"
    base_phone.price_original = 35000
    base_phone.ram_gb = 6
    base_phone.storage_gb = 128
    base_phone.primary_camera_mp = 64
    base_phone.battery_capacity_numeric = 4500
    base_phone.screen_size_inches = 6.5
    base_phone.screen_refresh_rate = 90
    base_phone.chipset = "Snapdragon 720G"
    base_phone.overall_device_score = 8.0
    base_phone.camera_score = 8.0
    base_phone.battery_score = 8.0
    base_phone.performance_score = 7.5
    base_phone.display_score = 8.2
    phones.append(base_phone)
    
    # Create a phone with better camera
    better_camera = MagicMock(spec=Phone)
    better_camera.id = 2
    better_camera.brand = "Samsung"
    better_camera.name = "Galaxy A72"
    better_camera.price_original = 45000
    better_camera.ram_gb = 8
    better_camera.storage_gb = 128
    better_camera.primary_camera_mp = 108
    better_camera.battery_capacity_numeric = 5000
    better_camera.screen_size_inches = 6.7
    better_camera.screen_refresh_rate = 90
    better_camera.chipset = "Snapdragon 732G"
    better_camera.overall_device_score = 8.5
    better_camera.camera_score = 9.0
    better_camera.battery_score = 8.5
    better_camera.performance_score = 8.0
    better_camera.display_score = 8.5
    phones.append(better_camera)
    
    # Create a phone with better performance
    better_performance = MagicMock(spec=Phone)
    better_performance.id = 3
    better_performance.brand = "OnePlus"
    better_performance.name = "Nord 2"
    better_performance.price_original = 40000
    better_performance.ram_gb = 8
    better_performance.storage_gb = 256
    better_performance.primary_camera_mp = 50
    better_performance.battery_capacity_numeric = 4500
    better_performance.screen_size_inches = 6.43
    better_performance.screen_refresh_rate = 90
    better_performance.chipset = "Dimensity 1200"
    better_performance.overall_device_score = 8.3
    better_performance.camera_score = 8.0
    better_performance.battery_score = 8.0
    better_performance.performance_score = 9.0
    better_performance.display_score = 8.2
    phones.append(better_performance)
    
    # Create a phone with better display
    better_display = MagicMock(spec=Phone)
    better_display.id = 4
    better_display.brand = "Xiaomi"
    better_display.name = "Mi 11 Lite"
    better_display.price_original = 38000
    better_display.ram_gb = 6
    better_display.storage_gb = 128
    better_display.primary_camera_mp = 64
    better_display.battery_capacity_numeric = 4250
    better_display.screen_size_inches = 6.55
    better_display.screen_refresh_rate = 120
    better_display.chipset = "Snapdragon 732G"
    better_display.overall_device_score = 8.2
    better_display.camera_score = 8.0
    better_display.battery_score = 7.8
    better_display.performance_score = 8.0
    better_display.display_score = 9.0
    phones.append(better_display)
    
    # Create a more affordable phone
    more_affordable = MagicMock(spec=Phone)
    more_affordable.id = 5
    more_affordable.brand = "Realme"
    more_affordable.name = "8 Pro"
    more_affordable.price_original = 25000
    more_affordable.ram_gb = 6
    more_affordable.storage_gb = 128
    more_affordable.primary_camera_mp = 108
    more_affordable.battery_capacity_numeric = 4500
    more_affordable.screen_size_inches = 6.4
    more_affordable.screen_refresh_rate = 60
    more_affordable.chipset = "Snapdragon 720G"
    more_affordable.overall_device_score = 7.8
    more_affordable.camera_score = 8.5
    more_affordable.battery_score = 8.0
    more_affordable.performance_score = 7.5
    more_affordable.display_score = 7.8
    phones.append(more_affordable)
    
    return phones

def test_generate_highlights_better_camera(highlight_generator, mock_phones):
    """Test highlight generation for a phone with better camera"""
    # Get the base phone and better camera phone
    base_phone = mock_phones[0]
    better_camera = mock_phones[1]
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(base_phone, better_camera)
    
    # Check that camera highlight is generated
    camera_highlight = next((h for h in highlights if "camera" in h.lower()), None)
    assert camera_highlight is not None
    assert "camera" in camera_highlight.lower()

def test_generate_highlights_better_performance(highlight_generator, mock_phones):
    """Test highlight generation for a phone with better performance"""
    # Get the base phone and better performance phone
    base_phone = mock_phones[0]
    better_performance = mock_phones[2]
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(base_phone, better_performance)
    
    # Check that performance highlight is generated
    performance_highlight = next((h for h in highlights if "performance" in h.lower() or "faster" in h.lower()), None)
    assert performance_highlight is not None

def test_generate_highlights_better_display(highlight_generator, mock_phones):
    """Test highlight generation for a phone with better display"""
    # Get the base phone and better display phone
    base_phone = mock_phones[0]
    better_display = mock_phones[3]
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(base_phone, better_display)
    
    # Check that display highlight is generated
    display_highlight = next((h for h in highlights if "display" in h.lower() or "screen" in h.lower()), None)
    assert display_highlight is not None

def test_generate_highlights_more_affordable(highlight_generator, mock_phones):
    """Test highlight generation for a more affordable phone"""
    # Get the base phone and more affordable phone
    base_phone = mock_phones[0]
    more_affordable = mock_phones[4]
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(base_phone, more_affordable)
    
    # Check that affordability highlight is generated
    affordability_highlight = next((h for h in highlights if "affordable" in h.lower() or "price" in h.lower() or "cheaper" in h.lower()), None)
    assert affordability_highlight is not None

def test_generate_highlights_limit(highlight_generator, mock_phones):
    """Test that highlight generation respects the limit parameter"""
    # Get the base phone and a phone with multiple potential highlights
    base_phone = mock_phones[0]
    better_phone = mock_phones[1]  # Better in multiple aspects
    
    # Generate highlights with limit=1
    highlights = highlight_generator.generate_highlights(base_phone, better_phone, limit=1)
    
    # Check that only one highlight is generated
    assert len(highlights) == 1
    
    # Generate highlights with limit=3
    highlights = highlight_generator.generate_highlights(base_phone, better_phone, limit=3)
    
    # Check that no more than 3 highlights are generated
    assert len(highlights) <= 3

def test_generate_highlights_no_significant_differences(highlight_generator):
    """Test highlight generation when there are no significant differences"""
    # Create two very similar phones
    phone1 = MagicMock(spec=Phone)
    phone1.id = 10
    phone1.brand = "Brand"
    phone1.name = "Model A"
    phone1.price_original = 30000
    phone1.ram_gb = 6
    phone1.storage_gb = 128
    phone1.primary_camera_mp = 64
    phone1.battery_capacity_numeric = 4500
    phone1.screen_size_inches = 6.5
    phone1.screen_refresh_rate = 90
    phone1.chipset = "Snapdragon 720G"
    phone1.overall_device_score = 8.0
    phone1.camera_score = 8.0
    phone1.battery_score = 8.0
    phone1.performance_score = 8.0
    phone1.display_score = 8.0
    
    phone2 = MagicMock(spec=Phone)
    phone2.id = 11
    phone2.brand = "Brand"
    phone2.name = "Model B"
    phone2.price_original = 31000  # Very small difference
    phone2.ram_gb = 6
    phone2.storage_gb = 128
    phone2.primary_camera_mp = 64
    phone2.battery_capacity_numeric = 4600  # Very small difference
    phone2.screen_size_inches = 6.5
    phone2.screen_refresh_rate = 90
    phone2.chipset = "Snapdragon 720G"
    phone2.overall_device_score = 8.1  # Very small difference
    phone2.camera_score = 8.1  # Very small difference
    phone2.battery_score = 8.1  # Very small difference
    phone2.performance_score = 8.1  # Very small difference
    phone2.display_score = 8.1  # Very small difference
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(phone1, phone2)
    
    # Check that no highlights are generated for insignificant differences
    assert len(highlights) == 0 or all("similar" in h.lower() for h in highlights)

def test_generate_highlights_different_brands(highlight_generator, mock_phones):
    """Test highlight generation for phones from different brands"""
    # Get phones from different brands
    samsung_phone = mock_phones[0]  # Samsung
    oneplus_phone = mock_phones[2]  # OnePlus
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(samsung_phone, oneplus_phone)
    
    # Check that at least one highlight is generated
    assert len(highlights) > 0

def test_generate_highlights_emoji_prefixes(highlight_generator, mock_phones):
    """Test that highlights have emoji prefixes"""
    # Get the base phone and better camera phone
    base_phone = mock_phones[0]
    better_camera = mock_phones[1]
    
    # Generate highlights
    highlights = highlight_generator.generate_highlights(base_phone, better_camera)
    
    # Check that highlights have emoji prefixes
    for highlight in highlights:
        # Check if the highlight starts with an emoji (emoji are typically 1-2 characters)
        # This is a simple check that might not catch all emoji variations
        first_char = highlight[0]
        assert ord(first_char) > 127  # Non-ASCII character, likely an emoji