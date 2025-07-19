from sqlalchemy import Column, Integer, String, Float, Boolean, Date
from app.core.database import Base

class Phone(Base):
    __tablename__ = "phones"

    # Core fields
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(512), index=True)
    brand = Column(String(255), index=True)
    model = Column(String(255), index=True)
    price = Column(String(1024))
    url = Column(String(1024))
    img_url = Column(String(1024))
    
    # Display
    display_type = Column(String(255))
    screen_size_inches = Column(String(255))  # Changed from Float to String
    display_resolution = Column(String(255))
    pixel_density_ppi = Column(String(255))   # Changed from Integer to String
    refresh_rate_hz = Column(String(255))     # Changed from Integer to String
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
    
    # Camera
    camera_setup = Column(String(512))
    primary_camera_resolution = Column(String(512))
    selfie_camera_resolution = Column(String(512))
    primary_camera_video_recording = Column(String(255))
    selfie_camera_video_recording = Column(String(255))
    primary_camera_ois = Column(String(255))
    primary_camera_aperture = Column(String(255))
    selfie_camera_aperture = Column(String(255))
    camera_features = Column(String(1024))
    autofocus = Column(String(255))
    flash = Column(String(255))
    settings = Column(String(1024))
    zoom = Column(String(255))
    shooting_modes = Column(String(1024))
    video_fps = Column(String(255))
    main_camera = Column(String(512))  # New column
    front_camera = Column(String(512))  # New column

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
    usb = Column(String(255))
    usb_otg = Column(String(255))
    fingerprint_sensor = Column(String(255))
    finger_sensor_type = Column(String(255))
    finger_sensor_position = Column(String(255))
    face_unlock = Column(String(255))
    light_sensor = Column(String(255))
    infrared = Column(String(255))
    fm_radio = Column(String(255))
    operating_system = Column(String(255))
    os_version = Column(String(255))
    user_interface = Column(String(255))
    status = Column(String(255))
    made_by = Column(String(255))
    release_date = Column(String(255))
    
    # New fields and derived metrics
    price_original = Column(Float)
    price_category = Column(String(255))
    storage_gb = Column(Float)
    ram_gb = Column(Float)
    price_per_gb = Column(Float)
    price_per_gb_ram = Column(Float)
    screen_size_numeric = Column(Float)
    resolution_width = Column(Integer)
    resolution_height = Column(Integer)
    ppi_numeric = Column(Float)
    refresh_rate_numeric = Column(Integer)
    camera_count = Column(Integer)
    primary_camera_mp = Column(Float)
    selfie_camera_mp = Column(Float)
    battery_capacity_numeric = Column(Integer)
    has_fast_charging = Column(Boolean)
    has_wireless_charging = Column(Boolean)
    charging_wattage = Column(Float)
    battery_score = Column(Float)
    security_score = Column(Float)
    connectivity_score = Column(Float)
    is_popular_brand = Column(Boolean)
    release_date_clean = Column(Date)
    is_new_release = Column(Boolean)
    age_in_months = Column(Integer)
    is_upcoming = Column(Boolean)
    overall_device_score = Column(Float)
    performance_score = Column(Float)
    display_score = Column(Float)
    camera_score = Column(Float)

    def __repr__(self):
        return f"<Phone {self.brand} {self.model}>"