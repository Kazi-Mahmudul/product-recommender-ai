class LocalFallbackParser {
  constructor() {
    // Common phone brands for detection
    this.phoneBrands = [
      'samsung', 'apple', 'iphone', 'xiaomi', 'redmi', 'poco', 'oneplus', 'oppo', 'vivo', 
      'realme', 'huawei', 'honor', 'google', 'pixel', 'motorola', 'nokia', 'sony', 
      'lg', 'asus', 'rog', 'nothing', 'fairphone', 'tcl', 'infinix', 'tecno'
    ];

    // Feature keywords for different categories
    this.featureKeywords = {
      camera: [
        'camera', 'photo', 'photography', 'selfie', 'portrait', 'zoom', 'lens', 
        'megapixel', 'mp', 'video', 'recording', 'night mode', 'ultra wide', 
        'telephoto', 'macro', 'depth', 'bokeh', 'stabilization', 'ois'
      ],
      battery: [
        'battery', 'mah', 'charging', 'fast charging', 'wireless charging', 
        'power', 'endurance', 'long lasting', 'quick charge', 'turbo charge',
        'super charge', 'dash charge', 'warp charge', 'reverse charging'
      ],
      performance: [
        'performance', 'gaming', 'processor', 'chipset', 'snapdragon', 'mediatek',
        'dimensity', 'exynos', 'bionic', 'tensor', 'ram', 'storage', 'speed',
        'fast', 'smooth', 'lag free', 'multitasking', 'benchmark', 'antutu'
      ],
      display: [
        'display', 'screen', 'amoled', 'oled', 'lcd', 'refresh rate', '120hz', '90hz',
        'brightness', 'hdr', 'resolution', '4k', 'fhd', 'qhd', 'retina', 'gorilla glass',
        'punch hole', 'notch', 'bezel', 'curved', 'flat'
      ],
      connectivity: [
        '5g', '4g', 'lte', 'wifi', 'bluetooth', 'nfc', 'gps', 'dual sim', 
        'esim', 'network', 'connectivity', 'hotspot'
      ],
      design: [
        'design', 'build', 'premium', 'metal', 'glass', 'plastic', 'waterproof',
        'ip rating', 'ip67', 'ip68', 'color', 'colours', 'thin', 'lightweight',
        'compact', 'large', 'small'
      ]
    };

    // Price categories
    this.priceCategories = {
      budget: { min: 0, max: 15000, keywords: ['budget', 'cheap', 'affordable', 'low cost', 'entry level'] },
      mid_range: { min: 15000, max: 40000, keywords: ['mid range', 'middle', 'moderate', 'decent'] },
      premium: { min: 40000, max: 80000, keywords: ['premium', 'high end', 'flagship', 'expensive'] },
      ultra_premium: { min: 80000, max: 200000, keywords: ['ultra premium', 'luxury', 'top tier', 'ultimate'] }
    };

    console.log(`[${new Date().toISOString()}] 🔧 LocalFallbackParser initialized with ${this.phoneBrands.length} brands and ${Object.keys(this.featureKeywords).length} feature categories`);
  }

  async parseQuery(query) {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 LocalFallbackParser processing query: "${query}"`);
      
      const normalizedQuery = query.toLowerCase().trim();
      
      // Extract different components
      const priceRange = this.extractPriceRange(normalizedQuery);
      const brands = this.extractBrandNames(normalizedQuery);
      const features = this.extractFeatureKeywords(normalizedQuery);
      const priceCategory = this.extractPriceCategory(normalizedQuery);
      
      // Build recommendation filters
      const filters = this.buildRecommendationFilters({
        priceRange,
        brands,
        features,
        priceCategory,
        originalQuery: query
      });

      console.log(`[${new Date().toISOString()}] ✅ LocalFallbackParser extracted filters:`, JSON.stringify(filters, null, 2));

      return {
        type: "recommendation",
        filters: filters,
        source: "local_fallback",
        confidence: this.calculateConfidence(priceRange, brands, features, priceCategory)
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ LocalFallbackParser error:`, error.message);
      
      // Return a basic fallback response
      return {
        type: "recommendation",
        filters: { limit: 10 },
        source: "local_fallback",
        confidence: 0.1,
        error: error.message
      };
    }
  }

  extractPriceRange(query) {
    let minPrice = null;
    let maxPrice = null;
    let foundExplicitRange = false;

    // First, check for explicit range patterns
    const rangePattern = /(?:between\s*)?(\d+(?:,\d+)*(?:\s*k|\s*thousand)?)\s*(?:to|-|and)\s*(\d+(?:,\d+)*(?:\s*k|\s*thousand)?)/gi;
    let rangeMatch = rangePattern.exec(query);
    if (rangeMatch) {
      const price1 = this.normalizePrice(rangeMatch[1]);
      const price2 = this.normalizePrice(rangeMatch[2]);
      minPrice = Math.min(price1, price2);
      maxPrice = Math.max(price1, price2);
      foundExplicitRange = true;
    }

    // If no explicit range, check for directional patterns
    if (!foundExplicitRange) {
      // "under 20000", "below 30000", "less than 25000"
      const underPattern = /(?:under|below|less than|within|up to)\s*(\d+(?:,\d+)*(?:\s*k|\s*thousand)?)/gi;
      let underMatch = underPattern.exec(query);
      if (underMatch) {
        maxPrice = this.normalizePrice(underMatch[1]);
      }

      // "above 15000", "over 20000", "more than 25000"
      const overPattern = /(?:above|over|more than)\s*(\d+(?:,\d+)*(?:\s*k|\s*thousand)?)/gi;
      let overMatch = overPattern.exec(query);
      if (overMatch) {
        minPrice = this.normalizePrice(overMatch[1]);
      }

      // "around 25000", "about 30000"
      const aroundPattern = /(?:around|about|approximately)\s*(\d+(?:,\d+)*(?:\s*k|\s*thousand)?)/gi;
      let aroundMatch = aroundPattern.exec(query);
      if (aroundMatch && !maxPrice && !minPrice) {
        const price = this.normalizePrice(aroundMatch[1]);
        const tolerance = price * 0.2; // 20% tolerance
        minPrice = Math.max(0, price - tolerance);
        maxPrice = price + tolerance;
      }

      // "25000 budget", "30k price"
      const budgetPattern = /(\d+(?:,\d+)*(?:\s*k|\s*thousand)?)\s*(?:budget|price|range|taka|tk|bdt)/gi;
      let budgetMatch = budgetPattern.exec(query);
      if (budgetMatch && !maxPrice && !minPrice) {
        maxPrice = this.normalizePrice(budgetMatch[1]);
      }

      // Just numbers with currency indicators
      const currencyPattern = /(\d+(?:,\d+)*)\s*(?:taka|tk|bdt|rupees?|rs)/gi;
      let currencyMatch = currencyPattern.exec(query);
      if (currencyMatch && !maxPrice && !minPrice) {
        const price = this.normalizePrice(currencyMatch[1]);
        // Assume it's a budget limit
        maxPrice = price;
      }
    }

    const result = {};
    if (minPrice !== null) result.min_price = Math.round(minPrice);
    if (maxPrice !== null) result.max_price = Math.round(maxPrice);

    if (Object.keys(result).length > 0) {
      console.log(`[${new Date().toISOString()}] 💰 Extracted price range:`, result);
    }

    return result;
  }

  normalizePrice(priceStr) {
    // Remove commas and convert k/thousand to actual numbers
    let price = priceStr.replace(/,/g, '').trim();
    
    if (price.toLowerCase().includes('k') || price.toLowerCase().includes('thousand')) {
      price = price.replace(/\s*k\s*|\s*thousand\s*/gi, '');
      return parseFloat(price) * 1000;
    }
    
    return parseFloat(price);
  }

  extractBrandNames(query) {
    const foundBrands = [];
    
    for (const brand of this.phoneBrands) {
      const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
      if (brandRegex.test(query)) {
        // Normalize brand name
        let normalizedBrand = brand.toLowerCase();
        
        // Handle special cases
        if (normalizedBrand === 'iphone') normalizedBrand = 'apple';
        if (normalizedBrand === 'redmi' || normalizedBrand === 'poco') normalizedBrand = 'xiaomi';
        if (normalizedBrand === 'pixel') normalizedBrand = 'google';
        if (normalizedBrand === 'rog') normalizedBrand = 'asus';
        
        // Capitalize first letter for consistency
        normalizedBrand = normalizedBrand.charAt(0).toUpperCase() + normalizedBrand.slice(1);
        
        if (!foundBrands.includes(normalizedBrand)) {
          foundBrands.push(normalizedBrand);
        }
      }
    }

    if (foundBrands.length > 0) {
      console.log(`[${new Date().toISOString()}] 🏷️ Extracted brands:`, foundBrands);
    }

    return foundBrands;
  }

  extractFeatureKeywords(query) {
    const foundFeatures = {};
    
    for (const [category, keywords] of Object.entries(this.featureKeywords)) {
      const matchedKeywords = [];
      
      for (const keyword of keywords) {
        const keywordRegex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        if (keywordRegex.test(query)) {
          matchedKeywords.push(keyword);
        }
      }
      
      if (matchedKeywords.length > 0) {
        foundFeatures[category] = matchedKeywords;
      }
    }

    if (Object.keys(foundFeatures).length > 0) {
      console.log(`[${new Date().toISOString()}] 🎯 Extracted features:`, foundFeatures);
    }

    return foundFeatures;
  }

  extractPriceCategory(query) {
    // Check categories in order of specificity (most specific first)
    const orderedCategories = ['ultra_premium', 'premium', 'mid_range', 'budget'];
    
    for (const category of orderedCategories) {
      const config = this.priceCategories[category];
      for (const keyword of config.keywords) {
        const keywordRegex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        if (keywordRegex.test(query)) {
          console.log(`[${new Date().toISOString()}] 📊 Extracted price category: ${category}`);
          return category;
        }
      }
    }
    return null;
  }

  buildRecommendationFilters(extractedData) {
    const { priceRange, brands, features, priceCategory, originalQuery } = extractedData;
    const filters = {};

    // Add price filters
    if (priceRange.min_price !== undefined) {
      filters.min_price = priceRange.min_price;
    }
    if (priceRange.max_price !== undefined) {
      filters.max_price = priceRange.max_price;
    }

    // Add price category if no specific price range
    if (filters.min_price === undefined && filters.max_price === undefined && priceCategory) {
      const categoryConfig = this.priceCategories[priceCategory];
      filters.min_price = categoryConfig.min;
      if (categoryConfig.max < 200000) filters.max_price = categoryConfig.max;
      filters.price_category = priceCategory;
    }

    // Add brand filter (use first brand if multiple)
    if (brands.length > 0) {
      filters.brand = brands[0];
    }

    // Add feature-based filters
    if (features.camera && features.camera.length > 0) {
      filters.min_camera_score = 7.0; // Good camera threshold
    }

    if (features.battery && features.battery.length > 0) {
      filters.min_battery_score = 7.0; // Good battery threshold
      // Look for specific battery capacity mentions
      const batteryMatch = originalQuery.match(/(\d+)\s*mah/i);
      if (batteryMatch) {
        filters.min_battery_capacity_numeric = parseInt(batteryMatch[1]);
      }
    }

    if (features.performance && features.performance.length > 0) {
      filters.min_performance_score = 7.0; // Good performance threshold
      // Look for RAM mentions
      const ramMatch = originalQuery.match(/(\d+)\s*gb\s*ram/i);
      if (ramMatch) {
        filters.min_ram_gb = parseInt(ramMatch[1]);
      }
    }

    if (features.display && features.display.length > 0) {
      filters.min_display_score = 7.0; // Good display threshold
      // Look for refresh rate mentions
      const refreshMatch = originalQuery.match(/(\d+)\s*hz/i);
      if (refreshMatch) {
        filters.min_refresh_rate_numeric = parseInt(refreshMatch[1]);
      }
    }

    if (features.connectivity && features.connectivity.length > 0) {
      filters.min_connectivity_score = 7.0;
      // Check for 5G mentions
      if (originalQuery.toLowerCase().includes('5g')) {
        // In a real implementation, you'd have a 5G field
        filters.min_connectivity_score = 8.0;
      }
    }

    // Look for specific feature requirements
    if (originalQuery.toLowerCase().includes('wireless charging')) {
      filters.has_wireless_charging = true;
    }

    if (originalQuery.toLowerCase().includes('fast charging')) {
      filters.has_fast_charging = true;
    }

    // Look for storage mentions
    const storageMatch = originalQuery.match(/(\d+)\s*gb\s*(?:storage|memory)/i);
    if (storageMatch) {
      filters.min_storage_gb = parseInt(storageMatch[1]);
    }

    // Set default limit
    filters.limit = 10;

    // Look for general quality indicators regardless of other filters
    if (originalQuery.toLowerCase().includes('best') || 
        originalQuery.toLowerCase().includes('good') ||
        originalQuery.toLowerCase().includes('recommend')) {
      filters.min_overall_device_score = 7.0;
    }

    // If no specific filters were found, provide some defaults
    if (Object.keys(filters).length === 1) { // Only limit is set
      // If still no filters, set a reasonable price range
      filters.max_price = 50000; // Default reasonable upper limit
    }

    return filters;
  }

  calculateConfidence(priceRange, brands, features, priceCategory) {
    let confidence = 0.3; // Base confidence for fallback parser

    // Increase confidence based on extracted information
    if (Object.keys(priceRange).length > 0) confidence += 0.3;
    if (brands.length > 0) confidence += 0.2;
    if (Object.keys(features).length > 0) confidence += 0.1 * Object.keys(features).length;
    if (priceCategory) confidence += 0.1;

    // Cap at 0.8 since this is a fallback parser
    return Math.min(confidence, 0.8);
  }

  // Helper method to get feature suggestions based on query
  getFeatureSuggestions(query) {
    const features = this.extractFeatureKeywords(query.toLowerCase());
    const suggestions = [];

    if (features.camera) {
      suggestions.push("Consider phones with high camera scores for better photography");
    }
    if (features.battery) {
      suggestions.push("Look for phones with good battery life and fast charging");
    }
    if (features.performance) {
      suggestions.push("Gaming phones or flagship devices might suit your performance needs");
    }
    if (features.display) {
      suggestions.push("AMOLED displays with high refresh rates provide better visual experience");
    }

    return suggestions;
  }

  // Method to validate and sanitize filters
  validateFilters(filters) {
    const validatedFilters = { ...filters };

    // Ensure price ranges are reasonable
    if (validatedFilters.min_price && validatedFilters.min_price < 0) {
      validatedFilters.min_price = 0;
    }
    if (validatedFilters.max_price && validatedFilters.max_price > 200000) {
      validatedFilters.max_price = 200000;
    }
    if (validatedFilters.min_price && validatedFilters.max_price && 
        validatedFilters.min_price > validatedFilters.max_price) {
      // Swap if min > max
      [validatedFilters.min_price, validatedFilters.max_price] = 
      [validatedFilters.max_price, validatedFilters.min_price];
    }

    // Ensure score ranges are valid (0-10)
    const scoreFields = [
      'min_camera_score', 'max_camera_score', 'min_battery_score', 'max_battery_score',
      'min_performance_score', 'max_performance_score', 'min_display_score', 'max_display_score',
      'min_connectivity_score', 'max_connectivity_score', 'min_overall_device_score', 'max_overall_device_score'
    ];

    for (const field of scoreFields) {
      if (validatedFilters[field] !== undefined) {
        validatedFilters[field] = Math.max(0, Math.min(10, validatedFilters[field]));
      }
    }

    // Ensure limit is reasonable
    if (validatedFilters.limit && (validatedFilters.limit < 1 || validatedFilters.limit > 50)) {
      validatedFilters.limit = 10;
    }

    return validatedFilters;
  }
}

module.exports = LocalFallbackParser;