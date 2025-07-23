/**
 * Filter state interface for the phone filtering system
 */
export interface FilterState {
  priceRange: {
    min: number | null;
    max: number | null;
  };
  brand: string | null;
  cameraSetup: string | null;
  mainCamera: number | null; // Minimum MP
  frontCamera: number | null; // Minimum MP
  ram: number | null; // Minimum GB
  storage: number | null; // Minimum GB
  batteryType: string | null;
  batteryCapacity: number | null; // Minimum mAh
  chipset: string | null;
  displayType: string | null;
  refreshRate: number | null; // Minimum Hz
  displaySize: {
    min: number | null; // Minimum inches
    max: number | null; // Maximum inches
  };
  os: string | null;
}

/**
 * Default filter state with all filters set to null
 */
export const defaultFilterState: FilterState = {
  priceRange: {
    min: null,
    max: null,
  },
  brand: null,
  cameraSetup: null,
  mainCamera: null,
  frontCamera: null,
  ram: null,
  storage: null,
  batteryType: null,
  batteryCapacity: null,
  chipset: null,
  displayType: null,
  refreshRate: null,
  displaySize: {
    min: null,
    max: null,
  },
  os: null,
};

/**
 * Filter options interface for the filter panel
 */
export interface FilterOptions {
  brands: string[];
  cameraSetups: string[];
  batteryTypes: string[];
  chipsets: string[];
  displayTypes: string[];
  operatingSystems: string[];
  // Numeric ranges
  priceRange: { min: number; max: number };
  mainCameraRange: { min: number; max: number };
  frontCameraRange: { min: number; max: number };
  ramOptions: number[]; // Available RAM options in GB
  storageOptions: number[]; // Available storage options in GB
  refreshRateOptions: number[]; // Available refresh rate options in Hz
  displaySizeRange: { min: number; max: number };
  batteryCapacityRange: { min: number; max: number };
}

/**
 * Default filter options with empty arrays and default ranges
 */
export const defaultFilterOptions: FilterOptions = {
  brands: [],
  cameraSetups: [],
  batteryTypes: [],
  chipsets: [],
  displayTypes: [],
  operatingSystems: [],
  priceRange: { min: 0, max: 200000 },
  mainCameraRange: { min: 0, max: 200 },
  frontCameraRange: { min: 0, max: 100 },
  ramOptions: [2, 4, 6, 8, 12, 16, 32],
  storageOptions: [16, 32, 64, 128, 256, 512, 1024],
  refreshRateOptions: [60, 90, 120, 144, 165],
  displaySizeRange: { min: 4, max: 8 },
  batteryCapacityRange: { min: 2000, max: 7000 },
};