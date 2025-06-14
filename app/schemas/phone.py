from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import date

class PhoneBase(BaseModel):
    name: str
    brand: str
    model: str
    price: str
    url: str
    img_url: Optional[str] = None

    # Display
    display_type: Optional[str] = None
    screen_size_inches: Optional[float] = None
    display_resolution: Optional[str] = None
    pixel_density_ppi: Optional[int] = None
    refresh_rate_hz: Optional[int] = None
    screen_protection: Optional[str] = None
    display_brightness: Optional[str] = None
    aspect_ratio: Optional[str] = None
    hdr_support: Optional[str] = None

    # Performance
    chipset: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    ram: Optional[str] = None
    ram_type: Optional[str] = None
    internal_storage: Optional[str] = None
    storage_type: Optional[str] = None

    # Camera
    camera_setup: Optional[str] = None
    primary_camera_resolution: Optional[str] = None
    selfie_camera_resolution: Optional[str] = None
    primary_camera_video_recording: Optional[str] = None
    selfie_camera_video_recording: Optional[str] = None
    primary_camera_ois: Optional[str] = None
    primary_camera_aperture: Optional[str] = None
    selfie_camera_aperture: Optional[str] = None
    camera_features: Optional[str] = None
    autofocus: Optional[str] = None
    flash: Optional[str] = None
    settings: Optional[str] = None
    zoom: Optional[str] = None
    shooting_modes: Optional[str] = None
    video_fps: Optional[str] = None

    # Battery
    battery_type: Optional[str] = None
    capacity: Optional[str] = None
    quick_charging: Optional[str] = None
    wireless_charging: Optional[str] = None
    reverse_charging: Optional[str] = None

    # Design
    build: Optional[str] = None
    weight: Optional[str] = None
    thickness: Optional[str] = None
    colors: Optional[str] = None
    waterproof: Optional[str] = None
    ip_rating: Optional[str] = None
    ruggedness: Optional[str] = None

    # Network & Connectivity
    network: Optional[str] = None
    speed: Optional[str] = None
    sim_slot: Optional[str] = None
    volte: Optional[str] = None
    bluetooth: Optional[str] = None
    wlan: Optional[str] = None
    gps: Optional[str] = None
    nfc: Optional[str] = None
    usb: Optional[str] = None
    usb_otg: Optional[str] = None

    # Security & Sensors
    fingerprint_sensor: Optional[str] = None
    finger_sensor_type: Optional[str] = None
    finger_sensor_position: Optional[str] = None
    face_unlock: Optional[str] = None
    light_sensor: Optional[str] = None
    infrared: Optional[str] = None
    fm_radio: Optional[str] = None

    # OS & Status
    operating_system: Optional[str] = None
    os_version: Optional[str] = None
    user_interface: Optional[str] = None
    status: Optional[str] = None
    made_by: Optional[str] = None
    release_date: Optional[str] = None

    # New fields and derived metrics
    price_original: Optional[float] = None
    price_category: Optional[str] = None
    storage_gb: Optional[float] = None
    ram_gb: Optional[float] = None
    price_per_gb: Optional[float] = None
    price_per_gb_ram: Optional[float] = None
    screen_size_numeric: Optional[float] = None
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    ppi_numeric: Optional[float] = None
    refresh_rate_numeric: Optional[int] = None
    camera_count: Optional[int] = None
    primary_camera_mp: Optional[float] = None
    selfie_camera_mp: Optional[float] = None
    battery_capacity_numeric: Optional[int] = None
    has_fast_charging: Optional[bool] = None
    has_wireless_charging: Optional[bool] = None
    charging_wattage: Optional[float] = None
    battery_score: Optional[float] = None
    security_score: Optional[float] = None
    connectivity_score: Optional[float] = None
    is_popular_brand: Optional[bool] = None
    release_date_clean: Optional[date] = None
    is_new_release: Optional[bool] = None
    age_in_months: Optional[int] = None
    is_upcoming: Optional[bool] = None
    overall_device_score: Optional[float] = None
    performance_score: Optional[float] = None
    display_score: Optional[float] = None
    camera_score: Optional[float] = None

class PhoneCreate(PhoneBase):
    pass

class PhoneInDB(PhoneBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Phone(PhoneInDB):
    """Phone model returned to clients"""
    pass

class PhoneList(BaseModel):
    items: List[Phone]
    total: int
