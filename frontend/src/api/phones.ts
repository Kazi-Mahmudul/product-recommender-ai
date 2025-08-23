// phones.ts - API utility for fetching phones
import {
  FilterState,
  FilterOptions,
  defaultFilterOptions,
} from "../types/filters";

// API_BASE is loaded from .env (REACT_APP_API_BASE) via process.env in Create React App
// Ensure we always use HTTPS in production
let API_BASE = process.env.REACT_APP_API_BASE || "/api";
if (API_BASE.startsWith('http://')) {
  API_BASE = API_BASE.replace('http://', 'https://');
}

export interface Phone {
  id: number;
  name: string;
  brand: string;
  model: string;
  slug?: string;
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
  main_camera?: string;
  front_camera?: string;

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
  filters,
}: {
  page?: number;
  pageSize?: number;
  sort?: SortOrder;
  filters?: FilterState;
} = {}): Promise<PhoneListResponse> {


  // Set up pagination parameters
  const skip = (page - 1) * pageSize;
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: pageSize.toString(),
  });

  // Add all filter parameters to the API request
  if (filters) {
    // Price range filters
    if (filters.priceRange.min !== null)
      params.append("min_price", filters.priceRange.min.toString());
    if (filters.priceRange.max !== null)
      params.append("max_price", filters.priceRange.max.toString());

    // Brand filter
    if (filters.brand !== null) params.append("brand", filters.brand);

    // Camera filters
    if (filters.cameraSetup !== null)
      params.append("camera_setup", filters.cameraSetup);
    if (filters.mainCamera !== null)
      params.append("min_primary_camera_mp", filters.mainCamera.toString());
    if (filters.frontCamera !== null)
      params.append("min_selfie_camera_mp", filters.frontCamera.toString());

    // Performance filters
    if (filters.ram !== null)
      params.append("min_ram_gb", filters.ram.toString());
    if (filters.storage !== null)
      params.append("min_storage_gb", filters.storage.toString());

    // Battery filters
    if (filters.batteryType !== null)
      params.append("battery_type", filters.batteryType);
    if (filters.batteryCapacity !== null)
      params.append("min_battery_capacity", filters.batteryCapacity.toString());

    // Display filters
    if (filters.displayType !== null)
      params.append("display_type", filters.displayType);
    if (filters.refreshRate !== null)
      params.append("min_refresh_rate", filters.refreshRate.toString());
    if (filters.displaySize.min !== null)
      params.append("min_screen_size", filters.displaySize.min.toString());
    if (filters.displaySize.max !== null)
      params.append("max_screen_size", filters.displaySize.max.toString());

    // Platform filters
    if (filters.chipset !== null) params.append("chipset", filters.chipset);
    if (filters.os !== null) params.append("os", filters.os);
  }

  // Add sorting parameter
  if (sort !== "default") {
    params.append("sort", sort);
  }



  // Fetch phones from API
  const res = await fetch(`${API_BASE}/api/v1/phones?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch phones");
  const data = await res.json();
  let items = data.items;
  let totalCount = data.total || items.length;

  // Apply client-side sorting if needed (in case server doesn't support it)
  if (sort === "price_high" && !params.has("sort")) {
    items = [...items].sort(
      (a, b) => (b.price_original || 0) - (a.price_original || 0)
    );
  } else if (sort === "price_low" && !params.has("sort")) {
    items = [...items].sort(
      (a, b) => (a.price_original || 0) - (b.price_original || 0)
    );
  }



  return { items, total: totalCount };
}



/**
 * Fetch a single phone by slug with enhanced error handling
 * @param slug - The slug of the phone to fetch
 * @returns Promise resolving to a Phone object
 * @throws Error if the phone cannot be fetched or the slug is invalid
 */
export async function fetchPhoneBySlug(slug: string): Promise<Phone> {
  // Validate slug before making API calls
  if (!slug || slug.trim().length === 0) {
    throw new Error(
      `Invalid phone slug: ${slug}. Please provide a valid phone slug.`
    );
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/phones/slug/${slug}`);

    if (!res.ok) {
      // Handle different HTTP error codes
      if (res.status === 404) {
        throw new Error(
          `Phone with slug '${slug}' not found. Please check the phone slug and try again.`
        );
      } else if (res.status === 429) {
        throw new Error("Too many requests. Please try again later.");
      } else if (res.status === 400) {
        throw new Error(
          "Invalid request. Please check your parameters and try again."
        );
      } else if (res.status === 401) {
        throw new Error(
          "Authentication required. Please log in and try again."
        );
      } else if (res.status === 403) {
        throw new Error(
          "Access denied. You do not have permission to access this resource."
        );
      } else if (res.status >= 500) {
        throw new Error(
          "Server error. Our team has been notified. Please try again later."
        );
      } else {
        throw new Error(
          `Failed to fetch phone details: HTTP error ${res.status}`
        );
      }
    }

    const data = await res.json();

    // Validate the response data
    if (!data || !data.id) {
      throw new Error("Invalid phone data received from server.");
    }

    return data;
  } catch (error) {
    // Check for network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        "Network error. Please check your internet connection and try again."
      );
    }



    // Re-throw the error with a more descriptive message if it's not already an Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(
        "An unexpected error occurred while fetching phone details."
      );
    }
  }
}



/**
 * Fetch all available phone brands
 * @returns Promise resolving to an array of brand names
 */
export async function fetchBrands(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/phones/brands`);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    // Ensure we have an array of strings
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.brands)) {
      return data.brands;
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}

/**
 * Extract unique camera setups from a list of phones
 * @returns Promise resolving to an array of unique camera setup types
 */
export async function fetchCameraSetups(): Promise<string[]> {
  try {
    // Fetch a larger sample of phones to get a good variety of camera setups
    const params = new URLSearchParams({
      limit: "100", // Get a good sample size
      skip: "0",
    });

    const res = await fetch(`${API_BASE}/api/v1/phones?${params.toString()}`);

    if (!res.ok) {
      return ["Single", "Dual", "Triple", "Quad", "Penta"]; // Fallback to common values
    }

    const data = await res.json();

    if (!data || !Array.isArray(data.items)) {
      return ["Single", "Dual", "Triple", "Quad", "Penta"]; // Fallback to common values
    }

    // Extract unique camera_setup values
    const cameraSetups = new Set<string>();

    data.items.forEach((phone: Phone) => {
      if (
        phone.camera_setup &&
        typeof phone.camera_setup === "string" &&
        phone.camera_setup.trim() !== ""
      ) {
        cameraSetups.add(phone.camera_setup.trim());
      }
    });

    // Convert Set to Array and sort
    const uniqueCameraSetups = Array.from(cameraSetups).sort();

    return uniqueCameraSetups.length > 0
      ? uniqueCameraSetups
      : ["Single", "Dual", "Triple", "Quad", "Penta"]; // Fallback if no values found
  } catch (error) {
    // Return common camera setups as fallback
    return ["Single", "Dual", "Triple", "Quad", "Penta"];
  }
}

/**
 * Fetch multiple phones by their slugs efficiently with retry logic and proper error handling
 * @param phoneSlugs - Array of phone slugs to fetch
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Promise resolving to array of Phone objects
 */
export async function fetchPhonesBySlugs(phoneSlugs: string[], signal?: AbortSignal): Promise<Phone[]> {
  if (phoneSlugs.length === 0) return [];

  // Check if request was already aborted before starting
  if (signal?.aborted) {
    throw new Error('Request aborted');
  }

  // Import retry service dynamically to avoid circular dependencies
  const { retryService } = await import('../services/retryService');

  const fetchOperation = async (): Promise<Phone[]> => {
    // Check if request was aborted
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    try {
      // Use comma-separated slugs for bulk fetch
      const slugsParam = phoneSlugs.join(',');
      const res = await fetch(`${API_BASE}/api/v1/phones/bulk?slugs=${slugsParam}`, {
        signal,
      });

      if (!res.ok) {
        // Create error with status code for proper classification
        const error = new Error(`Failed to fetch phones by slugs: HTTP error ${res.status}`) as any;
        error.statusCode = res.status;
        
        // Handle specific status codes
        if (res.status === 404) {
          return await fetchIndividualPhonesBySlugs(phoneSlugs, signal);
        } else if (res.status === 429) {
          // Extract retry-after header if available
          const retryAfter = res.headers.get('retry-after');
          if (retryAfter) {
            error.retryAfter = parseInt(retryAfter, 10);
          }
        }
        
        throw error;
      }

      const data = await res.json();
      
      // Validate response format for new bulk endpoint structure
      if (!data || typeof data !== 'object' || !Array.isArray(data.phones)) {
        throw new Error('Invalid response format from bulk phone fetch by slugs');
      }

      // Return the phones array from the structured response
      return data.phones;
    } catch (error: any) {
      // Handle network errors specifically
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw error;
      }
      
      // Handle insufficient resources error
      if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
        throw error;
      }
      
      // Handle abort errors
      if (error.name === 'AbortError' || signal?.aborted) {
        throw new Error('Request aborted');
      }
      
      // For other errors, try fallback
      if (!error.statusCode) {
        return await fetchIndividualPhonesBySlugs(phoneSlugs, signal);
      }
      
      throw error;
    }
  };

  try {
    // Use retry service for the main operation
    return await retryService.executeWithRetry(fetchOperation, signal);
  } catch (error) {
    // Last resort: try individual fetches without retry
    try {
      return await fetchIndividualPhonesBySlugs(phoneSlugs, signal);
    } catch (fallbackError) {
      throw new Error('Failed to fetch phone data by slugs after all retry attempts');
    }
  }
}

/**
 * Fallback function to fetch phones individually by slugs
 * @param phoneSlugs - Array of phone slugs to fetch
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Promise resolving to array of successfully fetched Phone objects
 */
async function fetchIndividualPhonesBySlugs(phoneSlugs: string[], signal?: AbortSignal): Promise<Phone[]> {
  const phonePromises = phoneSlugs.map(async (slug) => {
    try {
      return await fetchPhoneBySlug(slug);
    } catch (error) {
      return null;
    }
  });

  const results = await Promise.allSettled(phonePromises);
  
  const successfulPhones = results
    .filter((result): result is PromiseFulfilledResult<Phone | null> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value as Phone);

  // If no phones were successfully fetched, throw an error
  if (successfulPhones.length === 0) {
    throw new Error('All individual phone fetches by slugs failed');
  }

  return successfulPhones;
}



/**
 * Fetch available filter options from the API
 * @returns Promise resolving to FilterOptions object
 */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  try {
    // Fetch filter options
    const optionsPromise = fetch(`${API_BASE}/api/v1/phones/filter-options`)
      .then((res) => {
        if (!res.ok) {
          return {};
        }
        return res.json();
      })
      .catch((error) => {
        return {};
      });

    // Fetch brands
    const brandsPromise = fetchBrands();

    // Fetch camera setups
    const cameraSetupsPromise = fetchCameraSetups();

    // Wait for all requests to complete
    const [optionsData, brandsData, cameraSetupsData] = await Promise.all([
      optionsPromise,
      brandsPromise,
      cameraSetupsPromise,
    ]);

    // Merge the API responses with default options
    return {
      ...defaultFilterOptions,
      ...optionsData,
      brands: brandsData.length > 0 ? brandsData : defaultFilterOptions.brands,
      cameraSetups:
        cameraSetupsData.length > 0
          ? cameraSetupsData
          : defaultFilterOptions.cameraSetups,
    };
  } catch (error) {
    return defaultFilterOptions;
  }
}
