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
    name = Column(String(512), index=True)
    brand = Column(String(255), index=True)
    model = Column(String(255), index=True)
    price = Column(Float)
    url = Column(String(1024))
    
    # Display
    display_type = Column(String(255))
    screen_size_inches = Column(Float)
    display_resolution = Column(String(255))
    pixel_density_ppi = Column(Integer)
    refresh_rate_hz = Column(Integer)
    screen_protection = Column(String(255))
    display_brightness = Column(String(255))
    aspect_ratio = Column(String(255))
    hdr_support = Column(String(255)) 

    # Performance
    chipset = Column(String(512))
    cpu = Column(String(512))
    gpu = Column(String(512))
    ram = Column(String(255))
    ram_type = Column(String(255))
    internal_storage = Column(String(255))
    storage_type = Column(String(255))
    virtual_ram = Column(String(255))

    # Camera
    camera_setup = Column(String(512))
    primary_camera_resolution = Column(String(512))
    selfie_camera_resolution = Column(String(512))
    primary_camera_video_recording = Column(String(255))
    selfie_camera_video_recording = Column(String(255))
    primary_camera_ois = Column(String(255))
    primary_camera_aperture = Column(String(255))
    primary_camera_image_resolution = Column(String(255))
    selfie_camera_aperture = Column(String(255))
    camera_features = Column(String(1024))
    autofocus = Column(String(255))
    flash = Column(String(255))
    settings = Column(String(1024))
    zoom = Column(String(255))
    shooting_modes = Column(String(1024))
    video_fps = Column(String(255))

    # Battery
    battery_type = Column(String(255))
    capacity = Column(String(255))
    quick_charging = Column(String(255))
    wireless_charging = Column(String(255))
    reverse_charging = Column(String(255))

    # Design
    build = Column(String(1024))
    weight = Column(String(255))
    thickness = Column(String(255))
    colors = Column(String(1024))
    waterproof = Column(String(255))
    ip_rating = Column(String(255))
    ruggedness = Column(String(255))

    # Network & Connectivity
    network = Column(String(255))
    speed = Column(String(255))
    sim_slot = Column(String(255))
    volte = Column(String(255))
    bluetooth = Column(String(255))
    wlan = Column(String(1024))
    gps = Column(String(1024))
    nfc = Column(String(255))
    usb_type_c = Column(String(255))
    usb_otg = Column(String(255))

    # Security
    fingerprint_sensor = Column(String(255))
    finger_sensor_type = Column(String(255))
    finger_sensor_position = Column(String(255))
    face_unlock = Column(String(255))

    # Sensors
    light_sensor = Column(String(1024))
    sensor = Column(String(1024))
    infrared = Column(String(255))
    fm_radio = Column(String(255))

    # OS
    operating_system = Column(String(255))
    os_version = Column(String(255))
    user_interface = Column(String(255))
    release_date = Column(String(255))
    status = Column(String(255))
    made_by = Column(String(255))

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