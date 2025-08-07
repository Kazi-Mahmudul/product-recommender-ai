// Suggestion generation service for creating contextual follow-up suggestions

import { Phone } from '../api/phones';
import { FollowUpSuggestion, SuggestionContext, ContextualSuggestion } from '../types/suggestions';
import { ContextualSuggestionGenerator } from './contextualSuggestionGenerator';
import { ChatContextManager, PhoneRecommendationContext } from './chatContextManager';

export class SuggestionGenerator {
  /**
   * Generate contextual follow-up suggestions based on current recommendations
   * Enhanced to use contextual logic when phone context is available
   */
  static generateSuggestions(
    phones: Phone[],
    originalQuery: string,
    chatHistory: any[] = [],
    chatContext?: any
  ): (FollowUpSuggestion | ContextualSuggestion)[] {
    if (!phones || phones.length === 0) {
      return this.getDefaultSuggestions();
    }

    // Try to use contextual suggestions if context is available
    if (chatContext) {
      try {
        const recentPhoneContext = ChatContextManager.getRecentPhoneContext(chatContext, 600000); // 10 minutes
        
        if (recentPhoneContext.length > 0) {
          // Use contextual suggestion generator
          return ContextualSuggestionGenerator.generateContextualSuggestions(
            phones,
            originalQuery,
            recentPhoneContext
          );
        }
      } catch (error) {
        console.warn('Failed to generate contextual suggestions, falling back to regular suggestions:', error);
      }
    }

    // Fallback to regular suggestion generation
    return this.generateRegularSuggestions(phones, originalQuery, chatHistory);
  }

  /**
   * Generate regular (non-contextual) suggestions - legacy behavior
   */
  static generateRegularSuggestions(
    phones: Phone[],
    originalQuery: string,
    chatHistory: any[] = []
  ): FollowUpSuggestion[] {
    const context = this.analyzeSuggestionContext(phones, originalQuery);
    const suggestions: FollowUpSuggestion[] = [];

    // Generate filter-based suggestions
    suggestions.push(...this.generateFilterSuggestions(context));

    // Generate comparison suggestions
    suggestions.push(...this.generateComparisonSuggestions(context));

    // Generate detail suggestions
    suggestions.push(...this.generateDetailSuggestions(context));

    // Generate alternative suggestions
    suggestions.push(...this.generateAlternativeSuggestions(context));

    // Sort by priority and return top 5
    return suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }

  /**
   * Generate suggestions with explicit context (for migration support)
   */
  static generateSuggestionsWithContext(
    phones: Phone[],
    originalQuery: string,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    return ContextualSuggestionGenerator.generateContextualSuggestions(
      phones,
      originalQuery,
      phoneContext
    );
  }

  /**
   * Check if contextual suggestions are available
   */
  static hasContextualSuggestionsAvailable(chatContext?: any): boolean {
    if (!chatContext) return false;
    
    try {
      const recentContext = ChatContextManager.getRecentPhoneContext(chatContext, 600000);
      return recentContext.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get suggestion generation mode for debugging
   */
  static getSuggestionMode(chatContext?: any): 'contextual' | 'regular' | 'default' {
    if (!chatContext) return 'regular';
    
    try {
      const recentContext = ChatContextManager.getRecentPhoneContext(chatContext, 600000);
      return recentContext.length > 0 ? 'contextual' : 'regular';
    } catch (error) {
      return 'regular';
    }
  }

  /**
   * Analyze the current context to understand user intent and phone characteristics
   */
  private static analyzeSuggestionContext(
    phones: Phone[],
    originalQuery: string
  ): SuggestionContext {
    const prices = phones
      .map(p => p.price_original || 0)
      .filter(p => p > 0);
    
    const priceRange: [number, number] = prices.length > 0 
      ? [Math.min(...prices), Math.max(...prices)]
      : [0, 0];

    const brands = Array.from(new Set(phones.map(p => p.brand).filter(Boolean)));
    
    const commonFeatures = this.extractCommonFeatures(phones);
    const missingFeatures = this.identifyMissingFeatures(phones);
    const userIntent = this.inferUserIntent(originalQuery, phones);

    return {
      phones,
      commonFeatures,
      priceRange,
      brands,
      missingFeatures,
      userIntent
    };
  }

  /**
   * Generate filter-based suggestions (enhanced to handle any phone query)
   */
  private static generateFilterSuggestions(context: SuggestionContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    // Battery-focused suggestions
    if (context.missingFeatures.includes('battery') || context.userIntent === 'battery') {
      suggestions.push({
        id: 'filter-battery',
        text: 'Show phones with better battery',
        icon: '🔋',
        query: 'phones with better battery life than these',
        category: 'filter',
        priority: 8
      });
    }

    // Gaming-focused suggestions
    if (context.userIntent === 'gaming' || context.commonFeatures.includes('high_refresh_rate')) {
      suggestions.push({
        id: 'filter-gaming',
        text: 'Which is better for gaming?',
        icon: '🎮',
        query: 'which of these phones is best for gaming performance',
        category: 'filter',
        priority: 7
      });
    }

    // Camera-focused suggestions
    if (context.userIntent === 'camera' || context.missingFeatures.includes('camera')) {
      suggestions.push({
        id: 'filter-camera',
        text: 'Show phones with better cameras',
        icon: '📸',
        query: 'phones with better camera quality than these',
        category: 'filter',
        priority: 7
      });
    }

    // Performance/Speed suggestions
    if (context.userIntent === 'general' || context.userIntent === 'premium') {
      suggestions.push({
        id: 'filter-performance',
        text: 'Which is fastest?',
        icon: '⚡',
        query: 'which of these phones has the best performance and speed',
        category: 'filter',
        priority: 6
      });
    }

    // Storage suggestions
    const lowStorageCount = context.phones.filter(p => 
      !p.storage_gb || p.storage_gb < 128
    ).length;
    if (lowStorageCount >= context.phones.length * 0.5) {
      suggestions.push({
        id: 'filter-storage',
        text: 'Show phones with more storage',
        icon: '💾',
        query: 'phones with more storage than these',
        category: 'filter',
        priority: 6
      });
    }

    // 5G connectivity suggestion
    if (!context.commonFeatures.includes('5g')) {
      suggestions.push({
        id: 'filter-5g',
        text: 'Do these have 5G?',
        icon: '📶',
        query: 'do these phones support 5G network',
        category: 'filter',
        priority: 5
      });
    }

    // Build quality and durability
    suggestions.push({
      id: 'filter-durability',
      text: 'Which is most durable?',
      icon: '🛡️',
      query: 'which of these phones is most durable and has best build quality',
      category: 'filter',
      priority: 4
    });

    // Software and updates
    suggestions.push({
      id: 'filter-software',
      text: 'Tell me about software updates',
      icon: '🔄',
      query: 'which phones get the best software updates and support',
      category: 'filter',
      priority: 4
    });

    return suggestions;
  }

  /**
   * Generate comparison suggestions
   */
  private static generateComparisonSuggestions(context: SuggestionContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    if (context.phones.length >= 2) {
      suggestions.push({
        id: 'compare-detailed',
        text: 'Compare these in detail',
        icon: '⚖️',
        query: `compare ${context.phones.slice(0, 3).map(p => p.name).join(' vs ')}`,
        category: 'comparison',
        priority: 9
      });
    }

    // Brand comparison if multiple brands
    if (context.brands.length > 1) {
      suggestions.push({
        id: 'compare-brands',
        text: `Compare ${context.brands.slice(0, 2).join(' vs ')}`,
        icon: '🏷️',
        query: `compare ${context.brands.slice(0, 2).join(' vs ')} phones`,
        category: 'comparison',
        priority: 6
      });
    }

    return suggestions;
  }

  /**
   * Generate detail-focused suggestions
   */
  private static generateDetailSuggestions(context: SuggestionContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    // Display details
    if (context.commonFeatures.includes('high_refresh_rate') || context.missingFeatures.includes('display')) {
      suggestions.push({
        id: 'detail-display',
        text: 'Tell me more about the display',
        icon: '📱',
        query: 'tell me detailed information about the display quality and features',
        category: 'detail',
        priority: 5
      });
    }

    // Performance details
    if (context.userIntent === 'gaming' || context.userIntent === 'premium') {
      suggestions.push({
        id: 'detail-performance',
        text: 'Show performance details',
        icon: '⚡',
        query: 'show detailed performance specifications and benchmarks',
        category: 'detail',
        priority: 5
      });
    }

    return suggestions;
  }

  /**
   * Generate alternative suggestions
   */
  private static generateAlternativeSuggestions(context: SuggestionContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    // Budget alternatives
    if (context.userIntent !== 'budget' && context.priceRange[0] > 15000) {
      suggestions.push({
        id: 'alt-budget',
        text: 'Show cheaper alternatives',
        icon: '💰',
        query: `phones similar to these but under ${Math.floor(context.priceRange[0] * 0.8)} taka`,
        category: 'alternative',
        priority: 4
      });
    }

    // Premium alternatives
    if (context.userIntent !== 'premium' && context.priceRange[1] < 80000) {
      suggestions.push({
        id: 'alt-premium',
        text: 'Show premium options',
        icon: '✨',
        query: `premium phones with better features than these`,
        category: 'alternative',
        priority: 4
      });
    }

    return suggestions;
  }

  /**
   * Extract common features from phones
   */
  private static extractCommonFeatures(phones: Phone[]): string[] {
    const features: string[] = [];

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

    return features;
  }

  /**
   * Identify missing or weak features
   */
  private static identifyMissingFeatures(phones: Phone[]): string[] {
    const missing: string[] = [];

    // Check battery capacity
    const lowBatteryCount = phones.filter(p => 
      !p.battery_capacity_numeric || p.battery_capacity_numeric < 4000
    ).length;
    if (lowBatteryCount >= phones.length * 0.5) {
      missing.push('battery');
    }

    // Check camera quality
    const lowCameraCount = phones.filter(p => 
      !p.camera_score || p.camera_score < 7
    ).length;
    if (lowCameraCount >= phones.length * 0.5) {
      missing.push('camera');
    }

    // Check display quality
    const lowDisplayCount = phones.filter(p => 
      !p.display_score || p.display_score < 7
    ).length;
    if (lowDisplayCount >= phones.length * 0.5) {
      missing.push('display');
    }

    return missing;
  }

  /**
   * Infer user intent from query and phone characteristics
   */
  private static inferUserIntent(
    query: string, 
    phones: Phone[]
  ): 'budget' | 'premium' | 'gaming' | 'camera' | 'battery' | 'general' {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('budget') || lowerQuery.includes('cheap') || lowerQuery.includes('under')) {
      return 'budget';
    }
    if (lowerQuery.includes('premium') || lowerQuery.includes('flagship') || lowerQuery.includes('best')) {
      return 'premium';
    }
    if (lowerQuery.includes('gaming') || lowerQuery.includes('performance')) {
      return 'gaming';
    }
    if (lowerQuery.includes('camera') || lowerQuery.includes('photo')) {
      return 'camera';
    }
    if (lowerQuery.includes('battery') || lowerQuery.includes('charging')) {
      return 'battery';
    }

    // Infer from phone characteristics
    const avgPrice = phones.reduce((sum, p) => sum + (p.price_original || 0), 0) / phones.length;
    if (avgPrice > 60000) return 'premium';
    if (avgPrice < 20000) return 'budget';

    return 'general';
  }

  /**
   * Get default suggestions when no phones are available
   */
  private static getDefaultSuggestions(): FollowUpSuggestion[] {
    return [
      {
        id: 'default-budget',
        text: 'Show budget phones',
        icon: '💰',
        query: 'best budget phones under 25000 taka',
        category: 'filter',
        priority: 8
      },
      {
        id: 'default-camera',
        text: 'Phones with best camera',
        icon: '📸',
        query: 'phones with best camera quality',
        category: 'filter',
        priority: 7
      },
      {
        id: 'default-gaming',
        text: 'Gaming phones',
        icon: '🎮',
        query: 'best phones for gaming',
        category: 'filter',
        priority: 6
      }
    ];
  }
}