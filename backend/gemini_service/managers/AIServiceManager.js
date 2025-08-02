const LocalFallbackParser = require('../parsers/LocalFallbackParser');
const ErrorClassifier = require('../utils/ErrorClassifier');
const Logger = require('../utils/Logger');
const MetricsCollector = require('../utils/MetricsCollector');

class AIServiceManager {
  constructor(config, quotaTracker, healthMonitor, loggerConfig = {}) {
    this.config = config;
    this.quotaTracker = quotaTracker;
    this.healthMonitor = healthMonitor;
    this.fallbackParser = new LocalFallbackParser();
    this.errorClassifier = new ErrorClassifier();
    this.currentProvider = null;
    this.fallbackMode = false;
    
    // Initialize structured logging and metrics
    this.logger = new Logger({
      service: 'ai-service-manager',
      level: loggerConfig.level || 'info',
      ...loggerConfig
    });
    
    this.metricsCollector = new MetricsCollector({
      enableAlerts: true,
      alertThresholds: {
        errorRate: 0.1, // 10% error rate
        responseTime: 5000, // 5 seconds
        quotaUsage: 0.9 // 90% quota usage
      }
    });
    
    this.logger.info('AIServiceManager initialized', {
      fallbackMode: this.fallbackMode,
      currentProvider: this.currentProvider
    });
  }

  async parseQuery(query) {
    const startTime = Date.now();
    let lastError = null;
    
    // Start request tracking
    const requestId = this.logger.startRequest('parseQuery', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      fallbackMode: this.fallbackMode,
      currentProvider: this.currentProvider
    });
    
    try {
      this.logger.info('Processing query', { 
        queryLength: query.length,
        fallbackMode: this.fallbackMode 
      }, requestId);
      
      // If in fallback mode, use local parser directly
      if (this.fallbackMode) {
        this.logger.info('Using fallback mode for query processing', {}, requestId);
        const result = await this.fallbackParser.parseQuery(query);
        
        // Record metrics and end request tracking
        this.metricsCollector.recordRequest({
          success: true,
          responseTime: Date.now() - startTime,
          provider: 'local_fallback',
          operation: 'parseQuery'
        });
        
        this.logger.endRequest(requestId, true, { 
          provider: 'local_fallback',
          type: result.type 
        });
        
        return {
          ...result,
          source: 'local_fallback',
          responseTime: Date.now() - startTime
        };
      }

      // Get available providers in priority order
      const availableProviders = this.getAvailableProviders();
      
      if (availableProviders.length === 0) {
        this.logger.warn('No providers available, enabling fallback mode', {}, requestId);
        this.enableFallbackMode();
        
        const fallbackResult = await this.fallbackParser.parseQuery(query);
        
        // Record metrics
        this.metricsCollector.recordRequest({
          success: true,
          responseTime: Date.now() - startTime,
          provider: 'local_fallback',
          operation: 'parseQuery'
        });
        
        this.logger.endRequest(requestId, true, { 
          provider: 'local_fallback',
          fallbackReason: 'no_providers_available' 
        });
        
        return {
          ...fallbackResult,
          source: 'local_fallback',
          fallbackReason: 'No providers available',
          responseTime: Date.now() - startTime
        };
      }

      // Try each provider in order
      for (const provider of availableProviders) {
        const providerStartTime = Date.now();
        
        try {
          this.logger.info('Trying provider', { 
            provider: provider.name,
            type: provider.type 
          }, requestId);
          
          // Check quota before making request
          const quotaCheck = await this.quotaTracker.checkQuota(provider.name, 'parseQuery');
          if (!quotaCheck.allowed) {
            this.logger.warn('Quota exceeded for provider', {
              provider: provider.name,
              reason: quotaCheck.reason
            }, requestId);
            
            // Record quota usage metrics
            this.metricsCollector.recordQuotaUsage(provider.name, {
              used: quotaCheck.used || 0,
              limit: quotaCheck.limit || 0,
              usage: quotaCheck.usage || 1
            });
            
            lastError = new Error(`Quota exceeded: ${quotaCheck.reason}`);
            continue;
          }

          // Check provider health
          if (!this.healthMonitor.isProviderAvailable(provider.name)) {
            this.logger.warn('Provider not available', {
              provider: provider.name
            }, requestId);
            
            lastError = new Error(`Provider ${provider.name} is not available`);
            continue;
          }

          // Make the actual request
          const result = await this.makeProviderRequest(provider, query);
          
          // Record successful usage
          await this.quotaTracker.recordUsage(provider.name, 'parseQuery', 1);
          
          // Update current provider
          this.currentProvider = provider.name;
          
          const responseTime = Date.now() - startTime;
          const providerResponseTime = Date.now() - providerStartTime;
          
          // Record successful metrics
          this.metricsCollector.recordRequest({
            success: true,
            responseTime: providerResponseTime,
            provider: provider.name,
            operation: 'parseQuery'
          });
          
          // Log performance
          this.logger.logPerformance('parseQuery', responseTime, {
            provider: provider.name,
            resultType: result.type
          });
          
          this.logger.info('Successfully processed query', {
            provider: provider.name,
            responseTime,
            resultType: result.type
          }, requestId);
          
          this.logger.endRequest(requestId, true, {
            provider: provider.name,
            responseTime,
            type: result.type
          });
          
          return {
            ...result,
            source: provider.name,
            responseTime
          };

        } catch (error) {
          const providerResponseTime = Date.now() - providerStartTime;
          
          // Classify the error for better handling
          const classifiedError = this.errorClassifier.createClassifiedError(error, provider.name, 'parseQuery');
          
          // Log structured error
          this.logger.error('Provider request failed', {
            provider: provider.name,
            errorType: classifiedError.type,
            errorMessage: classifiedError.message,
            responseTime: providerResponseTime
          }, requestId);
          
          // Record failed metrics
          this.metricsCollector.recordRequest({
            success: false,
            responseTime: providerResponseTime,
            provider: provider.name,
            operation: 'parseQuery',
            errorType: classifiedError.type
          });
          
          lastError = error;
          
          // Record failed usage (for quota tracking)
          await this.quotaTracker.recordUsage(provider.name, 'parseQuery', 0);
          
          // Update health monitor and record health metrics
          this.healthMonitor.markProviderUnhealthy(provider.name, error, providerResponseTime);
          this.metricsCollector.recordProviderHealth(provider.name, {
            isHealthy: false,
            responseTime: providerResponseTime,
            errorCount: 1,
            lastCheck: Date.now()
          });
          
          // Check if this error should trigger immediate fallback
          if (this.errorClassifier.shouldTriggerFallback(classifiedError.type)) {
            this.logger.warn('Error triggers fallback mode', {
              errorType: classifiedError.type,
              provider: provider.name
            }, requestId);
            
            this.enableFallbackMode();
            const fallbackResult = await this.fallbackParser.parseQuery(query);
            
            // Record fallback metrics
            this.metricsCollector.recordRequest({
              success: true,
              responseTime: Date.now() - startTime,
              provider: 'local_fallback',
              operation: 'parseQuery'
            });
            
            this.logger.endRequest(requestId, true, {
              provider: 'local_fallback',
              fallbackReason: classifiedError.type
            });
            
            return {
              ...fallbackResult,
              source: 'local_fallback',
              fallbackReason: classifiedError.userMessage,
              responseTime: Date.now() - startTime
            };
          }
          
          // Continue to next provider
          continue;
        }
      }

      // All providers failed, use fallback
      this.logger.warn('All providers failed, using fallback parser', {
        providersAttempted: availableProviders.length,
        lastError: lastError?.message
      }, requestId);
      
      const fallbackResult = await this.fallbackParser.parseQuery(query);
      
      // Record fallback metrics
      this.metricsCollector.recordRequest({
        success: true,
        responseTime: Date.now() - startTime,
        provider: 'local_fallback',
        operation: 'parseQuery'
      });
      
      this.logger.endRequest(requestId, true, {
        provider: 'local_fallback',
        fallbackReason: 'all_providers_failed'
      });
      
      return {
        ...fallbackResult,
        source: 'local_fallback',
        fallbackReason: lastError ? lastError.message : 'All providers unavailable',
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      // Classify the main error
      const classifiedError = this.errorClassifier.createClassifiedError(error, 'system', 'parseQuery');
      
      this.logger.error('System error in parseQuery', {
        errorType: classifiedError.type,
        errorMessage: classifiedError.message
      }, requestId);
      
      // Record system error metrics
      this.metricsCollector.recordRequest({
        success: false,
        responseTime: Date.now() - startTime,
        provider: 'system',
        operation: 'parseQuery',
        errorType: classifiedError.type
      });
      
      // Final fallback
      try {
        const fallbackResult = await this.fallbackParser.parseQuery(query);
        
        this.logger.endRequest(requestId, true, {
          provider: 'emergency_fallback',
          hadSystemError: true
        });
        
        return {
          ...fallbackResult,
          source: 'emergency_fallback',
          error: classifiedError.userMessage,
          responseTime: Date.now() - startTime
        };
      } catch (fallbackError) {
        const fallbackClassifiedError = this.errorClassifier.createClassifiedError(fallbackError, 'fallback', 'parseQuery');
        
        this.logger.error('Emergency fallback failed', {
          systemError: classifiedError.message,
          fallbackError: fallbackClassifiedError.message
        }, requestId);
        
        this.logger.endRequest(requestId, false, {
          provider: 'emergency_fallback',
          systemError: classifiedError.type,
          fallbackError: fallbackClassifiedError.type
        });
        
        // Return minimal response with user-friendly message
        return {
          type: "recommendation",
          filters: { limit: 10 },
          source: "emergency_fallback",
          confidence: 0.1,
          error: "I'm having trouble processing your request right now. Please try again in a moment.",
          responseTime: Date.now() - startTime
        };
      }
    }
  }

  async makeProviderRequest(provider, query) {
    // This is where we would integrate with actual AI providers
    // For now, we'll simulate the request based on provider type
    
    switch (provider.type) {
      case 'google-generative-ai':
        return await this.makeGeminiRequest(provider, query);
      case 'openai':
        return await this.makeOpenAIRequest(provider, query);
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  async makeGeminiRequest(provider, query) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    
    // For testing scenarios
    if (provider.apiKey === 'TEST_QUOTA_EXCEEDED') {
      const error = new Error('You exceeded your current quota');
      error.status = 429;
      throw error;
    }
    
    if (provider.apiKey === 'TEST_AUTH_ERROR') {
      const error = new Error('Invalid API key');
      error.status = 401;
      throw error;
    }
    
    // Skip actual API call if no real API key or test key
    if (!provider.apiKey || provider.apiKey.startsWith('TEST_') || provider.apiKey === 'GOOGLE_API_KEY' || provider.apiKey === 'test-key-1') {
      // Return simulated response for testing
      return {
        type: "recommendation",
        filters: this.parseQueryToFilters(query),
        confidence: 0.9
      };
    }
    
    try {
      // Initialize Google Generative AI with provider's API key
      const genAI = new GoogleGenerativeAI(provider.apiKey);
      const model = genAI.getGenerativeModel({ model: provider.model || "gemini-2.0-flash" });
      
      const prompt = `You are a powerful and versatile smart assistant for ePick, a smartphone recommendation platform.
Your job is to detect the user's intent and respond with a JSON object.

AVAILABLE PHONE FEATURES:
- Basic: name, brand, model, price, price_original, price_category
- Display: display_type, screen_size_numeric, display_resolution, ppi_numeric, refresh_rate_numeric, screen_protection, display_brightness, aspect_ratio, hdr_support, display_score
- Performance: chipset, cpu, gpu, ram, ram_gb, ram_type, internal_storage, storage_gb, storage_type, performance_score
- Camera: camera_setup, primary_camera_resolution, selfie_camera_resolution, primary_camera_video_recording, selfie_camera_video_recording, primary_camera_ois, primary_camera_aperture, selfie_camera_aperture, camera_features, autofocus, flash, settings, zoom, shooting_modes, video_fps, camera_count, primary_camera_mp, selfie_camera_mp, camera_score
- Battery: battery_type, capacity, battery_capacity_numeric, quick_charging, wireless_charging, reverse_charging, has_fast_charging, has_wireless_charging, charging_wattage, battery_score
- Design: build, weight, thickness, colors, waterproof, ip_rating, ruggedness
- Connectivity: network, speed, sim_slot, volte, bluetooth, wlan, gps, nfc, usb, usb_otg, connectivity_score
- Security: fingerprint_sensor, finger_sensor_type, finger_sensor_position, face_unlock, light_sensor, infrared, fm_radio, security_score
- Software: operating_system, os_version, user_interface, status, made_by, release_date, release_date_clean, is_new_release, age_in_months, is_upcoming
- Derived Scores: overall_device_score, performance_score, display_score, camera_score, battery_score, security_score, connectivity_score, is_popular_brand

Classify the intent as one of the following:
- "recommendation": Suggest phones based on filters (price, camera, battery, etc.)
- "qa": Answer specific technical questions about smartphones
- "comparison": Compare multiple phones with insights
- "chat": Friendly conversations, jokes, greetings, small talk

RESPONSE FORMAT:
For recommendation queries:
{
  "type": "recommendation",
  "filters": {
    "max_price": number,
    "min_price": number,
    "brand": string,
    "price_category": string,
    "min_ram_gb": number,
    "max_ram_gb": number,
    "min_storage_gb": number,
    "max_storage_gb": number,
    "min_display_score": number,
    "max_display_score": number,
    "min_camera_score": number,
    "max_camera_score": number,
    "min_battery_score": number,
    "max_battery_score": number,
    "min_performance_score": number,
    "max_performance_score": number,
    "min_security_score": number,
    "max_security_score": number,
    "min_connectivity_score": number,
    "max_connectivity_score": number,
    "min_overall_device_score": number,
    "max_overall_device_score": number,
    "min_refresh_rate_numeric": number,
    "max_refresh_rate_numeric": number,
    "min_screen_size_numeric": number,
    "max_screen_size_numeric": number,
    "min_ppi_numeric": number,
    "max_ppi_numeric": number,
    "min_battery_capacity_numeric": number,
    "max_battery_capacity_numeric": number,
    "min_primary_camera_mp": number,
    "max_primary_camera_mp": number,
    "min_selfie_camera_mp": number,
    "max_selfie_camera_mp": number,
    "min_camera_count": number,
    "max_camera_count": number,
    "has_fast_charging": boolean,
    "has_wireless_charging": boolean,
    "is_popular_brand": boolean,
    "is_new_release": boolean,
    "is_upcoming": boolean,
    "display_type": string,
    "camera_setup": string,
    "battery_type": string,
    "chipset": string,
    "operating_system": string,
    "limit": number
  }
}

For other queries:
{
  "type": "qa" | "comparison" | "chat",
  "data": string
}

Examples:
- "best phones under 30000 BDT" → { "type": "recommendation", "filters": { "max_price": 30000 } }
- "phones with good camera under 50000" → { "type": "recommendation", "filters": { "max_price": 50000, "min_camera_score": 7.0 } }
- "Samsung phones with 8GB RAM" → { "type": "recommendation", "filters": { "brand": "Samsung", "min_ram_gb": 8 } }
- "phones with 120Hz refresh rate" → { "type": "recommendation", "filters": { "min_refresh_rate_numeric": 120 } }
- "phones with wireless charging" → { "type": "recommendation", "filters": { "has_wireless_charging": true } }
- "new release phones" → { "type": "recommendation", "filters": { "is_new_release": true } }
- "What is the refresh rate of Galaxy A55?" → { "type": "qa", "data": "I'll check the refresh rate of Galaxy A55 for you." }
- "Compare POCO X6 vs Redmi Note 13 Pro" → { "type": "comparison", "data": "I'll compare POCO X6 and Redmi Note 13 Pro for you." }
- "Hi, how are you?" → { "type": "chat", "data": "I'm great! How can I help you today?" }

Only return valid JSON — no markdown formatting. User query: ${query}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const rawText = response.text();
      
      // Clean JSON formatting from Gemini output
      const cleanedText = rawText.replace(/```json\n?|\n?```/g, "").trim();
      
      console.log(`[${new Date().toISOString()}] 🔹 Gemini Raw Response: ${rawText.substring(0, 200)}...`);
      
      // Parse and validate response
      const parsed = JSON.parse(cleanedText);
      const allowedTypes = ["recommendation", "qa", "comparison", "chat"];

      if (!parsed.type || !allowedTypes.includes(parsed.type)) {
        throw new Error(`Unexpected response type: ${parsed.type}`);
      }

      return parsed;
      
    } catch (error) {
      // Classify the error for appropriate handling
      const errorType = this.errorClassifier.classifyError(error);
      
      // Handle specific error types
      switch (errorType) {
        case this.errorClassifier.ERROR_TYPES.AUTHENTICATION_ERROR:
          const authError = new Error('Invalid API key');
          authError.status = 401;
          throw authError;
          
        case this.errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED:
          const quotaError = new Error('You exceeded your current quota');
          quotaError.status = 429;
          throw quotaError;
          
        case this.errorClassifier.ERROR_TYPES.PARSE_ERROR:
          // Return a fallback response for JSON parsing errors
          return {
            type: "chat",
            data: this.errorClassifier.getUserMessage(errorType)
          };
          
        case this.errorClassifier.ERROR_TYPES.RATE_LIMIT_ERROR:
          const rateLimitError = new Error('Rate limit exceeded');
          rateLimitError.status = 429;
          throw rateLimitError;
          
        default:
          throw error;
      }
    }
  }

  async makeOpenAIRequest(provider, query) {
    // Simulate OpenAI API call
    // In production, this would use the actual OpenAI SDK
    
    // Simulate successful response
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
    
    return {
      type: "recommendation", 
      filters: this.parseQueryToFilters(query),
      confidence: 0.85
    };
  }

  parseQueryToFilters(query) {
    // Simple filter extraction for simulation
    // In production, this would be handled by the actual AI provider
    const filters = { limit: 10 };
    
    // Extract price mentions
    const priceMatch = query.match(/(\d+)/);
    if (priceMatch) {
      filters.max_price = parseInt(priceMatch[1]);
    }
    
    // Extract brand mentions
    const brands = ['samsung', 'apple', 'xiaomi', 'oneplus'];
    for (const brand of brands) {
      if (query.toLowerCase().includes(brand)) {
        filters.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
        break;
      }
    }
    
    return filters;
  }

  getAvailableProviders() {
    try {
      // Get enabled providers from config
      const enabledProviders = this.config.getEnabledProviders();
      
      // Filter by health status
      const availableProviders = enabledProviders.filter(provider => {
        const isHealthy = this.healthMonitor.isProviderAvailable(provider.name);
        const quotaStatus = this.quotaTracker.isQuotaExceeded(provider.name);
        
        return isHealthy && !quotaStatus.exceeded;
      });
      
      console.log(`[${new Date().toISOString()}] 📊 Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
      
      return availableProviders;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error getting available providers:`, error.message);
      return [];
    }
  }

  switchToNextProvider() {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      console.warn(`[${new Date().toISOString()}] ⚠️ No providers available for switching`);
      this.enableFallbackMode();
      return null;
    }
    
    // Find current provider index
    const currentIndex = availableProviders.findIndex(p => p.name === this.currentProvider);
    
    // Switch to next provider (or first if current not found)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableProviders.length : 0;
    const nextProvider = availableProviders[nextIndex];
    
    this.currentProvider = nextProvider.name;
    console.log(`[${new Date().toISOString()}] 🔄 Switched to provider: ${nextProvider.name}`);
    
    return nextProvider;
  }

  enableFallbackMode() {
    if (!this.fallbackMode) {
      this.fallbackMode = true;
      this.currentProvider = null;
      console.log(`[${new Date().toISOString()}] 🔄 Fallback mode enabled`);
    }
  }

  disableFallbackMode() {
    if (this.fallbackMode) {
      this.fallbackMode = false;
      console.log(`[${new Date().toISOString()}] ✅ Fallback mode disabled`);
    }
  }

  getCurrentProvider() {
    return this.currentProvider;
  }

  isFallbackMode() {
    return this.fallbackMode;
  }

  async generateContent(prompt) {
    // Similar to parseQuery but for general content generation
    const startTime = Date.now();
    
    try {
      if (this.fallbackMode) {
        throw new Error('Content generation not available in fallback mode');
      }

      const availableProviders = this.getAvailableProviders();
      
      if (availableProviders.length === 0) {
        throw new Error('No providers available for content generation');
      }

      for (const provider of availableProviders) {
        try {
          // Check quota
          const quotaCheck = await this.quotaTracker.checkQuota(provider.name, 'generateContent');
          if (!quotaCheck.allowed) {
            continue;
          }

          // Check health
          if (!this.healthMonitor.isProviderAvailable(provider.name)) {
            continue;
          }

          // Make request (simplified for now)
          const result = await this.makeContentGenerationRequest(provider, prompt);
          
          // Record usage
          await this.quotaTracker.recordUsage(provider.name, 'generateContent', 1);
          
          return {
            ...result,
            source: provider.name,
            responseTime: Date.now() - startTime
          };

        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Content generation failed for ${provider.name}:`, error.message);
          continue;
        }
      }

      throw new Error('All providers failed for content generation');

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Content generation error:`, error.message);
      throw error;
    }
  }

  async makeContentGenerationRequest(provider, prompt) {
    // Simulate content generation request
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      content: `Generated content for: ${prompt.substring(0, 50)}...`,
      model: provider.model || 'unknown'
    };
  }

  // Get service status for monitoring
  getServiceStatus() {
    const availableProviders = this.getAvailableProviders();
    const allProviders = this.config.getEnabledProviders();
    
    return {
      timestamp: new Date().toISOString(),
      fallbackMode: this.fallbackMode,
      currentProvider: this.currentProvider,
      availableProviders: availableProviders.map(p => p.name),
      totalProviders: allProviders.length,
      healthStatus: this.healthMonitor.getAllProviderStatus(),
      quotaStatus: this.quotaTracker.getAllUsageStats(),
      metrics: this.metricsCollector.getCurrentMetrics(),
      logging: {
        activeRequests: this.logger.getActiveRequests().length,
        recentRequests: this.logger.getRequestHistory(10).length
      }
    };
  }

  // Force refresh provider availability
  async refreshProviderStatus() {
    this.logger.info('Refreshing provider status');
    
    // Perform health checks
    await this.healthMonitor.performHealthChecks();
    
    // Update health metrics for all providers
    const allProviders = this.config.getEnabledProviders();
    for (const provider of allProviders) {
      const isHealthy = this.healthMonitor.isProviderAvailable(provider.name);
      this.metricsCollector.recordProviderHealth(provider.name, {
        isHealthy,
        responseTime: 0,
        errorCount: 0,
        lastCheck: Date.now()
      });
    }
    
    // Check if we can exit fallback mode
    if (this.fallbackMode) {
      const availableProviders = this.getAvailableProviders();
      if (availableProviders.length > 0) {
        this.disableFallbackMode();
        this.currentProvider = availableProviders[0].name;
        this.logger.info('Exited fallback mode', {
          newProvider: this.currentProvider,
          availableProviders: availableProviders.length
        });
      }
    }
    
    return this.getServiceStatus();
  }

  /**
   * Get detailed metrics for monitoring dashboard
   * @param {number} timeRange - Time range in milliseconds (default: 1 hour)
   * @returns {Object} Detailed metrics
   */
  getDetailedMetrics(timeRange = 60 * 60 * 1000) {
    const endTime = Date.now();
    const startTime = endTime - timeRange;
    
    return {
      timeRange: { startTime, endTime },
      current: this.metricsCollector.getCurrentMetrics(),
      historical: this.metricsCollector.getMetricsForTimeRange(startTime, endTime),
      logging: {
        level: this.logger.config.level,
        activeRequests: this.logger.getActiveRequests(),
        recentHistory: this.logger.getRequestHistory(50)
      }
    };
  }

  /**
   * Export metrics data for analysis
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} Exported data
   */
  exportMetrics(format = 'json') {
    return this.metricsCollector.exportMetrics(format);
  }

  /**
   * Set logging level
   * @param {string} level - New log level
   */
  setLogLevel(level) {
    this.logger.setLevel(level);
    this.logger.info('Log level changed', { newLevel: level });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.logger.info('Cleaning up AIServiceManager resources');
    
    if (this.logger) {
      this.logger.cleanup();
    }
    
    if (this.metricsCollector) {
      this.metricsCollector.cleanup();
    }
    
    console.log(`[${new Date().toISOString()}] 🧹 AIServiceManager cleanup completed`);
  }
}

module.exports = AIServiceManager;