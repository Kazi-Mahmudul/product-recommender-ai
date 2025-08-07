// Chat context management service for maintaining conversation state

import { Phone } from '../api/phones';
import { ChatMessage } from '../types/chat';
import { ContextAnalytics } from './contextAnalytics';

export interface UserPreferences {
  priceRange?: [number, number];
  preferredBrands?: string[];
  importantFeatures?: string[];
  budgetCategory?: 'budget' | 'mid-range' | 'premium';
  primaryUseCase?: 'general' | 'gaming' | 'photography' | 'business';
}

export interface PhoneRecommendationContext {
  id: string;
  phones: Phone[];
  originalQuery: string;
  timestamp: number;
  metadata: {
    priceRange: { min: number; max: number };
    brands: string[];
    keyFeatures: string[];
    averageRating: number;
    recommendationReason: string;
  };
}

export interface ChatContext {
  sessionId: string;
  currentRecommendations: Phone[];
  userPreferences: UserPreferences;
  conversationHistory: ChatMessage[];
  lastQuery: string;
  queryCount: number;
  timestamp: Date;
  interactionPatterns: {
    frequentFeatures: string[];
    preferredPriceRange: [number, number] | null;
    brandInteractions: Record<string, number>;
    featureInteractions: Record<string, number>;
  };
  phoneRecommendations: PhoneRecommendationContext[];
  currentRecommendationId?: string;
}

export class ChatContextManager {
  private static readonly STORAGE_KEY = 'epick_chat_context';
  private static readonly MAX_HISTORY_LENGTH = 50;
  private static readonly CONTEXT_EXPIRY_HOURS = 24;
  private static readonly CACHE_KEY = 'epick_context_cache';
  private static readonly MAX_PHONE_RECOMMENDATIONS = 10;
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  // In-memory cache for performance optimization
  private static contextCache: ChatContext | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_TTL = 30 * 1000; // 30 seconds
  
  // Performance monitoring
  private static performanceMetrics = {
    saveOperations: 0,
    loadOperations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cleanupOperations: 0,
    averageSaveTime: 0,
    averageLoadTime: 0
  };
  
  // Cleanup timer
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize a new chat context
   */
  static initializeContext(): ChatContext {
    const sessionId = this.generateSessionId();
    const context: ChatContext = {
      sessionId,
      currentRecommendations: [],
      userPreferences: {
        preferredBrands: [],
        importantFeatures: []
      },
      conversationHistory: [],
      lastQuery: '',
      queryCount: 0,
      timestamp: new Date(),
      interactionPatterns: {
        frequentFeatures: [],
        preferredPriceRange: null,
        brandInteractions: {},
        featureInteractions: {}
      },
      phoneRecommendations: [],
      currentRecommendationId: undefined
    };

    this.saveContext(context);
    return context;
  }

  /**
   * Load existing context from storage or create new one with caching
   */
  static loadContext(): ChatContext {
    const startTime = performance.now();
    this.performanceMetrics.loadOperations++;
    
    try {
      // Check in-memory cache first
      if (this.contextCache && this.isCacheValid()) {
        this.performanceMetrics.cacheHits++;
        return this.contextCache;
      }
      
      this.performanceMetrics.cacheMisses++;
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        const newContext = this.initializeContext();
        this.updateCache(newContext);
        return newContext;
      }

      const context: ChatContext = JSON.parse(stored);
      
      // Check if context has expired
      const contextAge = Date.now() - new Date(context.timestamp).getTime();
      const maxAge = this.CONTEXT_EXPIRY_HOURS * 60 * 60 * 1000;
      
      if (contextAge > maxAge) {
        const newContext = this.initializeContext();
        this.updateCache(newContext);
        return newContext;
      }

      // Ensure context has all required properties
      const validatedContext = this.validateAndMigrateContext(context);
      this.updateCache(validatedContext);
      
      // Start cleanup timer if not already running
      this.startCleanupTimer();
      
      return validatedContext;
    } catch (error) {
      console.warn('Failed to load chat context:', error);
      const newContext = this.initializeContext();
      this.updateCache(newContext);
      return newContext;
    } finally {
      const endTime = performance.now();
      this.updateAverageTime('load', endTime - startTime);
    }
  }

  /**
   * Save context to local storage with performance optimization
   */
  static saveContext(context: ChatContext): void {
    const startTime = performance.now();
    this.performanceMetrics.saveOperations++;
    
    try {
      // Optimize context before saving
      const optimizedContext = this.optimizeContextForStorage(context);
      
      // Update cache
      this.updateCache(optimizedContext);
      
      // Save to localStorage with compression for large contexts
      const contextString = JSON.stringify(optimizedContext);
      
      // Check if context is getting too large
      if (contextString.length > 1024 * 1024) { // 1MB
        console.warn('Context size is large, performing aggressive cleanup');
        const cleanedContext = this.aggressiveCleanup(optimizedContext);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedContext));
        this.updateCache(cleanedContext);
      } else {
        localStorage.setItem(this.STORAGE_KEY, contextString);
      }
      
    } catch (error) {
      console.warn('Failed to save chat context:', error);
      
      // If save fails due to storage quota, try aggressive cleanup
      if (error instanceof DOMException && error.code === 22) {
        try {
          const cleanedContext = this.aggressiveCleanup(context);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedContext));
          this.updateCache(cleanedContext);
        } catch (cleanupError) {
          console.error('Failed to save even after cleanup:', cleanupError);
        }
      }
    } finally {
      const endTime = performance.now();
      this.updateAverageTime('save', endTime - startTime);
    }
  }

  /**
   * Update context with new message
   */
  static updateWithMessage(context: ChatContext, message: ChatMessage): ChatContext {
    const updatedContext = {
      ...context,
      conversationHistory: [...context.conversationHistory, message],
      lastQuery: message.user || context.lastQuery,
      queryCount: message.user ? context.queryCount + 1 : context.queryCount,
      timestamp: new Date()
    };

    // Analyze user preferences from the message
    if (message.user) {
      this.analyzeUserPreferences(updatedContext, message.user);
    }

    // Update current recommendations if phones are present
    if (message.phones && message.phones.length > 0) {
      updatedContext.currentRecommendations = message.phones;
      this.updateInteractionPatterns(updatedContext, message.phones);
    }

    this.saveContext(updatedContext);
    return updatedContext;
  }

  /**
   * Update user preferences based on query analysis
   */
  static updateUserPreferences(context: ChatContext, preferences: Partial<UserPreferences>): ChatContext {
    const updatedContext = {
      ...context,
      userPreferences: {
        ...context.userPreferences,
        ...preferences
      },
      timestamp: new Date()
    };

    this.saveContext(updatedContext);
    return updatedContext;
  }

  /**
   * Clear context and start fresh
   */
  static clearContext(): ChatContext {
    localStorage.removeItem(this.STORAGE_KEY);
    this.clearCache();
    const newContext = this.initializeContext();
    this.updateCache(newContext);
    return newContext;
  }

  /**
   * Add phone recommendation context with comprehensive error handling
   */
  static addPhoneRecommendation(
    context: ChatContext,
    phones: Phone[],
    originalQuery: string
  ): ChatContext {
    try {
      // Validate inputs
      if (!context) {
        console.warn('ChatContextManager: Invalid context provided');
        return this.initializeContext();
      }

      if (!phones || phones.length === 0) {
        console.warn('ChatContextManager: No phones provided for context');
        return context;
      }

      if (!originalQuery || originalQuery.trim().length === 0) {
        console.warn('ChatContextManager: No query provided for context');
        return context;
      }

      const recommendationId = this.generateRecommendationId();
      
      // Calculate metadata with error handling
      const prices = phones
        .map(p => p.price_original || 0)
        .filter(p => typeof p === 'number' && p > 0);
      
      const priceRange = prices.length > 0 
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : { min: 0, max: 0 };
      
      const brands = Array.from(new Set(
        phones
          .map(p => p.brand)
          .filter(brand => brand && typeof brand === 'string' && brand.trim().length > 0)
      ));
      
      const keyFeatures = this.extractKeyFeatures(phones, originalQuery);
      
      const validRatings = phones
        .map(p => p.overall_device_score || 0)
        .filter(rating => typeof rating === 'number' && rating > 0);
      
      const averageRating = validRatings.length > 0 
        ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length
        : 0;
      
      const recommendationReason = this.generateRecommendationReason(phones, originalQuery);

      const phoneRecommendation: PhoneRecommendationContext = {
        id: recommendationId,
        phones: phones.filter(p => p && typeof p === 'object'), // Filter out invalid phones
        originalQuery: originalQuery.trim(),
        timestamp: Date.now(),
        metadata: {
          priceRange,
          brands,
          keyFeatures,
          averageRating,
          recommendationReason
        }
      };

      // Ensure phoneRecommendations array exists and is valid
      const existingRecommendations = Array.isArray(context.phoneRecommendations) 
        ? context.phoneRecommendations 
        : [];

      const updatedContext = {
        ...context,
        phoneRecommendations: [
          ...existingRecommendations.slice(-4), // Keep last 4 recommendations
          phoneRecommendation
        ],
        currentRecommendationId: recommendationId,
        currentRecommendations: phoneRecommendation.phones,
        timestamp: new Date()
      };

      this.saveContext(updatedContext);
      
      // Track context creation analytics
      try {
        ContextAnalytics.trackContextCreated(
          recommendationId,
          phoneRecommendation.phones.length,
          originalQuery,
          context.sessionId
        );
      } catch (error) {
        console.warn('Failed to track context creation analytics:', error);
      }
      
      return updatedContext;

    } catch (error) {
      console.error('ChatContextManager: Failed to add phone recommendation context:', error);
      // Return original context if enhancement fails
      return context;
    }
  }

  /**
   * Get current phone recommendation context with error handling
   */
  static getCurrentPhoneContext(context: ChatContext): PhoneRecommendationContext | null {
    try {
      if (!context || !context.currentRecommendationId) return null;
      
      if (!Array.isArray(context.phoneRecommendations)) {
        console.warn('ChatContextManager: phoneRecommendations is not an array');
        return null;
      }
      
      const currentContext = context.phoneRecommendations.find(
        rec => rec && rec.id === context.currentRecommendationId
      );
      
      return currentContext || null;
    } catch (error) {
      console.error('ChatContextManager: Failed to get current phone context:', error);
      return null;
    }
  }

  /**
   * Get recent phone recommendation contexts with error handling
   */
  static getRecentPhoneContext(
    context: ChatContext,
    maxAge: number = 300000 // 5 minutes
  ): PhoneRecommendationContext[] {
    try {
      if (!context || !Array.isArray(context.phoneRecommendations)) {
        console.warn('ChatContextManager: Invalid context or phoneRecommendations');
        return [];
      }
      
      const cutoffTime = Date.now() - maxAge;
      
      return context.phoneRecommendations
        .filter(rec => {
          // Validate recommendation structure
          if (!rec || typeof rec !== 'object') return false;
          if (!rec.timestamp || typeof rec.timestamp !== 'number') return false;
          if (!rec.phones || !Array.isArray(rec.phones)) return false;
          
          return rec.timestamp > cutoffTime;
        })
        .sort((a, b) => b.timestamp - a.timestamp);
        
    } catch (error) {
      console.error('ChatContextManager: Failed to get recent phone context:', error);
      return [];
    }
  }

  /**
   * Check if phone context is available and recent with error handling
   */
  static hasRecentPhoneContext(context: ChatContext, maxAge: number = 300000): boolean {
    try {
      return this.getRecentPhoneContext(context, maxAge).length > 0;
    } catch (error) {
      console.error('ChatContextManager: Failed to check recent phone context:', error);
      return false;
    }
  }

  /**
   * Clean up stale or corrupted context data
   */
  static cleanupContext(context: ChatContext): ChatContext {
    try {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      // Clean up old phone recommendations
      const validRecommendations = Array.isArray(context.phoneRecommendations)
        ? context.phoneRecommendations.filter(rec => {
            if (!rec || typeof rec !== 'object') return false;
            if (!rec.timestamp || typeof rec.timestamp !== 'number') return false;
            if (now - rec.timestamp > maxAge) return false;
            if (!rec.phones || !Array.isArray(rec.phones) || rec.phones.length === 0) return false;
            return true;
          })
        : [];

      // Clean up conversation history
      const validHistory = Array.isArray(context.conversationHistory)
        ? context.conversationHistory.slice(-this.MAX_HISTORY_LENGTH)
        : [];

      const cleanedContext = {
        ...context,
        phoneRecommendations: validRecommendations,
        conversationHistory: validHistory,
        // Reset current recommendation if it's no longer valid
        currentRecommendationId: validRecommendations.find(
          rec => rec.id === context.currentRecommendationId
        ) ? context.currentRecommendationId : undefined,
        timestamp: new Date()
      };

      this.saveContext(cleanedContext);
      return cleanedContext;

    } catch (error) {
      console.error('ChatContextManager: Failed to cleanup context:', error);
      // If cleanup fails, return a fresh context
      return this.initializeContext();
    }
  }

  /**
   * Get context-aware suggestions based on user history
   */
  static getContextualSuggestions(context: ChatContext): string[] {
    const suggestions: string[] = [];
    const { userPreferences, interactionPatterns } = context;

    // Price-based suggestions
    if (userPreferences.priceRange) {
      const [min, max] = userPreferences.priceRange;
      suggestions.push(`Phones between ৳${min.toLocaleString()} - ৳${max.toLocaleString()}`);
    }

    // Brand-based suggestions
    const topBrands = Object.entries(interactionPatterns.brandInteractions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([brand]) => brand);

    if (topBrands.length > 0) {
      suggestions.push(`More ${topBrands.join(' or ')} phones`);
    }

    // Feature-based suggestions
    const topFeatures = Object.entries(interactionPatterns.featureInteractions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([feature]) => feature);

    if (topFeatures.includes('camera')) {
      suggestions.push('Phones with better cameras');
    }
    if (topFeatures.includes('battery')) {
      suggestions.push('Phones with longer battery life');
    }
    if (topFeatures.includes('gaming')) {
      suggestions.push('Gaming phones with high refresh rate');
    }

    // Use case based suggestions
    if (userPreferences.primaryUseCase === 'photography') {
      suggestions.push('Professional camera phones');
    } else if (userPreferences.primaryUseCase === 'gaming') {
      suggestions.push('High performance gaming phones');
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Analyze user preferences from query text
   */
  private static analyzeUserPreferences(context: ChatContext, query: string): void {
    const lowerQuery = query.toLowerCase();
    
    // Extract price preferences
    const priceMatch = lowerQuery.match(/under\s+([0-9,]+)|below\s+([0-9,]+)|less\s+than\s+([0-9,]+)/);
    if (priceMatch) {
      const price = parseInt((priceMatch[1] || priceMatch[2] || priceMatch[3]).replace(/,/g, ''));
      if (price > 0) {
        context.userPreferences.priceRange = [0, price];
        
        // Categorize budget
        if (price < 25000) {
          context.userPreferences.budgetCategory = 'budget';
        } else if (price < 60000) {
          context.userPreferences.budgetCategory = 'mid-range';
        } else {
          context.userPreferences.budgetCategory = 'premium';
        }
      }
    }

    // Extract brand preferences
    const brands = ['samsung', 'apple', 'iphone', 'xiaomi', 'poco', 'redmi', 'oneplus', 'oppo', 'vivo', 'realme'];
    const mentionedBrands = brands.filter(brand => lowerQuery.includes(brand));
    if (mentionedBrands.length > 0) {
      context.userPreferences.preferredBrands = [
        ...(context.userPreferences.preferredBrands || []),
        ...mentionedBrands.map(brand => brand.charAt(0).toUpperCase() + brand.slice(1))
      ];
      // Remove duplicates
      context.userPreferences.preferredBrands = Array.from(new Set(context.userPreferences.preferredBrands));
    }

    // Extract feature preferences
    const features = ['camera', 'battery', 'gaming', 'performance', 'display', 'storage', 'ram'];
    const mentionedFeatures = features.filter(feature => lowerQuery.includes(feature));
    if (mentionedFeatures.length > 0) {
      context.userPreferences.importantFeatures = [
        ...(context.userPreferences.importantFeatures || []),
        ...mentionedFeatures
      ];
      // Remove duplicates
      context.userPreferences.importantFeatures = Array.from(new Set(context.userPreferences.importantFeatures));
    }

    // Extract use case
    if (lowerQuery.includes('gaming') || lowerQuery.includes('game')) {
      context.userPreferences.primaryUseCase = 'gaming';
    } else if (lowerQuery.includes('camera') || lowerQuery.includes('photo') || lowerQuery.includes('picture')) {
      context.userPreferences.primaryUseCase = 'photography';
    } else if (lowerQuery.includes('business') || lowerQuery.includes('work') || lowerQuery.includes('office')) {
      context.userPreferences.primaryUseCase = 'business';
    }
  }

  /**
   * Update interaction patterns based on phone recommendations
   */
  private static updateInteractionPatterns(context: ChatContext, phones: Phone[]): void {
    const patterns = context.interactionPatterns;

    // Update brand interactions
    phones.forEach(phone => {
      if (phone.brand) {
        patterns.brandInteractions[phone.brand] = (patterns.brandInteractions[phone.brand] || 0) + 1;
      }
    });

    // Update price range preferences
    const prices = phones.map(p => p.price_original).filter(p => p && p > 0) as number[];
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      patterns.preferredPriceRange = [minPrice, maxPrice];
    }

    // Update feature interactions based on query context
    const lastQuery = context.lastQuery.toLowerCase();
    if (lastQuery.includes('camera')) {
      patterns.featureInteractions['camera'] = (patterns.featureInteractions['camera'] || 0) + 1;
    }
    if (lastQuery.includes('battery')) {
      patterns.featureInteractions['battery'] = (patterns.featureInteractions['battery'] || 0) + 1;
    }
    if (lastQuery.includes('gaming') || lastQuery.includes('performance')) {
      patterns.featureInteractions['gaming'] = (patterns.featureInteractions['gaming'] || 0) + 1;
    }
    if (lastQuery.includes('display') || lastQuery.includes('screen')) {
      patterns.featureInteractions['display'] = (patterns.featureInteractions['display'] || 0) + 1;
    }
  }

  /**
   * Validate and migrate context structure
   */
  private static validateAndMigrateContext(context: any): ChatContext {
    const defaultContext = this.initializeContext();
    
    return {
      sessionId: context.sessionId || defaultContext.sessionId,
      currentRecommendations: Array.isArray(context.currentRecommendations) ? context.currentRecommendations : [],
      userPreferences: context.userPreferences || {},
      conversationHistory: Array.isArray(context.conversationHistory) ? context.conversationHistory : [],
      lastQuery: context.lastQuery || '',
      queryCount: typeof context.queryCount === 'number' ? context.queryCount : 0,
      timestamp: context.timestamp ? new Date(context.timestamp) : new Date(),
      interactionPatterns: {
        frequentFeatures: Array.isArray(context.interactionPatterns?.frequentFeatures) 
          ? context.interactionPatterns.frequentFeatures : [],
        preferredPriceRange: context.interactionPatterns?.preferredPriceRange || null,
        brandInteractions: context.interactionPatterns?.brandInteractions || {},
        featureInteractions: context.interactionPatterns?.featureInteractions || {}
      },
      phoneRecommendations: Array.isArray(context.phoneRecommendations) ? context.phoneRecommendations : [],
      currentRecommendationId: context.currentRecommendationId || undefined
    };
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique recommendation ID
   */
  private static generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Extract key features from phones and query
   */
  private static extractKeyFeatures(phones: Phone[], query: string): string[] {
    const features: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Check for high refresh rate
    const highRefreshCount = phones.filter(p => 
      p.refresh_rate_numeric && p.refresh_rate_numeric >= 90
    ).length;
    if (highRefreshCount >= phones.length * 0.6) {
      features.push('high_refresh_rate');
    }

    // Check for fast charging
    const fastChargingCount = phones.filter(p => p.has_fast_charging).length;
    if (fastChargingCount >= phones.length * 0.6) {
      features.push('fast_charging');
    }

    // Check for 5G
    const fiveGCount = phones.filter(p => 
      p.network && p.network.toLowerCase().includes('5g')
    ).length;
    if (fiveGCount >= phones.length * 0.6) {
      features.push('5g');
    }

    // Check for good camera
    const goodCameraCount = phones.filter(p => 
      p.camera_score && p.camera_score >= 7
    ).length;
    if (goodCameraCount >= phones.length * 0.6 || lowerQuery.includes('camera')) {
      features.push('good_camera');
    }

    // Check for good battery
    const goodBatteryCount = phones.filter(p => 
      p.battery_capacity_numeric && p.battery_capacity_numeric >= 4000
    ).length;
    if (goodBatteryCount >= phones.length * 0.6 || lowerQuery.includes('battery')) {
      features.push('good_battery');
    }

    // Check for gaming features
    if (lowerQuery.includes('gaming') || lowerQuery.includes('performance')) {
      features.push('gaming');
    }

    return features;
  }

  /**
   * Generate recommendation reason based on phones and query
   */
  private static generateRecommendationReason(phones: Phone[], query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('budget') || lowerQuery.includes('cheap')) {
      return 'Budget-friendly options';
    }
    if (lowerQuery.includes('premium') || lowerQuery.includes('flagship')) {
      return 'Premium flagship phones';
    }
    if (lowerQuery.includes('gaming')) {
      return 'Gaming performance focused';
    }
    if (lowerQuery.includes('camera')) {
      return 'Camera quality focused';
    }
    if (lowerQuery.includes('battery')) {
      return 'Battery life focused';
    }

    // Infer from phone characteristics
    const avgPrice = phones.reduce((sum, p) => sum + (p.price_original || 0), 0) / phones.length;
    if (avgPrice > 60000) return 'Premium options';
    if (avgPrice < 20000) return 'Budget options';
    
    return 'General recommendations';
  }

  /**
   * Get context summary for debugging
   */
  static getContextSummary(context: ChatContext): string {
    const { userPreferences, queryCount, interactionPatterns } = context;
    const topBrands = Object.entries(interactionPatterns.brandInteractions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand, count]) => `${brand}(${count})`);

    return `Session: ${context.sessionId.slice(-8)}, Queries: ${queryCount}, ` +
           `Budget: ${userPreferences.budgetCategory || 'unknown'}, ` +
           `Brands: ${topBrands.join(', ') || 'none'}, ` +
           `Features: ${userPreferences.importantFeatures?.join(', ') || 'none'}`;
  }

  /**
   * Performance and caching methods
   */
  
  /**
   * Check if in-memory cache is valid
   */
  private static isCacheValid(): boolean {
    return this.contextCache !== null && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_TTL;
  }
  
  /**
   * Update in-memory cache
   */
  private static updateCache(context: ChatContext): void {
    this.contextCache = { ...context };
    this.cacheTimestamp = Date.now();
  }
  
  /**
   * Clear in-memory cache
   */
  static clearCache(): void {
    this.contextCache = null;
    this.cacheTimestamp = 0;
  }
  
  /**
   * Optimize context for storage by removing redundant data
   */
  private static optimizeContextForStorage(context: ChatContext): ChatContext {
    return {
      ...context,
      conversationHistory: context.conversationHistory.slice(-this.MAX_HISTORY_LENGTH),
      phoneRecommendations: context.phoneRecommendations
        .slice(-this.MAX_PHONE_RECOMMENDATIONS)
        .map(rec => ({
          ...rec,
          // Remove large phone objects, keep only essential data
          phones: rec.phones.map(phone => ({
            id: phone.id,
            name: phone.name,
            brand: phone.brand,
            price_original: phone.price_original,
            overall_device_score: phone.overall_device_score,
            camera_score: phone.camera_score,
            battery_capacity_numeric: phone.battery_capacity_numeric,
            refresh_rate_numeric: phone.refresh_rate_numeric,
            network: phone.network,
            has_fast_charging: phone.has_fast_charging
          } as Phone))
        })),
      timestamp: new Date()
    };
  }
  
  /**
   * Aggressive cleanup for storage quota issues
   */
  private static aggressiveCleanup(context: ChatContext): ChatContext {
    return {
      ...context,
      conversationHistory: context.conversationHistory.slice(-20), // Keep only last 20 messages
      phoneRecommendations: context.phoneRecommendations
        .slice(-5) // Keep only last 5 recommendations
        .map(rec => ({
          ...rec,
          phones: rec.phones.slice(0, 3).map(phone => ({ // Keep only top 3 phones with minimal data
            id: phone.id,
            name: phone.name,
            brand: phone.brand,
            price_original: phone.price_original
          } as Phone))
        })),
      interactionPatterns: {
        ...context.interactionPatterns,
        // Keep only top interactions
        brandInteractions: Object.fromEntries(
          Object.entries(context.interactionPatterns.brandInteractions)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
        ),
        featureInteractions: Object.fromEntries(
          Object.entries(context.interactionPatterns.featureInteractions)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
        )
      },
      timestamp: new Date()
    };
  }
  
  /**
   * Start automatic cleanup timer
   */
  private static startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      try {
        this.performanceMetrics.cleanupOperations++;
        
        // Clear cache if it's stale
        if (!this.isCacheValid()) {
          this.clearCache();
        }
        
        // Cleanup localStorage if context exists
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const context = JSON.parse(stored);
          const cleanedContext = this.cleanupContext(context);
          
          // Only save if cleanup made changes
          if (JSON.stringify(cleanedContext) !== stored) {
            this.saveContext(cleanedContext);
          }
        }
      } catch (error) {
        console.warn('Cleanup timer error:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }
  
  /**
   * Stop cleanup timer
   */
  static stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Update average time metrics
   */
  private static updateAverageTime(operation: 'save' | 'load', time: number): void {
    if (operation === 'save' && this.performanceMetrics.saveOperations > 0) {
      const previousTotal = this.performanceMetrics.averageSaveTime * (this.performanceMetrics.saveOperations - 1);
      this.performanceMetrics.averageSaveTime = (previousTotal + time) / this.performanceMetrics.saveOperations;
    } else if (operation === 'load' && this.performanceMetrics.loadOperations > 0) {
      const previousTotal = this.performanceMetrics.averageLoadTime * (this.performanceMetrics.loadOperations - 1);
      this.performanceMetrics.averageLoadTime = (previousTotal + time) / this.performanceMetrics.loadOperations;
    }
  }
  
  /**
   * Get performance metrics for monitoring
   */
  static getPerformanceMetrics() {
    const totalCacheOperations = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    return {
      ...this.performanceMetrics,
      cacheHitRate: totalCacheOperations > 0 
        ? (this.performanceMetrics.cacheHits / totalCacheOperations) * 100 
        : 0,
      contextCacheSize: this.contextCache ? JSON.stringify(this.contextCache).length : 0,
      isCacheValid: this.isCacheValid()
    };
  }
  
  /**
   * Reset performance metrics
   */
  static resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      saveOperations: 0,
      loadOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cleanupOperations: 0,
      averageSaveTime: 0,
      averageLoadTime: 0
    };
    this.clearCache();
  }
  
  /**
   * Preload context for better performance
   */
  static preloadContext(): Promise<ChatContext> {
    return new Promise((resolve) => {
      // Use setTimeout to avoid blocking the main thread
      setTimeout(() => {
        const context = this.loadContext();
        resolve(context);
      }, 0);
    });
  }
  
  /**
   * Batch update context to reduce save operations
   */
  private static pendingUpdates: Partial<ChatContext>[] = [];
  private static batchTimer: NodeJS.Timeout | null = null;
  
  static batchUpdateContext(context: ChatContext, updates: Partial<ChatContext>): void {
    this.pendingUpdates.push(updates);
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      try {
        // Apply all pending updates
        let updatedContext = { ...context };
        this.pendingUpdates.forEach(update => {
          updatedContext = { ...updatedContext, ...update };
        });
        
        // Save the batched updates
        this.saveContext(updatedContext);
        
        // Clear pending updates
        this.pendingUpdates = [];
        this.batchTimer = null;
      } catch (error) {
        console.warn('Batch update failed:', error);
        this.pendingUpdates = [];
        this.batchTimer = null;
      }
    }, 100); // 100ms batch window
  }
  
  /**
   * Get storage usage information
   */
  static getStorageInfo(): {
    used: number;
    available: number;
    contextSize: number;
    percentage: number;
  } {
    try {
      const contextData = localStorage.getItem(this.STORAGE_KEY);
      const contextSize = contextData ? contextData.length : 0;
      
      // Estimate total localStorage usage
      let totalUsed = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalUsed += localStorage[key].length + key.length;
        }
      }
      
      // Most browsers have ~5-10MB localStorage limit
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      
      return {
        used: totalUsed,
        available: estimatedLimit - totalUsed,
        contextSize,
        percentage: (totalUsed / estimatedLimit) * 100
      };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return {
        used: 0,
        available: 0,
        contextSize: 0,
        percentage: 0
      };
    }
  }
}