// Chat context management service for maintaining conversation state

import { Phone } from '../api/phones';
import { ChatMessage } from '../types/chat';

export interface UserPreferences {
  priceRange?: [number, number];
  preferredBrands?: string[];
  importantFeatures?: string[];
  budgetCategory?: 'budget' | 'mid-range' | 'premium';
  primaryUseCase?: 'general' | 'gaming' | 'photography' | 'business';
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
}

export class ChatContextManager {
  private static readonly STORAGE_KEY = 'epick_chat_context';
  private static readonly MAX_HISTORY_LENGTH = 50;
  private static readonly CONTEXT_EXPIRY_HOURS = 24;

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
      }
    };

    this.saveContext(context);
    return context;
  }

  /**
   * Load existing context from storage or create new one
   */
  static loadContext(): ChatContext {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.initializeContext();
      }

      const context: ChatContext = JSON.parse(stored);
      
      // Check if context has expired
      const contextAge = Date.now() - new Date(context.timestamp).getTime();
      const maxAge = this.CONTEXT_EXPIRY_HOURS * 60 * 60 * 1000;
      
      if (contextAge > maxAge) {
        return this.initializeContext();
      }

      // Ensure context has all required properties
      return this.validateAndMigrateContext(context);
    } catch (error) {
      console.warn('Failed to load chat context:', error);
      return this.initializeContext();
    }
  }

  /**
   * Save context to local storage
   */
  static saveContext(context: ChatContext): void {
    try {
      // Limit conversation history size
      const trimmedContext = {
        ...context,
        conversationHistory: context.conversationHistory.slice(-this.MAX_HISTORY_LENGTH),
        timestamp: new Date()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedContext));
    } catch (error) {
      console.warn('Failed to save chat context:', error);
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
    return this.initializeContext();
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
      }
    };
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}