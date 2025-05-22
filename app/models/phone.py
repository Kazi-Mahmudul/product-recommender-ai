from sqlalchemy import Column, Integer, String, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base

class Phone(Base):
    __tablename__ = "phones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    brand = Column(String(100), index=True)
    model = Column(String(100), index=True)
    price = Column(Float)
    url = Column(String(100))
    
    # Display
    display_type = Column(String(100))
    screen_size_inches = Column(Float)
    display_resolution = Column(String(100))
    pixel_density_ppi = Column(Float)
    refresh_rate_hz = Column(Float)
    screen_protection = Column(String(100))
    display_brightness = Column(String(100))
    screen_to_body_ratio = Column(String(100))
    aspect_ratio = Column(String(100))
    hdr_support = Column(String(100)) 

    # Performance
    chipset = Column(String(255))
    cpu = Column(String(255))
    gpu = Column(String(255))
    ram = Column(String(255))
    ram_type = Column(String(50))
    internal_storage = Column(String(255))
    storage_type = Column(String(50))
    virtual_ram = Column(String(255))

    # Camera
    camera_setup = Column(String(100))
    primary_camera_resolution = Column(String(255))
    selfie_camera_resolution = Column(String(255))
    primary_camera_video_recording = Column(String(100))
    selfie_camera_video_recording = Column(String(100))
    primary_camera_ois = Column(String(50))
    primary_camera_aperture = Column(String(50))
    primary_camera_image_resolution = Column(String(100))
    selfie_camera_aperture = Column(String(50))
    camera_features = Column(Text)
    autofocus = Column(String(255))
    flash = Column(String(100))
    settings = Column(String(255))
    zoom = Column(String(100))
    shooting_modes = Column(String(255))
    video_fps = Column(String(100))


    # Battery
    battery_type = Column(String(50))
    capacity = Column(String(255))
    quick_charging = Column(String(255))
    wireless_charging = Column(String(255))
    reverse_charging = Column(String(255))

    # Design
    build = Column(String(255))
    weight = Column(String(255))
    thickness = Column(String(255))
    colors = Column(String(255))
    waterproof = Column(String(255))
    ip_rating = Column(String(50))
    ruggedness = Column(String(50))

    # Network & Connectivity
    network = Column(String(50))
    speed = Column(String(255))
    sim_slot = Column(String(100))
    volte = Column(String(50))
    bluetooth = Column(String(50))
    wlan = Column(String(100))
    gps = Column(String(100))
    nfc = Column(String(50))
    usb_type_c = Column(String(100))
    usb_otg = Column(String(50))

    # Security
    fingerprint_sensor = Column(String(100))
    finger_sensor_type = Column(String(50))
    finger_sensor_position = Column(String(50))
    face_unlock = Column(String(255))

    # Sensors
    light_sensor = Column(String(255))
    sensor = Column(Text)  # e.g. Gyroscope, Accelerometer etc.
    infrared = Column(String(100))
    fm_radio = Column(String(100))

    # OS
    operating_system = Column(String(100))
    os_version = Column(String(100))
    user_interface = Column(String(100))
    release_date = Column(String(50))
    status = Column(String(50))
    made_by = Column(String(100))
    
    def __repr__(self):
        return f"<Phone {self.brand} {self.model}>"