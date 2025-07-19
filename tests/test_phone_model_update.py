import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.phone import Phone
from app.schemas.phone import PhoneBase, PhoneCreate, Phone as PhoneSchema
from app.core.database import Base

# Create an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    # Create the tables
    Base.metadata.create_all(bind=engine)
    
    # Create a session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop the tables
        Base.metadata.drop_all(bind=engine)

def test_phone_model_new_columns(db_session):
    """Test that the Phone model can handle the new columns."""
    # Create a phone with the new columns
    phone = Phone(
        name="Test Phone",
        brand="Test Brand",
        model="Test Model",
        price="$999",
        url="https://example.com",
        img_url="https://example.com/image.jpg",
        main_camera="48MP + 12MP + 5MP",
        front_camera="32MP"
    )
    
    # Add the phone to the database
    db_session.add(phone)
    db_session.commit()
    
    # Retrieve the phone from the database
    db_phone = db_session.query(Phone).filter(Phone.name == "Test Phone").first()
    
    # Check that the new columns were saved correctly
    assert db_phone.main_camera == "48MP + 12MP + 5MP"
    assert db_phone.front_camera == "32MP"

def test_phone_model_string_columns(db_session):
    """Test that the Phone model can handle string values for the updated columns."""
    # Create a phone with string values for the updated columns
    phone = Phone(
        name="Test Phone 2",
        brand="Test Brand",
        model="Test Model",
        price="$999",
        url="https://example.com",
        img_url="https://example.com/image.jpg",
        screen_size_inches="6.5 inches",
        pixel_density_ppi="402 ppi",
        refresh_rate_hz="120 Hz",
        display_brightness="1000 nits",
        capacity="5000 mAh",
        weight="200 g",
        thickness="8.1 mm"
    )
    
    # Add the phone to the database
    db_session.add(phone)
    db_session.commit()
    
    # Retrieve the phone from the database
    db_phone = db_session.query(Phone).filter(Phone.name == "Test Phone 2").first()
    
    # Check that the string values were saved correctly
    assert db_phone.screen_size_inches == "6.5 inches"
    assert db_phone.pixel_density_ppi == "402 ppi"
    assert db_phone.refresh_rate_hz == "120 Hz"
    assert db_phone.display_brightness == "1000 nits"
    assert db_phone.capacity == "5000 mAh"
    assert db_phone.weight == "200 g"
    assert db_phone.thickness == "8.1 mm"

def test_phone_schema_new_columns():
    """Test that the Phone schema can handle the new columns."""
    # Create a phone schema with the new columns
    phone_data = {
        "name": "Test Phone",
        "brand": "Test Brand",
        "model": "Test Model",
        "price": "$999",
        "url": "https://example.com",
        "img_url": "https://example.com/image.jpg",
        "main_camera": "48MP + 12MP + 5MP",
        "front_camera": "32MP"
    }
    
    # Create a PhoneBase instance
    phone_schema = PhoneBase(**phone_data)
    
    # Check that the new columns were set correctly
    assert phone_schema.main_camera == "48MP + 12MP + 5MP"
    assert phone_schema.front_camera == "32MP"

def test_phone_schema_string_columns():
    """Test that the Phone schema can handle string values for the updated columns."""
    # Create a phone schema with string values for the updated columns
    phone_data = {
        "name": "Test Phone 2",
        "brand": "Test Brand",
        "model": "Test Model",
        "price": "$999",
        "url": "https://example.com",
        "img_url": "https://example.com/image.jpg",
        "screen_size_inches": "6.5 inches",
        "pixel_density_ppi": "402 ppi",
        "refresh_rate_hz": "120 Hz",
        "display_brightness": "1000 nits",
        "capacity": "5000 mAh",
        "weight": "200 g",
        "thickness": "8.1 mm"
    }
    
    # Create a PhoneBase instance
    phone_schema = PhoneBase(**phone_data)
    
    # Check that the string values were set correctly
    assert phone_schema.screen_size_inches == "6.5 inches"
    assert phone_schema.pixel_density_ppi == "402 ppi"
    assert phone_schema.refresh_rate_hz == "120 Hz"
    assert phone_schema.display_brightness == "1000 nits"
    assert phone_schema.capacity == "5000 mAh"
    assert phone_schema.weight == "200 g"
    assert phone_schema.thickness == "8.1 mm"