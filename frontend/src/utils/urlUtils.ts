import { FilterState, defaultFilterState } from '../types/filters';

/**
 * Serialize filter state to URL search params
 * @param filters Filter state to serialize
 * @returns URLSearchParams object
 */
export const filtersToSearchParams = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  
  // Price range
  if (filters.priceRange.min !== null) {
    params.append('minPrice', filters.priceRange.min.toString());
  }
  if (filters.priceRange.max !== null) {
    params.append('maxPrice', filters.priceRange.max.toString());
  }
  
  // Brand
  if (filters.brand !== null) {
    params.append('brand', filters.brand);
  }
  
  // Camera
  if (filters.cameraSetup !== null) {
    params.append('cameraSetup', filters.cameraSetup);
  }
  if (filters.mainCamera !== null) {
    params.append('mainCamera', filters.mainCamera.toString());
  }
  if (filters.frontCamera !== null) {
    params.append('frontCamera', filters.frontCamera.toString());
  }
  
  // Performance
  if (filters.ram !== null) {
    params.append('ram', filters.ram.toString());
  }
  if (filters.storage !== null) {
    params.append('storage', filters.storage.toString());
  }
  
  // Battery
  if (filters.batteryType !== null) {
    params.append('batteryType', filters.batteryType);
  }
  if (filters.batteryCapacity !== null) {
    params.append('batteryCapacity', filters.batteryCapacity.toString());
  }
  
  // Display
  if (filters.displayType !== null) {
    params.append('displayType', filters.displayType);
  }
  if (filters.refreshRate !== null) {
    params.append('refreshRate', filters.refreshRate.toString());
  }
  if (filters.displaySize.min !== null) {
    params.append('displaySizeMin', filters.displaySize.min.toString());
  }
  if (filters.displaySize.max !== null) {
    params.append('displaySizeMax', filters.displaySize.max.toString());
  }
  
  // Platform
  if (filters.chipset !== null) {
    params.append('chipset', filters.chipset);
  }
  if (filters.os !== null) {
    params.append('os', filters.os);
  }
  
  return params;
};

/**
 * Parse URL search params to filter state
 * @param searchParams URLSearchParams object
 * @returns Filter state
 */
export const searchParamsToFilters = (searchParams: URLSearchParams): FilterState => {
  const filters = { ...defaultFilterState };
  
  // Price range
  const minPrice = searchParams.get('minPrice');
  if (minPrice) {
    filters.priceRange.min = parseInt(minPrice, 10);
  }
  
  const maxPrice = searchParams.get('maxPrice');
  if (maxPrice) {
    filters.priceRange.max = parseInt(maxPrice, 10);
  }
  
  // Brand
  const brand = searchParams.get('brand');
  if (brand) {
    filters.brand = brand;
  }
  
  // Camera
  const cameraSetup = searchParams.get('cameraSetup');
  if (cameraSetup) {
    filters.cameraSetup = cameraSetup;
  }
  
  const mainCamera = searchParams.get('mainCamera');
  if (mainCamera) {
    filters.mainCamera = parseInt(mainCamera, 10);
  }
  
  const frontCamera = searchParams.get('frontCamera');
  if (frontCamera) {
    filters.frontCamera = parseInt(frontCamera, 10);
  }
  
  // Performance
  const ram = searchParams.get('ram');
  if (ram) {
    filters.ram = parseInt(ram, 10);
  }
  
  const storage = searchParams.get('storage');
  if (storage) {
    filters.storage = parseInt(storage, 10);
  }
  
  // Battery
  const batteryType = searchParams.get('batteryType');
  if (batteryType) {
    filters.batteryType = batteryType;
  }
  
  const batteryCapacity = searchParams.get('batteryCapacity');
  if (batteryCapacity) {
    filters.batteryCapacity = parseInt(batteryCapacity, 10);
  }
  
  // Display
  const displayType = searchParams.get('displayType');
  if (displayType) {
    filters.displayType = displayType;
  }
  
  const refreshRate = searchParams.get('refreshRate');
  if (refreshRate) {
    filters.refreshRate = parseInt(refreshRate, 10);
  }
  
  const displaySizeMin = searchParams.get('displaySizeMin');
  if (displaySizeMin) {
    filters.displaySize.min = parseFloat(displaySizeMin);
  }
  
  const displaySizeMax = searchParams.get('displaySizeMax');
  if (displaySizeMax) {
    filters.displaySize.max = parseFloat(displaySizeMax);
  }
  
  // Platform
  const chipset = searchParams.get('chipset');
  if (chipset) {
    filters.chipset = chipset;
  }
  
  const os = searchParams.get('os');
  if (os) {
    filters.os = os;
  }
  
  return filters;
};