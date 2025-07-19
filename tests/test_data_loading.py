import os
import tempfile
import pandas as pd
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.phone import Phone
from app.utils.data_loader import load_data_from_csv
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

@pytest.fixture
def sample_csv_path():
    # Create a temporary CSV file with sample data
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as temp_file:
        # Create a sample DataFrame with the updated schema
        data = {
            'name': ['Test Phone 1', 'Test Phone 2'],
            'brand': ['Brand A', 'Brand B'],
            'model': ['Model A', 'Model B'],
            'price': ['$999', '$1099'],
            'url': ['https://example.com/1', 'https://example.com/2'],
            'img_url': ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            'screen_size_inches': ['6.5 inches', '6.7 inches'],
            'pixel_density_ppi': ['402 ppi', '458 ppi'],
            'refresh_rate_hz': ['120 Hz', '90 Hz'],
            'display_brightness': ['1000 nits', '1200 nits'],
            'capacity': ['5000 mAh', '4500 mAh'],
            'weight': ['200 g', '190 g'],
            'thickness': ['8.1 mm', '7.9 mm'],
            'main_camera': ['48MP + 12MP + 5MP', '64MP + 12MP + 8MP'],
            'front_camera': ['32MP', '20MP']
        }
        df = pd.DataFrame(data)
        df.to_csv(temp_file.name, index=False)
        
    yield temp_file.name
    
    # Clean up the temporary file
    os.unlink(temp_file.name)

def test_load_data_from_csv(db_session, sample_csv_path):
    """Test loading data from CSV with the updated schema."""
    # Load the data from the CSV file
    phones = load_data_from_csv(db_session, sample_csv_path)
    
    # Check that the phones were loaded correctly
    assert len(phones) == 2
    
    # Check the first phone
    phone1 = db_session.query(Phone).filter(Phone.name == 'Test Phone 1').first()
    assert phone1 is not None
    assert phone1.screen_size_inches == '6.5 inches'
    assert phone1.pixel_density_ppi == '402 ppi'
    assert phone1.refresh_rate_hz == '120 Hz'
    assert phone1.display_brightness == '1000 nits'
    assert phone1.capacity == '5000 mAh'
    assert phone1.weight == '200 g'
    assert phone1.thickness == '8.1 mm'
    assert phone1.main_camera == '48MP + 12MP + 5MP'
    assert phone1.front_camera == '32MP'
    
    # Check the second phone
    phone2 = db_session.query(Phone).filter(Phone.name == 'Test Phone 2').first()
    assert phone2 is not None
    assert phone2.screen_size_inches == '6.7 inches'
    assert phone2.pixel_density_ppi == '458 ppi'
    assert phone2.refresh_rate_hz == '90 Hz'
    assert phone2.display_brightness == '1200 nits'
    assert phone2.capacity == '4500 mAh'
    assert phone2.weight == '190 g'
    assert phone2.thickness == '7.9 mm'
    assert phone2.main_camera == '64MP + 12MP + 8MP'
    assert phone2.front_camera == '20MP'