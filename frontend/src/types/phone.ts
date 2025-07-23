/**
 * Phone interface for consistent type usage across components
 */
export interface Phone {
  id?: string;
  name: string;
  brand: string;
  price: string;
  img_url: string;
  chipset?: string;
  cpu?: string;
  ram: string;
  internal_storage: string;
  main_camera: string;
  front_camera: string;
  display_type: string;
  screen_size_inches: string;
  battery_capacity_numeric?: number;
  capacity?: string;
  overall_device_score?: number;
  [key: string]: any;
}