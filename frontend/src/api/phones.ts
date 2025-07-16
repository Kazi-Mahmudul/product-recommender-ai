// phones.ts - API utility for fetching phones

// API_BASE is loaded from .env (REACT_APP_API_BASE) via process.env in Create React App
const API_BASE = process.env.REACT_APP_API_BASE || "/api";

export interface Phone {
  id: number;
  name: string;
  brand: string;
  model: string;
  price: string;
  url: string;
  img_url?: string;

  // Display
  display_type?: string;
  screen_size_inches?: number;
  display_resolution?: string;
  pixel_density_ppi?: number;
  refresh_rate_hz?: number;
  screen_protection?: string;
  display_brightness?: string;
  aspect_ratio?: string;
  hdr_support?: string;

  // Performance
  chipset?: string;
  cpu?: string;
  gpu?: string;
  ram?: string;
  ram_type?: string;
  internal_storage?: string;
  storage_type?: string;

  // Camera
  camera_setup?: string;
  primary_camera_resolution?: string;
  selfie_camera_resolution?: string;
  primary_camera_video_recording?: string;
  selfie_camera_video_recording?: string;
  primary_camera_ois?: string;
  primary_camera_aperture?: string;
  selfie_camera_aperture?: string;
  camera_features?: string;
  autofocus?: string;
  flash?: string;
  settings?: string;
  zoom?: string;
  shooting_modes?: string;
  video_fps?: string;

  // Battery
  battery_type?: string;
  capacity?: string;
  quick_charging?: string;
  wireless_charging?: string;
  reverse_charging?: string;

  // Design
  build?: string;
  weight?: string;
  thickness?: string;
  colors?: string;
  waterproof?: string;
  ip_rating?: string;
  ruggedness?: string;

  // Network & Connectivity
  network?: string;
  speed?: string;
  sim_slot?: string;
  volte?: string;
  bluetooth?: string;
  wlan?: string;
  gps?: string;
  nfc?: string;
  usb?: string;
  usb_otg?: string;

  // Security & Sensors
  fingerprint_sensor?: string;
  finger_sensor_type?: string;
  finger_sensor_position?: string;
  face_unlock?: string;
  light_sensor?: string;
  infrared?: string;
  fm_radio?: string;

  // OS & Status
  operating_system?: string;
  os_version?: string;
  user_interface?: string;
  status?: string;
  made_by?: string;
  release_date?: string;

  // Derived metrics
  price_original?: number;
  price_category?: string;
  storage_gb?: number;
  ram_gb?: number;
  price_per_gb?: number;
  price_per_gb_ram?: number;
  screen_size_numeric?: number;
  resolution_width?: number;
  resolution_height?: number;
  ppi_numeric?: number;
  refresh_rate_numeric?: number;
  camera_count?: number;
  primary_camera_mp?: number;
  selfie_camera_mp?: number;
  battery_capacity_numeric?: number;
  has_fast_charging?: boolean;
  has_wireless_charging?: boolean;
  charging_wattage?: number;
  battery_score?: number;
  security_score?: number;
  connectivity_score?: number;
  is_popular_brand?: boolean;
  release_date_clean?: string;
  is_new_release?: boolean;
  age_in_months?: number;
  is_upcoming?: boolean;
  overall_device_score?: number;
  performance_score?: number;
  display_score?: number;
  camera_score?: number;
}

export interface PhoneListResponse {
  items: Phone[];
  total: number;
}

export type SortOrder = "default" | "price_high" | "price_low";

export async function fetchPhones({
  page = 1,
  pageSize = 20,
  sort = "default",
  minPrice,
  maxPrice,
}: {
  page?: number;
  pageSize?: number;
  sort?: SortOrder;
  minPrice?: number;
  maxPrice?: number;
} = {}): Promise<PhoneListResponse> {
  const skip = (page - 1) * pageSize;
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: pageSize.toString(),
  });
  if (minPrice !== undefined) params.append("min_price", minPrice.toString());
  if (maxPrice !== undefined) params.append("max_price", maxPrice.toString());
  // Sorting is handled client-side for now, unless backend supports it

  const res = await fetch(`${API_BASE}/api/v1/phones?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch phones");
  const data = await res.json();
  let items = data.items;
  if (sort === "price_high") {
    items = [...items].sort((a, b) => (b.price_original || 0) - (a.price_original || 0));
  } else if (sort === "price_low") {
    items = [...items].sort((a, b) => (a.price_original || 0) - (b.price_original || 0));
  }
  return { items, total: data.total };
}

// Fetch a single phone by ID
export async function fetchPhoneById(id: number | string): Promise<Phone> {
  const res = await fetch(`${API_BASE}/api/v1/phones/${id}`);
  if (!res.ok) throw new Error("Failed to fetch phone details");
  return res.json();
} 