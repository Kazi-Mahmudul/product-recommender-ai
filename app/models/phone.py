from sqlalchemy import Column, Integer, String, Float, Text, JSON, ForeignKey, DateTime, TypeDecorator
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

class Percentage(TypeDecorator):
    """Custom type for handling percentage values."""
    impl = Float
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            # Remove % sign and convert to decimal
            value = value.replace('%', '').strip()
        try:
            return float(value) / 100
        except (ValueError, TypeError):
            return None
    
    def process_result_value(self, value, dialect):
        return value

class Phone(Base):
    __tablename__ = "phones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    brand = Column(String(100), index=True)
    model = Column(String(100), index=True)
    price = Column(Float)
    url = Column(String(255))
    
    # Display
    display_type = Column(String(100))
    screen_size_inches = Column(Float)
    display_resolution = Column(String(50))
    pixel_density_ppi = Column(Integer)
    refresh_rate_hz = Column(Integer)
    screen_protection = Column(String(100))
    display_brightness = Column(String(50))
    aspect_ratio = Column(String(50))
    hdr_support = Column(String(50)) 

    # Performance
    chipset = Column(String(100))
    cpu = Column(String(255))
    gpu = Column(String(100))
    ram = Column(String(50))
    ram_type = Column(String(50))
    internal_storage = Column(String(50))
    storage_type = Column(String(50))
    virtual_ram = Column(String(50))

    # Camera
    camera_setup = Column(String(255))
    primary_camera_resolution = Column(String(100))
    selfie_camera_resolution = Column(String(100))
    primary_camera_video_recording = Column(String(100))
    selfie_camera_video_recording = Column(String(100))
    primary_camera_ois = Column(String(50))
    primary_camera_aperture = Column(String(50))
    primary_camera_image_resolution = Column(String(100))
    selfie_camera_aperture = Column(String(50))
    camera_features = Column(String(255))
    autofocus = Column(String(100))
    flash = Column(String(100))
    settings = Column(String(255))
    zoom = Column(String(100))
    shooting_modes = Column(String(255))
    video_fps = Column(String(100))

    # Battery
    battery_type = Column(String(100))
    capacity = Column(String(50))
    quick_charging = Column(String(100))
    wireless_charging = Column(String(100))
    reverse_charging = Column(String(100))

    # Design
    build = Column(String(255))
    weight = Column(String(50))
    thickness = Column(String(50))
    colors = Column(String(255))
    waterproof = Column(String(100))
    ip_rating = Column(String(50))
    ruggedness = Column(String(100))

    # Network & Connectivity
    network = Column(String(100))
    speed = Column(String(100))
    sim_slot = Column(String(100))
    volte = Column(String(50))
    bluetooth = Column(String(100))
    wlan = Column(String(255))
    gps = Column(String(100))
    nfc = Column(String(50))
    usb_type_c = Column(String(50))
    usb_otg = Column(String(50))

    # Security
    fingerprint_sensor = Column(String(50))
    finger_sensor_type = Column(String(100))
    finger_sensor_position = Column(String(100))
    face_unlock = Column(String(50))

    # Sensors
    light_sensor = Column(String(50))
    sensor = Column(String(255))
    infrared = Column(String(50))
    fm_radio = Column(String(50))

    # OS
    operating_system = Column(String(100))
    os_version = Column(String(100))
    user_interface = Column(String(100))
    release_date = Column(String(50))
    status = Column(String(50))
    made_by = Column(String(100))

    # Derived Columns
    price_per_gb_ram = Column(Float, nullable=True)
    price_per_gb_storage = Column(Float, nullable=True)
    performance_score = Column(Float, nullable=True)
    display_score = Column(Float, nullable=True)
    camera_score = Column(Float, nullable=True)
    storage_score = Column(Float, nullable=True)
    battery_efficiency = Column(Float, nullable=True)
    price_to_display = Column(Float, nullable=True)
    
    def __repr__(self):
        return f"<Phone {self.brand} {self.model}>"