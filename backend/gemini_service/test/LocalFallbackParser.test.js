const LocalFallbackParser = require('../parsers/LocalFallbackParser');

describe('LocalFallbackParser', () => {
  let parser;

  beforeEach(() => {
    parser = new LocalFallbackParser();
  });

  describe('constructor', () => {
    test('should initialize with phone brands and feature keywords', () => {
      expect(parser.phoneBrands).toContain('samsung');
      expect(parser.phoneBrands).toContain('apple');
      expect(parser.featureKeywords.camera).toContain('camera');
      expect(parser.featureKeywords.battery).toContain('battery');
    });
  });

  describe('extractPriceRange', () => {
    test('should extract "under" price patterns', () => {
      const result = parser.extractPriceRange('phones under 20000');
      expect(result.max_price).toBe(20000);
      expect(result.min_price).toBeUndefined();
    });

    test('should extract price ranges', () => {
      const result = parser.extractPriceRange('phones between 15000 and 25000');
      expect(result.min_price).toBe(15000);
      expect(result.max_price).toBe(25000);
    });

    test('should extract "around" prices with tolerance', () => {
      const result = parser.extractPriceRange('phones around 20000');
      expect(result.min_price).toBe(16000); // 20000 - 20%
      expect(result.max_price).toBe(24000); // 20000 + 20%
    });

    test('should handle k notation', () => {
      const result = parser.extractPriceRange('phones under 20k');
      expect(result.max_price).toBe(20000);
    });

    test('should handle thousand notation', () => {
      const result = parser.extractPriceRange('phones under 20 thousand');
      expect(result.max_price).toBe(20000);
    });

    test('should handle currency indicators', () => {
      const result = parser.extractPriceRange('phones under 20000 taka');
      expect(result.max_price).toBe(20000);
    });

    test('should return empty object for no price mentions', () => {
      const result = parser.extractPriceRange('good camera phones');
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('normalizePrice', () => {
    test('should handle k notation', () => {
      expect(parser.normalizePrice('20k')).toBe(20000);
      expect(parser.normalizePrice('15K')).toBe(15000);
    });

    test('should handle thousand notation', () => {
      expect(parser.normalizePrice('20thousand')).toBe(20000);
      expect(parser.normalizePrice('15 thousand')).toBe(15000);
    });

    test('should handle commas', () => {
      expect(parser.normalizePrice('20,000')).toBe(20000);
      expect(parser.normalizePrice('1,50,000')).toBe(150000);
    });

    test('should handle plain numbers', () => {
      expect(parser.normalizePrice('20000')).toBe(20000);
      expect(parser.normalizePrice('15000')).toBe(15000);
    });
  });

  describe('extractBrandNames', () => {
    test('should extract single brand', () => {
      const result = parser.extractBrandNames('samsung phones under 20000');
      expect(result).toContain('Samsung');
    });

    test('should extract multiple brands', () => {
      const result = parser.extractBrandNames('samsung or apple phones');
      expect(result).toContain('Samsung');
      expect(result).toContain('Apple');
    });

    test('should normalize iPhone to Apple', () => {
      const result = parser.extractBrandNames('iPhone under 50000');
      expect(result).toContain('Apple');
      expect(result).not.toContain('Iphone');
    });

    test('should normalize Redmi to Xiaomi', () => {
      const result = parser.extractBrandNames('Redmi phones');
      expect(result).toContain('Xiaomi');
      expect(result).not.toContain('Redmi');
    });

    test('should normalize Pixel to Google', () => {
      const result = parser.extractBrandNames('Google Pixel phones');
      expect(result).toContain('Google');
    });

    test('should return empty array for no brand mentions', () => {
      const result = parser.extractBrandNames('good camera phones under 20000');
      expect(result).toHaveLength(0);
    });

    test('should avoid duplicates', () => {
      const result = parser.extractBrandNames('samsung samsung galaxy phones');
      expect(result.filter(brand => brand === 'Samsung')).toHaveLength(1);
    });
  });

  describe('extractFeatureKeywords', () => {
    test('should extract camera features', () => {
      const result = parser.extractFeatureKeywords('phones with good camera and photography');
      expect(result.camera).toContain('camera');
      expect(result.camera).toContain('photography');
    });

    test('should extract battery features', () => {
      const result = parser.extractFeatureKeywords('phones with long battery life and fast charging');
      expect(result.battery).toContain('battery');
      expect(result.battery).toContain('fast charging');
    });

    test('should extract performance features', () => {
      const result = parser.extractFeatureKeywords('gaming phones with good performance');
      expect(result.performance).toContain('gaming');
      expect(result.performance).toContain('performance');
    });

    test('should extract display features', () => {
      const result = parser.extractFeatureKeywords('phones with AMOLED display and 120hz');
      expect(result.display).toContain('amoled');
      expect(result.display).toContain('display');
    });

    test('should extract connectivity features', () => {
      const result = parser.extractFeatureKeywords('5G phones with good connectivity');
      expect(result.connectivity).toContain('5g');
      expect(result.connectivity).toContain('connectivity');
    });

    test('should return empty object for no feature mentions', () => {
      const result = parser.extractFeatureKeywords('phones under 20000');
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('extractPriceCategory', () => {
    test('should extract budget category', () => {
      const result = parser.extractPriceCategory('budget phones under 15000');
      expect(result).toBe('budget');
    });

    test('should extract mid-range category', () => {
      const result = parser.extractPriceCategory('mid range phones');
      expect(result).toBe('mid_range');
    });

    test('should extract premium category', () => {
      const result = parser.extractPriceCategory('premium flagship phones');
      expect(result).toBe('premium');
    });

    test('should extract ultra premium category', () => {
      const result = parser.extractPriceCategory('ultra premium luxury phones');
      expect(result).toBe('ultra_premium');
    });

    test('should return null for no category mentions', () => {
      const result = parser.extractPriceCategory('phones under 20000');
      expect(result).toBeNull();
    });
  });

  describe('buildRecommendationFilters', () => {
    test('should build filters with price range', () => {
      const extractedData = {
        priceRange: { min_price: 15000, max_price: 25000 },
        brands: [],
        features: {},
        priceCategory: null,
        originalQuery: 'phones between 15000 and 25000'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_price).toBe(15000);
      expect(result.max_price).toBe(25000);
      expect(result.limit).toBe(10);
    });

    test('should build filters with brand', () => {
      const extractedData = {
        priceRange: {},
        brands: ['Samsung', 'Apple'],
        features: {},
        priceCategory: null,
        originalQuery: 'samsung or apple phones'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.brand).toBe('Samsung'); // First brand
      expect(result.limit).toBe(10);
    });

    test('should build filters with camera features', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: { camera: ['camera', 'photography'] },
        priceCategory: null,
        originalQuery: 'phones with good camera'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_camera_score).toBe(7.0);
      expect(result.limit).toBe(10);
    });

    test('should build filters with battery features and capacity', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: { battery: ['battery'] },
        priceCategory: null,
        originalQuery: 'phones with 5000 mah battery'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_battery_score).toBe(7.0);
      expect(result.min_battery_capacity_numeric).toBe(5000);
      expect(result.limit).toBe(10);
    });

    test('should build filters with performance features and RAM', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: { performance: ['gaming', 'performance'] },
        priceCategory: null,
        originalQuery: 'gaming phones with 8gb ram'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_performance_score).toBe(7.0);
      expect(result.min_ram_gb).toBe(8);
      expect(result.limit).toBe(10);
    });

    test('should build filters with display features and refresh rate', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: { display: ['display', 'amoled'] },
        priceCategory: null,
        originalQuery: 'phones with 120hz display'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_display_score).toBe(7.0);
      expect(result.min_refresh_rate_numeric).toBe(120);
      expect(result.limit).toBe(10);
    });

    test('should build filters with wireless charging', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: {},
        priceCategory: null,
        originalQuery: 'phones with wireless charging'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.has_wireless_charging).toBe(true);
      expect(result.limit).toBe(10);
    });

    test('should build filters with fast charging', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: {},
        priceCategory: null,
        originalQuery: 'phones with fast charging'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.has_fast_charging).toBe(true);
      expect(result.limit).toBe(10);
    });

    test('should build filters with storage', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: {},
        priceCategory: null,
        originalQuery: 'phones with 128gb storage'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_storage_gb).toBe(128);
      expect(result.limit).toBe(10);
    });

    test('should use price category when no specific price range', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: {},
        priceCategory: 'budget',
        originalQuery: 'budget phones'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_price).toBe(0);
      expect(result.max_price).toBe(15000);
      expect(result.price_category).toBe('budget');
      expect(result.limit).toBe(10);
    });

    test('should add default filters for general queries', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: {},
        priceCategory: null,
        originalQuery: 'best phones'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.min_overall_device_score).toBe(7.0);
      expect(result.limit).toBe(10);
    });

    test('should add default price limit for empty queries', () => {
      const extractedData = {
        priceRange: {},
        brands: [],
        features: {},
        priceCategory: null,
        originalQuery: 'phones'
      };

      const result = parser.buildRecommendationFilters(extractedData);
      expect(result.max_price).toBe(50000);
      expect(result.limit).toBe(10);
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate base confidence', () => {
      const confidence = parser.calculateConfidence({}, [], {}, null);
      expect(confidence).toBe(0.3);
    });

    test('should increase confidence with price range', () => {
      const confidence = parser.calculateConfidence({ min_price: 15000 }, [], {}, null);
      expect(confidence).toBe(0.6); // 0.3 + 0.3
    });

    test('should increase confidence with brands', () => {
      const confidence = parser.calculateConfidence({}, ['Samsung'], {}, null);
      expect(confidence).toBe(0.5); // 0.3 + 0.2
    });

    test('should increase confidence with features', () => {
      const confidence = parser.calculateConfidence({}, [], { camera: ['camera'], battery: ['battery'] }, null);
      expect(confidence).toBe(0.5); // 0.3 + 0.1 * 2
    });

    test('should increase confidence with price category', () => {
      const confidence = parser.calculateConfidence({}, [], {}, 'budget');
      expect(confidence).toBe(0.4); // 0.3 + 0.1
    });

    test('should cap confidence at 0.8', () => {
      const confidence = parser.calculateConfidence(
        { min_price: 15000, max_price: 25000 }, 
        ['Samsung'], 
        { camera: ['camera'], battery: ['battery'], performance: ['gaming'] }, 
        'premium'
      );
      expect(confidence).toBe(0.8); // Capped at 0.8
    });
  });

  describe('parseQuery', () => {
    test('should parse complex query with multiple features', async () => {
      const query = 'Samsung phones under 30000 with good camera and 5000 mah battery';
      const result = await parser.parseQuery(query);

      expect(result.type).toBe('recommendation');
      expect(result.source).toBe('local_fallback');
      expect(result.filters.brand).toBe('Samsung');
      expect(result.filters.max_price).toBe(30000);
      expect(result.filters.min_camera_score).toBe(7.0);
      expect(result.filters.min_battery_score).toBe(7.0);
      expect(result.filters.min_battery_capacity_numeric).toBe(5000);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should parse gaming phone query', async () => {
      const query = 'best gaming phones with 8gb ram under 40000';
      const result = await parser.parseQuery(query);

      expect(result.type).toBe('recommendation');
      expect(result.filters.max_price).toBe(40000);
      expect(result.filters.min_performance_score).toBe(7.0);
      expect(result.filters.min_ram_gb).toBe(8);
      expect(result.filters.min_overall_device_score).toBe(7.0);
    });

    test('should parse budget phone query', async () => {
      const query = 'budget phones under 15000';
      const result = await parser.parseQuery(query);

      expect(result.type).toBe('recommendation');
      expect(result.filters.max_price).toBe(15000);
      // Since there's already a max_price, price category won't add min_price
      expect(result.filters.min_price).toBeUndefined();
    });

    test('should handle error gracefully', async () => {
      // Mock an error in extraction
      const originalExtractPrice = parser.extractPriceRange;
      parser.extractPriceRange = () => { throw new Error('Test error'); };

      const result = await parser.parseQuery('test query');

      expect(result.type).toBe('recommendation');
      expect(result.source).toBe('local_fallback');
      expect(result.confidence).toBe(0.1);
      expect(result.error).toBe('Test error');
      expect(result.filters.limit).toBe(10);

      // Restore original method
      parser.extractPriceRange = originalExtractPrice;
    });
  });

  describe('validateFilters', () => {
    test('should ensure minimum price is not negative', () => {
      const filters = { min_price: -1000, max_price: 20000 };
      const result = parser.validateFilters(filters);
      expect(result.min_price).toBe(0);
    });

    test('should cap maximum price at 200000', () => {
      const filters = { min_price: 10000, max_price: 300000 };
      const result = parser.validateFilters(filters);
      expect(result.max_price).toBe(200000);
    });

    test('should swap min and max if min > max', () => {
      const filters = { min_price: 30000, max_price: 20000 };
      const result = parser.validateFilters(filters);
      expect(result.min_price).toBe(20000);
      expect(result.max_price).toBe(30000);
    });

    test('should cap score values between 0 and 10', () => {
      const filters = { 
        min_camera_score: -1, 
        max_camera_score: 15,
        min_battery_score: 5
      };
      const result = parser.validateFilters(filters);
      expect(result.min_camera_score).toBe(0);
      expect(result.max_camera_score).toBe(10);
      expect(result.min_battery_score).toBe(5);
    });

    test('should set reasonable limit', () => {
      const filters = { limit: 100 };
      const result = parser.validateFilters(filters);
      expect(result.limit).toBe(10);
    });

    test('should set reasonable limit for negative values', () => {
      const filters = { limit: -5 };
      const result = parser.validateFilters(filters);
      expect(result.limit).toBe(10);
    });
  });

  describe('getFeatureSuggestions', () => {
    test('should provide camera suggestions', () => {
      const suggestions = parser.getFeatureSuggestions('phones with good camera');
      expect(suggestions).toContain('Consider phones with high camera scores for better photography');
    });

    test('should provide battery suggestions', () => {
      const suggestions = parser.getFeatureSuggestions('phones with long battery life');
      expect(suggestions).toContain('Look for phones with good battery life and fast charging');
    });

    test('should provide performance suggestions', () => {
      const suggestions = parser.getFeatureSuggestions('gaming phones');
      expect(suggestions).toContain('Gaming phones or flagship devices might suit your performance needs');
    });

    test('should provide display suggestions', () => {
      const suggestions = parser.getFeatureSuggestions('phones with good display');
      expect(suggestions).toContain('AMOLED displays with high refresh rates provide better visual experience');
    });

    test('should return empty array for no features', () => {
      const suggestions = parser.getFeatureSuggestions('phones under 20000');
      expect(suggestions).toHaveLength(0);
    });
  });
});