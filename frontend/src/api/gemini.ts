// Gemini AI API utility
// Uses REACT_APP_GEMINI_API from .env
// Enhanced with RAG pipeline integration
import { chatAPIService, ChatQueryRequest } from './chat';
const GEMINI_API = process.env.REACT_APP_GEMINI_API;


export async function fetchGeminiSummary(prompt: string): Promise<string> {
  if (!GEMINI_API) {
    throw new Error("AI service configuration missing");
  }

  if (!prompt || prompt.trim() === "") {
    throw new Error("Invalid prompt provided");
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const res = await fetch(GEMINI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If we can't parse the error response, use the status text
      }

      if (res.status === 400) {
        throw new Error("Invalid request to AI service");
      } else if (res.status === 401 || res.status === 403) {
        throw new Error("AI service authentication failed");
      } else if (res.status === 429) {
        throw new Error("AI service rate limit exceeded. Please try again later.");
      } else if (res.status >= 500) {
        throw new Error("AI service is temporarily unavailable");
      } else {
        throw new Error(`AI service error: ${errorMessage}`);
      }
    }

    const data = await res.json();
    const summary = data.summary || data.result || "";

    if (!summary) {
      throw new Error("AI service returned empty response");
    }

    return summary;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error("AI service request timed out. Please try again.");
    }

    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      throw new Error("Unable to connect to AI service. Please check your internet connection.");
    }

    // Re-throw our custom errors
    if (error.message.includes("AI service") || error.message.includes("Invalid") || error.message.includes("authentication")) {
      throw error;
    }

    throw new Error("An unexpected error occurred while generating the summary");
  }
}

/**
 * Enhanced phone category detection for contextual analysis
 * Determines the phone's market category based on various factors
 */
function determinePhoneCategory(phone: any): string {
  const price = phone.price_original;
  const brand = phone.brand?.toLowerCase() || '';
  const name = phone.name?.toLowerCase() || '';
  const specs = {
    camera: phone.primary_camera_mp || 0,
    ram: phone.ram_gb || 0,
    storage: phone.storage_gb || 0,
    battery: phone.battery_capacity_numeric || 0,
    refreshRate: phone.refresh_rate_numeric || 0,
    hasOIS: !!phone.primary_camera_ois,
    hasWirelessCharging: !!phone.has_wireless_charging,
    hasIPRating: !!phone.ip_rating,
    has5G: !!phone.has_5g,
    overallScore: phone.overall_device_score || 0,
    chipset: phone.chipset?.toLowerCase() || '',
    year: phone.release_year || new Date().getFullYear()
  };

  // Price-based categorization (Bangladesh market - updated for 2025)
  if (price) {
    if (price < 18000) return 'entry-level';
    if (price < 30000) return 'budget';
    if (price < 45000) return 'mid-range';
    if (price < 80000) return 'premium';
    return 'flagship';
  }

  // Brand and model-based categorization (updated with more precise patterns)
  const flagshipIdentifiers = [
    'apple', 'iphone',
    'samsung galaxy s[0-9]', 'samsung galaxy note', 'samsung galaxy z', 'samsung galaxy ultra',
    'google pixel [6-9]', 'google pixel pro', 'pixel fold',
    'oneplus [8-9]', 'oneplus pro', 'oneplus open',
    'xiaomi mi', 'xiaomi 1[3-9]', 'xiaomi mix', 'xiaomi ultra',
    'pro max', 'fold', 'flip', 'edge+',
    'vivo x[7-9]', 'vivo x[1-9][0-9]', 'oppo find x'
  ];

  const premiumIdentifiers = [
    'oneplus [5-7]', 'oneplus nord',
    'sony xperia',
    'samsung galaxy a[7-9]', 'samsung galaxy s[0-9]e', 'samsung galaxy s[0-9] fe',
    'nothing phone',
    'motorola edge',
    'vivo x[1-6]', 'vivo v[2-9][0-9]',
    'oppo find', 'oppo reno [5-9]', 'oppo reno [1-9][0-9]',
    'xiaomi 1[0-2]t', 'xiaomi 1[0-2]', 'xiaomi civi',
    'poco f[3-9]', 'realme gt'
  ];

  const midrangeIdentifiers = [
    'samsung galaxy a[4-6]', 'samsung galaxy m[5-9]',
    'xiaomi note', 'redmi note [7-9]', 'redmi note 1[0-9]',
    'poco x[3-9]', 'poco f[1-2]',
    'realme [7-9]', 'realme 1[0-9]',
    'vivo v[1-2][0-9]', 'vivo t',
    'oppo f[7-9]', 'oppo f[1-9][0-9]', 'oppo reno [1-4]',
    'nokia x', 'motorola g[7-9]', 'motorola g[1-9][0-9]'
  ];

  const budgetIdentifiers = [
    'xiaomi redmi [7-9]', 'xiaomi redmi 1[0-9]',
    'redmi note [1-6]', 'redmi [1-9]',
    'realme [1-6]', 'realme c', 'realme narzo',
    'infinix hot', 'infinix note', 'infinix zero',
    'tecno spark', 'tecno camon', 'tecno pova',
    'symphony', 'itel', 'walton',
    'nokia g', 'nokia c',
    'samsung galaxy a[0-3]', 'samsung galaxy m[0-4]'
  ];

  // Check for specific model identifiers using regex patterns
  const matchesPattern = (patterns: string[], text: string) => {
    return patterns.some(pattern => {
      // Convert simple pattern to regex
      const regexPattern = pattern.replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
      return new RegExp(regexPattern, 'i').test(text);
    });
  };

  const fullName = `${brand} ${name}`;

  if (matchesPattern(flagshipIdentifiers, fullName)) return 'flagship';
  if (matchesPattern(premiumIdentifiers, fullName)) return 'premium';
  if (matchesPattern(midrangeIdentifiers, fullName)) return 'mid-range';
  if (matchesPattern(budgetIdentifiers, fullName)) return 'budget';

  // Chipset-based categorization
  const chipset = specs.chipset;
  if (chipset) {
    // Flagship chipsets
    if (chipset.includes('snapdragon 8') ||
      chipset.includes('dimensity 9') ||
      (chipset.includes('a1') && parseInt(chipset.match(/a1[0-9]/)?.[0].slice(2) || '0') >= 5) ||
      chipset.includes('exynos 2')) {
      return 'flagship';
    }

    // Premium chipsets
    if (chipset.includes('snapdragon 7') ||
      chipset.includes('dimensity 8') ||
      chipset.includes('snapdragon 870') ||
      chipset.includes('snapdragon 860') ||
      chipset.includes('exynos 1')) {
      return 'premium';
    }

    // Mid-range chipsets
    if (chipset.includes('snapdragon 6') ||
      chipset.includes('dimensity 7') ||
      chipset.includes('dimensity 6') ||
      chipset.includes('helio g9')) {
      return 'mid-range';
    }

    // Budget chipsets
    if (chipset.includes('snapdragon 4') ||
      chipset.includes('dimensity 6') ||
      chipset.includes('helio g8') ||
      chipset.includes('helio g7') ||
      chipset.includes('helio p')) {
      return 'budget';
    }
  }

  // Specs-based categorization as fallback (enhanced scoring system)
  let categoryScore = 0;

  // Premium features with weighted scoring
  if (specs.hasOIS) categoryScore += 2;
  if (specs.hasWirelessCharging) categoryScore += 2;
  if (specs.hasIPRating) categoryScore += (typeof specs.hasIPRating === 'string' && specs.hasIPRating === 'IP68') ? 2 : 1;
  if (specs.has5G) categoryScore += 1;

  // Display quality
  if (specs.refreshRate >= 144) categoryScore += 3;
  else if (specs.refreshRate >= 120) categoryScore += 2;
  else if (specs.refreshRate >= 90) categoryScore += 1;

  // Hardware specs with weighted scoring
  if (specs.ram >= 16) categoryScore += 4;
  else if (specs.ram >= 12) categoryScore += 3;
  else if (specs.ram >= 8) categoryScore += 2;
  else if (specs.ram >= 6) categoryScore += 1;

  if (specs.storage >= 512) categoryScore += 3;
  else if (specs.storage >= 256) categoryScore += 2;
  else if (specs.storage >= 128) categoryScore += 1;

  if (specs.camera >= 108) categoryScore += 3;
  else if (specs.camera >= 64) categoryScore += 2;
  else if (specs.camera >= 48) categoryScore += 1;

  if (specs.battery >= 6000) categoryScore += 2;
  else if (specs.battery >= 5000) categoryScore += 1;

  // Overall score if available (weighted more heavily)
  if (specs.overallScore >= 9) categoryScore += 4;
  else if (specs.overallScore >= 8) categoryScore += 3;
  else if (specs.overallScore >= 7) categoryScore += 2;
  else if (specs.overallScore >= 6) categoryScore += 1;

  // Release year adjustment (newer phones tend to have better features)
  const currentYear = new Date().getFullYear();
  if (specs.year === currentYear) categoryScore += 1;
  else if (specs.year === currentYear - 1) categoryScore += 0.5;

  // Determine category based on enhanced score
  if (categoryScore >= 12) return 'flagship';
  if (categoryScore >= 8) return 'premium';
  if (categoryScore >= 5) return 'mid-range';
  if (categoryScore >= 2) return 'budget';

  return 'entry-level'; // Default fallback
}

/**
 * Get competitive context for the phone based on its category
 * Provides market context for more accurate AI analysis
 */
function getCompetitorContext(phone: any, category: string): string {
  const price = phone.price_original;

  // Default context if no specific competitors can be determined
  let context = `This phone competes in the ${category} segment of the Bangladesh smartphone market.`;

  // Add price context if available
  if (price) {
    context += ` At ৳${price.toLocaleString()}, it should be evaluated against other ${category} phones in this price range.`;
  }

  // Category-specific competitor context
  switch (category) {
    case 'flagship':
      context += ` Main competitors include the latest iPhone models, Samsung Galaxy S series, Google Pixel Pro models, and other premium flagship devices. Users in this segment expect top-tier performance, camera quality, build materials, and cutting-edge features.`;
      break;
    case 'premium':
      context += ` Main competitors include Samsung Galaxy A7x series, older flagship models, OnePlus devices, Xiaomi's higher-end offerings, and similar premium mid-range phones. Users expect near-flagship experiences with perhaps a few compromises.`;
      break;
    case 'mid-range':
      context += ` Main competitors include Xiaomi Redmi Note series, Samsung Galaxy A5x series, Realme number series, Poco X series, and similar value-focused devices. Users expect good all-around performance and at least one standout feature at a reasonable price.`;
      break;
    case 'budget':
      context += ` Main competitors include Xiaomi Redmi series, Samsung Galaxy A1x/A2x/A3x series, Realme C series, Infinix and Tecno devices. Users prioritize reliability, battery life, and value while accepting compromises in performance and camera quality.`;
      break;
    case 'entry-level':
      context += ` Main competitors include basic Xiaomi, Realme, Infinix, Tecno, Symphony and Walton models. Users primarily need reliable basic functionality at the lowest possible price point.`;
      break;
  }

  // Brand-specific context
  const brand = phone.brand?.toLowerCase() || '';
  if (brand.includes('samsung')) {
    context += ` As a Samsung device, it typically offers good software support, OneUI features, and Samsung ecosystem integration, which should be considered in the evaluation.`;
  } else if (brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco')) {
    context += ` As a Xiaomi/Redmi/Poco device, it typically offers strong hardware specifications for the price but with MIUI software that some users find feature-rich while others consider bloated.`;
  } else if (brand.includes('apple') || brand.includes('iphone')) {
    context += ` As an Apple device, it offers iOS ecosystem integration, typically longer software support, and generally strong resale value, which should be factored into the value proposition.`;
  } else if (brand.includes('realme') || brand.includes('oppo') || brand.includes('vivo')) {
    context += ` As a ${brand} device, it competes primarily on feature set and design, with software experience that may include some bloatware but also useful features.`;
  }

  return context;
}

/**
 * Get photography usage context based on phone specs and category
 */
function getPhotoUsageContext(phone: any, category: string): string {
  const mainCamera = phone.main_camera || '';
  const cameraMP = phone.primary_camera_mp || 0;
  const hasOIS = !!phone.primary_camera_ois;
  const cameraScore = phone.camera_score || 0;

  // Check if main_camera string indicates a multi-camera setup
  const hasMultiCamera = mainCamera.includes('+') || (mainCamera.includes('MP') && mainCamera.match(/\d+\s*MP/g)?.length > 1);

  // Check if main_camera string indicates high resolution
  const hasHighResCamera = mainCamera.includes('108MP') || mainCamera.includes('64MP') || mainCamera.includes('50MP') ||
    mainCamera.includes('48MP') || (cameraMP >= 48);

  if (category === 'flagship' || category === 'premium') {
    if (cameraScore >= 8.5 || hasOIS || hasMultiCamera) {
      return "High-quality photography including low-light, portrait, and zoom scenarios";
    } else if (hasHighResCamera) {
      return "Detailed photography with good results in most lighting conditions";
    } else {
      return "Good everyday photography with some limitations in challenging conditions";
    }
  } else if (category === 'mid-range') {
    if (hasMultiCamera || hasHighResCamera || cameraScore >= 7.5) {
      return "Capable everyday photography with good results in daylight";
    } else {
      return "Basic photography suitable for social media and casual use";
    }
  } else {
    return "Basic photography primarily in good lighting conditions";
  }
}

/**
 * Get gaming usage context based on phone specs and category
 */
function getGamingUsageContext(phone: any, category: string): string {
  const performanceScore = phone.performance_score || 0;
  const refreshRate = phone.refresh_rate_numeric || 60;
  const ram = phone.ram_gb || 4;

  if (category === 'flagship') {
    return "High-end gaming including demanding titles at maximum settings";
  } else if (category === 'premium') {
    if (performanceScore >= 8 || (refreshRate >= 120 && ram >= 8)) {
      return "Capable of running most modern games at high settings";
    } else {
      return "Good gaming experience with some limitations on highest settings";
    }
  } else if (category === 'mid-range') {
    if (performanceScore >= 7 || ram >= 8) {
      return "Moderate gaming performance suitable for most popular titles at medium settings";
    } else {
      return "Basic gaming suitable for casual games and some popular titles at lower settings";
    }
  } else {
    return "Limited to casual gaming and less demanding titles";
  }
}

/**
 * Get multitasking context based on phone specs
 */
function getMultitaskingContext(phone: any): string {
  const ram = phone.ram_gb || 4;

  if (ram >= 12) {
    return "Excellent multitasking with ability to keep many apps in memory simultaneously";
  } else if (ram >= 8) {
    return "Good multitasking performance for everyday productivity and app switching";
  } else if (ram >= 6) {
    return "Adequate multitasking for typical usage patterns with occasional reloads";
  } else {
    return "Basic multitasking with frequent app reloads when switching between applications";
  }
}

/**
 * Get media consumption context based on phone specs
 */
function getMediaConsumptionContext(phone: any): string {
  const displayType = (phone.display_type || '').toLowerCase();
  const refreshRate = phone.refresh_rate_numeric || 60;
  const screenSize = phone.screen_size_numeric || 6;
  const displayScore = phone.display_score || 0;

  if ((displayType.includes('amoled') || displayType.includes('oled')) && refreshRate >= 120 && displayScore >= 8.5) {
    return "Premium viewing experience with vibrant colors, deep blacks, and smooth scrolling";
  } else if ((displayType.includes('amoled') || displayType.includes('oled')) || refreshRate >= 90 || displayScore >= 8) {
    return "Very good media experience with good color reproduction and smooth playback";
  } else if (screenSize >= 6.5) {
    return "Decent media consumption experience with large screen for comfortable viewing";
  } else {
    return "Basic media consumption suitable for casual video watching and social media";
  }
}

/**
 * Generate intelligent fallback pros/cons based on phone specifications
 * Used when AI generation fails or times out
 */
function generateIntelligentFallback(phone: any, category: string): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  // Camera analysis
  const mainCamera = phone.main_camera || '';
  const hasMultiCamera = mainCamera.includes('+') || (mainCamera.includes('MP') && mainCamera.match(/\d+\s*MP/g)?.length > 1);
  const hasHighResCamera = mainCamera.includes('108MP') || mainCamera.includes('64MP') || mainCamera.includes('50MP') || mainCamera.includes('48MP');

  if (phone.camera_score && phone.camera_score >= 8.5) {
    pros.push(`Exceptional ${phone.main_camera || (phone.primary_camera_mp ? `${phone.primary_camera_mp}MP` : 'high-resolution')} camera system delivers outstanding photo quality even in challenging lighting conditions`);
  } else if (phone.camera_score && phone.camera_score >= 7.5) {
    pros.push(`Excellent ${phone.main_camera || (phone.primary_camera_mp ? `${phone.primary_camera_mp}MP` : 'high-resolution')} camera captures detailed and vibrant photos for social media and everyday memories`);
  } else if (hasHighResCamera || (phone.primary_camera_mp && phone.primary_camera_mp >= 64)) {
    pros.push(`High-resolution ${phone.main_camera || `${phone.primary_camera_mp}MP main camera`} allows for detailed photography with good cropping flexibility`);
  } else if (hasMultiCamera || (phone.primary_camera_mp && phone.primary_camera_mp >= 48)) {
    pros.push(`Capable ${phone.main_camera || `${phone.primary_camera_mp}MP main camera`} delivers good photo quality in well-lit environments`);
  }

  if (phone.primary_camera_ois) {
    pros.push(`Optical image stabilization (OIS) ensures sharper photos and smoother videos even with shaky hands`);
  }

  // Battery analysis
  if (phone.battery_capacity_numeric && phone.battery_capacity_numeric >= 5000) {
    pros.push(`Large ${phone.battery_capacity_numeric}mAh battery provides excellent all-day usage even with heavy gaming and video streaming`);
  } else if (phone.battery_capacity_numeric && phone.battery_capacity_numeric >= 4500) {
    pros.push(`Robust ${phone.battery_capacity_numeric}mAh battery easily handles a full day of moderate to heavy usage without needing a recharge`);
  } else if (phone.battery_capacity_numeric && phone.battery_capacity_numeric >= 4000) {
    pros.push(`Decent ${phone.battery_capacity_numeric}mAh battery supports a full day of typical usage for most users`);
  }

  // Display analysis
  if (phone.display_score && phone.display_score >= 9) {
    pros.push(`Premium display with exceptional color accuracy, brightness, and contrast for an immersive viewing experience`);
  } else if (phone.display_score && phone.display_score >= 8) {
    pros.push(`High-quality ${phone.display_type || ''} display with excellent color reproduction and brightness for enjoyable media consumption`);
  }

  if (phone.refresh_rate_numeric && phone.refresh_rate_numeric >= 120) {
    pros.push(`Smooth ${phone.refresh_rate_numeric}Hz display delivers fluid scrolling, responsive gaming, and enhanced visual experience`);
  } else if (phone.refresh_rate_numeric && phone.refresh_rate_numeric >= 90) {
    pros.push(`Enhanced ${phone.refresh_rate_numeric}Hz refresh rate provides noticeably smoother scrolling and animations than standard displays`);
  }

  // Charging analysis
  if (phone.has_fast_charging && phone.charging_wattage && phone.charging_wattage >= 65) {
    pros.push(`Ultra-fast ${phone.charging_wattage}W charging technology gets you from low battery to full in just minutes, perfect for busy users`);
  } else if (phone.has_fast_charging && phone.charging_wattage && phone.charging_wattage >= 33) {
    pros.push(`Fast ${phone.charging_wattage}W charging support significantly reduces downtime between uses`);
  } else if (phone.has_fast_charging) {
    pros.push('Fast charging capability helps you quickly top up your battery when needed');
  }

  if (phone.has_wireless_charging) {
    pros.push('Convenient wireless charging support for cable-free power ups');
  }

  // Performance analysis
  if (phone.performance_score && phone.performance_score >= 9) {
    pros.push(`Top-tier performance handles demanding games and multitasking with exceptional speed and responsiveness`);
  } else if (phone.performance_score && phone.performance_score >= 8) {
    pros.push(`Strong performance capabilities ensure smooth operation for most apps and moderate gaming needs`);
  }

  if (phone.ram_gb && phone.ram_gb >= 12) {
    pros.push(`Generous ${phone.ram_gb}GB RAM provides outstanding multitasking capabilities and future-proofing`);
  } else if (phone.ram_gb && phone.ram_gb >= 8) {
    pros.push(`Ample ${phone.ram_gb}GB RAM ensures smooth multitasking and app switching without slowdowns`);
  } else if (phone.ram_gb && phone.ram_gb >= 6 && (category === 'budget' || category === 'entry-level')) {
    pros.push(`Good ${phone.ram_gb}GB RAM allocation for this price range, handling everyday tasks efficiently`);
  }

  // Storage analysis
  if (phone.storage_gb && phone.storage_gb >= 256) {
    pros.push(`Generous ${phone.storage_gb}GB storage provides plenty of space for apps, photos, videos, and games`);
  } else if (phone.storage_gb && phone.storage_gb >= 128) {
    pros.push(`Ample ${phone.storage_gb}GB storage space meets the needs of most users without frequent cleanup`);
  }

  if (phone.expandable_storage) {
    pros.push('Expandable storage option allows for easy and affordable memory upgrades when needed');
  }

  // Build quality and design
  if (phone.ip_rating && (phone.ip_rating.includes('68') || phone.ip_rating.includes('67'))) {
    pros.push(`${phone.ip_rating} water and dust resistance provides peace of mind for everyday accidents and outdoor use`);
  }

  if (phone.build && (phone.build.toLowerCase().includes('glass') || phone.build.toLowerCase().includes('metal') || phone.build.toLowerCase().includes('aluminum'))) {
    pros.push(`Premium ${phone.build} construction gives the device a high-quality look and feel`);
  }

  // Value proposition
  if (category === 'budget' || category === 'entry-level') {
    if (phone.price_original) {
      pros.push(`Excellent value for money at ৳${phone.price_original.toLocaleString()}, offering impressive features for the price point`);
    } else {
      pros.push(`Strong value proposition in the ${category} segment with a good balance of features and affordability`);
    }
  } else if (category === 'mid-range' && phone.overall_device_score && phone.overall_device_score >= 7.5) {
    pros.push(`Great price-to-performance ratio with flagship-like features at a more accessible price point`);
  }

  // CONS SECTION

  // Camera limitations
  if (phone.camera_score && phone.camera_score < 7 && (category !== 'entry-level' && category !== 'budget')) {
    cons.push(`Camera performance falls short of expectations for this price range, especially in challenging lighting conditions`);
  } else if (!phone.primary_camera_ois && (category === 'premium' || category === 'flagship')) {
    cons.push('Lacks optical image stabilization (OIS) which impacts low-light photography and video recording quality');
  }

  // Battery limitations
  if (phone.battery_capacity_numeric && phone.battery_capacity_numeric < 4000) {
    cons.push(`Relatively small ${phone.battery_capacity_numeric}mAh battery may require frequent charging with moderate to heavy use`);
  }

  if (!phone.has_fast_charging && (category !== 'entry-level')) {
    cons.push('Lacks fast charging capability, resulting in longer charging times compared to competitors');
  }

  // Missing premium features
  if (!phone.has_wireless_charging && (category === 'premium' || category === 'flagship')) {
    cons.push('No wireless charging support despite being in the premium segment where this feature is increasingly standard');
  }

  if (!phone.ip_rating && (category === 'premium' || category === 'flagship')) {
    cons.push('Lacks official water and dust resistance rating, a notable omission at this price point');
  } else if (!phone.ip_rating && category === 'mid-range' && phone.price_original && phone.price_original > 30000) {
    cons.push('No IP rating for water resistance, which many competitors offer in this price range');
  }

  // Performance limitations
  if (phone.ram_gb && phone.ram_gb < 6 && category !== 'entry-level') {
    cons.push(`Limited ${phone.ram_gb}GB RAM may cause performance issues with multitasking and more demanding applications`);
  }

  if (phone.storage_gb && phone.storage_gb < 128 && category !== 'entry-level' && category !== 'budget') {
    cons.push(`${phone.storage_gb}GB storage is relatively limited for this price range and may fill up quickly with apps, photos, and updates`);
  }

  if (!phone.expandable_storage && phone.storage_gb && phone.storage_gb <= 128) {
    cons.push('No expandable storage option limits future flexibility as app and media sizes continue to grow');
  }

  // Display limitations
  if (!phone.refresh_rate_numeric || phone.refresh_rate_numeric <= 60) {
    if (category === 'premium' || category === 'flagship') {
      cons.push('Standard 60Hz display lacks the smooth scrolling and responsiveness found in other premium devices');
    } else if (category === 'mid-range' && phone.price_original && phone.price_original > 25000) {
      cons.push('Basic 60Hz refresh rate while many competitors offer 90Hz or 120Hz displays at similar price points');
    }
  }

  // Software limitations
  if (phone.operating_system && phone.operating_system.includes('Android') &&
    phone.os_version && parseInt(phone.os_version.split(' ')[1]) < 12) {
    cons.push(`Older Android ${phone.os_version.split(' ')[1]} may not receive long-term updates and lacks newer features and security improvements`);
  }

  // Category-specific cons
  if (category === 'entry-level' || category === 'budget') {
    cons.push('Expected compromises in build quality and premium features due to the budget-focused positioning');
  }

  // Ensure minimum content
  if (pros.length === 0) {
    pros.push('Solid overall performance suitable for daily smartphone tasks and casual usage');
    if (phone.price_original) {
      pros.push(`Competitive pricing at ৳${phone.price_original.toLocaleString()} for the ${category} segment`);
    }
  }

  if (cons.length === 0) {
    if (category === 'premium' || category === 'flagship') {
      cons.push('High price point may not represent the best value compared to slightly lower-priced alternatives');
    } else {
      cons.push('May have some limitations compared to higher-end alternatives in camera quality and overall performance');
    }
  }

  return {
    pros: pros.slice(0, 5),
    cons: cons.slice(0, 4)
  };
}

/**
 * Enhanced helper for Pros/Cons with improved AI analysis
 * Includes better prompt engineering, phone category detection, and fallback logic
 */
export async function fetchGeminiProsCons(phone: any): Promise<{ pros: string[]; cons: string[] }> {
  // Enhanced phone category detection with contextual analysis
  const phoneCategory = determinePhoneCategory(phone);

  // Get competitor context based on category
  const competitorContext = getCompetitorContext(phone, phoneCategory);

  // Enhanced prompt with better context and structure for more detailed analysis in Bengali-English mix
  const prompt = `Analyze this smartphone and provide intelligent pros and cons based on real-world value and performance.

PHONE ANALYSIS REQUEST:
Name: ${phone.name || 'Unknown'}
Brand: ${phone.brand || 'Unknown'}
Price: ${phone.price_original ? `৳${phone.price_original.toLocaleString()}` : phone.price || 'N/A'}
Category: ${phoneCategory.toUpperCase()}
Market Context: Bangladesh smartphone market (2025)

KEY SPECIFICATIONS:
• Display: ${phone.screen_size_inches || (phone.screen_size_numeric ? `${phone.screen_size_numeric}"` : 'N/A')}${phone.display_resolution ? ` ${phone.display_resolution}` : ''}${phone.refresh_rate_hz || (phone.refresh_rate_numeric ? ` ${phone.refresh_rate_numeric}Hz` : '')}${phone.display_type ? ` ${phone.display_type}` : ''}
• Camera: ${phone.main_camera || (phone.primary_camera_mp ? `${phone.primary_camera_mp}MP main` : 'N/A')}${phone.front_camera ? ` + ${phone.front_camera} selfie` : (phone.selfie_camera_mp ? ` + ${phone.selfie_camera_mp}MP selfie` : '')}${phone.primary_camera_ois ? ` with OIS` : ''}${phone.camera_features ? ` (${phone.camera_features})` : ''}
• Performance: ${phone.chipset || 'N/A'}${phone.cpu ? ` (${phone.cpu})` : ''}${phone.gpu ? ` with ${phone.gpu}` : ''}
• Memory: ${phone.ram_gb ? `${phone.ram_gb}GB RAM` : phone.ram || 'N/A'} / ${phone.storage_gb ? `${phone.storage_gb}GB storage` : phone.internal_storage || 'N/A'}${phone.expandable_storage ? ` (expandable)` : ''}
• Battery: ${phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric}mAh` : phone.capacity || 'N/A'}${phone.has_fast_charging ? ` with ${phone.charging_wattage || 'fast'}W charging` : ''}${phone.has_wireless_charging ? ' + wireless charging' : ''}
• Build: ${phone.build || 'N/A'}${phone.ip_rating ? ` (${phone.ip_rating} rated)` : ''}${phone.weight ? ` ${phone.weight}` : ''}
• OS: ${phone.operating_system || 'N/A'}${phone.os_version ? ` ${phone.os_version}` : ''}
• Connectivity: ${phone.has_5g ? '5G, ' : ''}${phone.has_nfc ? 'NFC, ' : ''}WiFi ${phone.wifi_version || ''}, Bluetooth ${phone.bluetooth_version || ''}


COMPETITIVE CONTEXT:
${competitorContext}

USAGE SCENARIOS TO CONSIDER:
• Photography: ${getPhotoUsageContext(phone, phoneCategory)}
• Gaming: ${getGamingUsageContext(phone, phoneCategory)}
• Multitasking: ${getMultitaskingContext(phone)}
• Media consumption: ${getMediaConsumptionContext(phone)}
• Daily productivity: Email, documents, web browsing
• Social media usage: Instagram, TikTok, Facebook
• Battery life for typical daily usage patterns

LANGUAGE AND FORMAT REQUIREMENTS:
CRITICAL: You MUST write in a mix of Bengali (Bangla) and English. Follow these rules EXACTLY:
1. Feature/spec names MUST be in ENGLISH (e.g., "Battery", "Display", "Camera", "Performance")
2. Descriptions and explanations MUST be in BENGALI (Bangla)
3. Use Bengali words like: থাকার কারণে, দেয়, পাওয়া যায়, হওয়ায়, তুলনায়, নাও হতে পারে, ইউজারদের জন্য, ব্যবহার, পারফরম্যান্স
4. Keep technical terms in English: Snapdragon, Fast Charging, Refresh Rate, Resolution, OIS, etc.
5. Each point should start with the English feature name (e.g., "Battery", "Display", "Camera")

ANALYSIS GUIDELINES:
1. Focus on VALUE FOR MONEY in the ${phoneCategory.toUpperCase()} segment (Bangladesh market context)
2. Compare against typical expectations for ${phoneCategory.toUpperCase()} phones in this price range
3. Consider real-world usage scenarios rather than just specifications
4. Mention standout features that justify or exceed the price point
5. Identify genuine weaknesses that users should know about before purchasing
6. Consider the local market context and user preferences in Bangladesh
7. Keep each point DETAILED but readable (1-2 sentences maximum)
8. Prioritize points that would matter most to actual users making a purchase decision

REQUIRED OUTPUT FORMAT (JSON only, no markdown or code blocks):
{
  "pros": [
    "Battery: 7000mAh বিশাল Battery এবং 45W Fast Charging থাকার কারণে একবার চার্জে দীর্ঘ সময় ব্যবহার করা যাবে। বাংলাদেশের ইউজারদের জন্য এটি খুবই উপযোগী।",
    "Performance: Snapdragon 685 চিপসেট দৈনন্দিন ব্যবহার যেমন Facebook, YouTube, Browsing এবং মাঝারি গেমিংয়ের জন্য স্মুথ পারফরম্যান্স দেয়।",
    "Display: 120Hz Refresh Rate থাকার কারণে স্ক্রলিং ও ভিডিও দেখা অনেক বেশি স্মুথ লাগে।"
  ],
  "cons": [
    "Display: HD+ Resolution (720×1570) হওয়ায় Display-এর শার্পনেস কিছুটা কম। এই দামের অনেক ফোনেই এখন FHD+ Resolution পাওয়া যায়।",
    "Camera: লো-লাইট কন্ডিশনে Camera-র পারফরম্যান্স আশানুরূপ নাও হতে পারে।"
  ]
}

Provide 3-5 pros and 2-4 cons in Bengali-English mix format. Each point MUST start with English feature name followed by Bengali description.`;

  try {
    const text = await fetchGeminiSummary(prompt);

    // Enhanced JSON parsing with multiple fallback attempts
    let parsedResult = null;

    // Attempt 1: Direct JSON parsing
    try {
      parsedResult = JSON.parse(text);
    } catch (e) {
    }

    // Attempt 2: Clean up common formatting issues
    if (!parsedResult) {
      try {
        const cleanedText = text
          .replace(/```json\n?|\n?```/g, "") // Remove code blocks
          .replace(/```\n?|\n?```/g, "")     // Remove any other code blocks
          .replace(/^\s*[\r\n]/gm, "")       // Remove empty lines
          .trim();
        parsedResult = JSON.parse(cleanedText);
      } catch (e) {
      }
    }

    // Attempt 3: Extract JSON from mixed content
    if (!parsedResult) {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
      }
    }

    // Attempt 4: Advanced extraction for malformed JSON
    if (!parsedResult) {
      try {
        // Look for pros and cons arrays in malformed JSON
        const prosMatch = text.match(/"pros"\s*:\s*\[([\s\S]*?)\]/);
        const consMatch = text.match(/"cons"\s*:\s*\[([\s\S]*?)\]/);

        if (prosMatch && consMatch) {
          // Extract and clean up array items
          const extractProsConsItems = (match: string) => {
            return match
              .split(/",\s*"/)
              .map(item => item.replace(/^"/, '').replace(/"$/, '').trim())
              .filter(item => item.length > 0);
          };

          const pros = extractProsConsItems(prosMatch[1]);
          const cons = extractProsConsItems(consMatch[1]);

          if (pros.length > 0 && cons.length > 0) {
            parsedResult = { pros, cons };
          }
        }
      } catch (e) {
      }
    }

    // Attempt 5: Try to extract structured content from unstructured text
    if (!parsedResult) {
      try {
        const prosMatch = text.match(/(?:pros?|advantages?|positives?|strengths?)[\s:]*\n?([\s\S]*?)(?:\n\s*(?:cons?|disadvantages?|negatives?|weaknesses?)|$)/i);
        const consMatch = text.match(/(?:cons?|disadvantages?|negatives?|weaknesses?)[\s:]*\n?([\s\S]*?)$/i);

        const extractedPros = prosMatch?.[1]
          ?.split(/\n|•|-|\*|\d+\./)
          .map(s => s.trim())
          .filter(s => s.length > 15 && !s.match(/^(pros?|cons?|advantages?|disadvantages?)/i))
          .slice(0, 5) || [];

        const extractedCons = consMatch?.[1]
          ?.split(/\n|•|-|\*|\d+\./)
          .map(s => s.trim())
          .filter(s => s.length > 15 && !s.match(/^(pros?|cons?|advantages?|disadvantages?)/i))
          .slice(0, 4) || [];

        if (extractedPros.length > 0 && extractedCons.length > 0) {
          parsedResult = { pros: extractedPros, cons: extractedCons };
        }
      } catch (e) {
      }
    }

    // Validate and return parsed result
    if (parsedResult && parsedResult.pros && parsedResult.cons &&
      Array.isArray(parsedResult.pros) && Array.isArray(parsedResult.cons)) {

      // Filter and validate content quality
      const validPros = parsedResult.pros
        .filter((pro: string) => typeof pro === 'string' && pro.trim().length > 15)
        .map((pro: string) => pro.trim().replace(/^[•\-*]\s*/, '')) // Remove bullet points if present
        .slice(0, 5);

      const validCons = parsedResult.cons
        .filter((con: string) => typeof con === 'string' && con.trim().length > 15)
        .map((con: string) => con.trim().replace(/^[•\-*]\s*/, '')) // Remove bullet points if present
        .slice(0, 4);

      if (validPros.length >= 2 && validCons.length >= 1) {
        return { pros: validPros, cons: validCons };
      }
    }

    // If we reach here, all parsing attempts failed
    throw new Error("Failed to parse AI response into valid pros/cons format");

  } catch (error) {
    // Enhanced intelligent fallback with retry mechanism
    try {
      // Try a simpler prompt as fallback

      const simplifiedPrompt = `Analyze this smartphone and list its pros and cons:
      
Name: ${phone.name || 'Unknown'}
Brand: ${phone.brand || 'Unknown'}
Price: ${phone.price_original ? `৳${phone.price_original.toLocaleString()}` : 'N/A'}
Display: ${phone.screen_size_inches || (phone.screen_size_numeric ? `${phone.screen_size_numeric}"` : 'N/A')} ${phone.refresh_rate_hz || (phone.refresh_rate_numeric ? `${phone.refresh_rate_numeric}Hz` : '')} ${phone.display_type || ''}
Camera: ${phone.main_camera || (phone.primary_camera_mp ? `${phone.primary_camera_mp}MP` : 'N/A')} / ${phone.front_camera || (phone.selfie_camera_mp ? `${phone.selfie_camera_mp}MP` : 'N/A')}
Performance: ${phone.chipset || 'N/A'}
Memory: ${phone.ram_gb ? `${phone.ram_gb}GB RAM` : phone.ram || 'N/A'} / ${phone.storage_gb ? `${phone.storage_gb}GB storage` : phone.internal_storage || 'N/A'}
Battery: ${phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric}mAh` : phone.capacity || 'N/A'}

Format your response as JSON with "pros" and "cons" arrays.`;

      try {
        const simplifiedText = await fetchGeminiSummary(simplifiedPrompt);

        // Try to parse the simplified response
        try {
          const simplifiedResult = JSON.parse(simplifiedText);
          if (simplifiedResult && simplifiedResult.pros && simplifiedResult.cons &&
            Array.isArray(simplifiedResult.pros) && Array.isArray(simplifiedResult.cons) &&
            simplifiedResult.pros.length >= 2 && simplifiedResult.cons.length >= 1) {

            return {
              pros: simplifiedResult.pros.slice(0, 5),
              cons: simplifiedResult.cons.slice(0, 4)
            };
          }
        } catch (e) {
        }
      } catch (e) {
      }

      // If all AI attempts fail, use our intelligent fallback
      return generateIntelligentFallback(phone, phoneCategory);

    } catch (fallbackError) {
      // Ultimate fallback with minimal generic content
      return {
        pros: [
          `${phone.ram_gb ? `${phone.ram_gb}GB RAM` : 'Sufficient memory'} for everyday tasks and applications`,
          `${phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric}mAh battery` : 'Battery'} provides adequate power for daily use`,
          `${phone.primary_camera_mp ? `${phone.primary_camera_mp}MP camera` : 'Camera system'} captures decent photos in good lighting conditions`
        ],
        cons: [
          "May have limitations compared to higher-priced alternatives",
          "Some features may not match competitors in the same price range"
        ]
      };
    }
  }
}
/*** RAG-enhanced Gemini summary generation
 * Uses RAG pipeline when available, falls back to direct Gemini API
 */
export async function fetchRAGEnhancedSummary(
  prompt: string,
  conversationHistory?: Array<{ type: 'user' | 'assistant'; content: string }>,
  sessionId?: string
): Promise<string> {
  try {
    // First try RAG pipeline
    const ragRequest: ChatQueryRequest = {
      query: prompt,
      conversation_history: conversationHistory,
      session_id: sessionId
    };

    const ragResponse = await chatAPIService.sendChatQuery(ragRequest);

    // Extract text from RAG response
    if (ragResponse.content.text) {
      return ragResponse.content.text;
    }

    // If RAG returns structured data, format it as text
    if (ragResponse.response_type === 'recommendations' && ragResponse.content.phones) {
      const phoneNames = ragResponse.content.phones.slice(0, 3).map(p => p.name).join(', ');
      return `${ragResponse.content.text || 'Here are some great phone recommendations:'} ${phoneNames}`;
    }

    if (ragResponse.response_type === 'comparison' && ragResponse.content.comparison_data) {
      const phoneNames = ragResponse.content.comparison_data.phones.map(p => p.name).join(' vs ');
      return `${ragResponse.content.text || 'Here\'s a comparison:'} ${phoneNames}. ${ragResponse.content.comparison_data.summary}`;
    }

    // Fallback to original Gemini API
    console.log('RAG response not suitable for summary, falling back to direct Gemini API');
    return await fetchGeminiSummary(prompt);

  } catch (error) {
    console.warn('RAG pipeline failed, falling back to direct Gemini API:', error);
    return await fetchGeminiSummary(prompt);
  }
}

/**
 * RAG-enhanced phone analysis with contextual understanding
 */
export async function fetchRAGPhoneAnalysis(
  phone: any,
  analysisType: 'pros_cons' | 'summary' | 'comparison' = 'pros_cons',
  context?: string
): Promise<{ pros: string[]; cons: string[] } | string> {
  try {
    let query = '';

    if (analysisType === 'pros_cons') {
      query = `Analyze the ${phone.name} smartphone and provide detailed pros and cons. Consider its price of ৳${phone.price_original?.toLocaleString() || 'N/A'}, specifications, and value proposition in the Bangladesh market.`;
    } else if (analysisType === 'summary') {
      query = `Provide a comprehensive summary of the ${phone.name} smartphone, including its key features, performance, and overall value proposition.`;
    } else if (analysisType === 'comparison') {
      query = `Compare the ${phone.name} with similar phones in its price range and category. What makes it stand out or fall behind?`;
    }

    if (context) {
      query += ` Additional context: ${context}`;
    }

    const ragRequest: ChatQueryRequest = {
      query,
      conversation_history: [],
      session_id: `analysis-${Date.now()}`
    };

    const ragResponse = await chatAPIService.sendRAGQuery(ragRequest);

    if (ragResponse.content.text) {
      if (analysisType === 'pros_cons') {
        // Try to parse pros/cons from text response
        const text = ragResponse.content.text;
        const prosMatch = text.match(/(?:pros?|advantages?|positives?):\s*([\s\S]*?)(?=(?:cons?|disadvantages?|negatives?|limitations?):|$)/i);
        const consMatch = text.match(/(?:cons?|disadvantages?|negatives?|limitations?):\s*([\s\S]*)$/i);


        if (prosMatch && consMatch) {
          const pros = prosMatch[1].split(/[•\-\n]/).filter(p => p.trim()).map(p => p.trim());
          const cons = consMatch[1].split(/[•\-\n]/).filter(c => c.trim()).map(c => c.trim());
          return { pros: pros.slice(0, 5), cons: cons.slice(0, 4) };
        }

        // Fallback to original pros/cons generation
        return await fetchGeminiProsCons(phone);
      }

      return ragResponse.content.text;
    }

    // Fallback to original methods
    if (analysisType === 'pros_cons') {
      return await fetchGeminiProsCons(phone);
    } else {
      const phoneCategory = determinePhoneCategory(phone);
      const prompt = `Provide a ${analysisType} for the ${phone.name} smartphone in the ${phoneCategory} category.`;
      return await fetchGeminiSummary(prompt);
    }

  } catch (error) {
    console.warn('RAG phone analysis failed, falling back to original methods:', error);

    if (analysisType === 'pros_cons') {
      return await fetchGeminiProsCons(phone);
    } else {
      const phoneCategory = determinePhoneCategory(phone);
      const prompt = `Provide a ${analysisType} for the ${phone.name} smartphone.`;
      return await fetchGeminiSummary(prompt);
    }
  }
}

/**
 * Test RAG integration and return status
 */
export async function testRAGIntegration(): Promise<{
  ragAvailable: boolean;
  geminiAvailable: boolean;
  recommendedMode: 'rag' | 'gemini' | 'fallback';
}> {
  try {
    // Test RAG integration
    const ragTest = await chatAPIService.testRAGIntegration('test query for integration check');
    const ragAvailable = ragTest.rag_integration === 'working';

    // Test direct Gemini API
    let geminiAvailable = false;
    try {
      await fetchGeminiSummary('test');
      geminiAvailable = true;
    } catch {
      geminiAvailable = false;
    }

    // Determine recommended mode
    let recommendedMode: 'rag' | 'gemini' | 'fallback' = 'fallback';
    if (ragAvailable) {
      recommendedMode = 'rag';
    } else if (geminiAvailable) {
      recommendedMode = 'gemini';
    }

    return {
      ragAvailable,
      geminiAvailable,
      recommendedMode
    };

  } catch (error) {
    console.error('Failed to test integrations:', error);
    return {
      ragAvailable: false,
      geminiAvailable: false,
      recommendedMode: 'fallback'
    };
  }
}