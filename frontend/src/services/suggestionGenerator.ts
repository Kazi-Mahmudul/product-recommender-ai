// Suggestion generation service for creating contextual follow-up suggestions

import { Phone } from '../api/phones';
import { FollowUpSuggestion, SuggestionContext } from '../types/suggestions';

export class SuggestionGenerator {
  /**
   * Generate contextual follow-up suggestions based on current recommendations
   */
  static generateSuggestions(
    phones: Phone[],
    originalQuery: string,
    chatHistory: any[] = []
  ): FollowUpSuggestion[] {
    if (!phones || phones.length === 0) {
      return this.getDefaultSuggestions();
    }

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
   * Generate filter-based suggestions
   */
  private static generateFilterSuggestions(context: SuggestionContext): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    // Battery-focused suggestions
    if (context.missingFeatures.includes('battery') || context.userIntent === 'battery') {
      suggestions.push({
        id: 'filter-battery',
        text: 'Show only phones with best battery',
        icon: '🔋',
        query: 'phones with best battery life above 4000mAh',
        category: 'filter',
        priority: 8
      });
    }

    // Gaming-focused suggestions
    if (context.userIntent === 'gaming' || context.commonFeatures.includes('high_refresh_rate')) {
      suggestions.push({
        id: 'filter-gaming',
        text: 'Which one is better for gaming?',
        icon: '🎮',
        query: 'which of these phones is best for gaming performance',
        category: 'filter',
        priority: 7
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
        priority: 6
      });
    }

    // Camera-focused suggestions
    if (context.userIntent === 'camera' || context.missingFeatures.includes('camera')) {
      suggestions.push({
        id: 'filter-camera',
        text: 'Show phones with better cameras',
        icon: '📸',
        query: 'phones with best camera quality and features',
        category: 'filter',
        priority: 7
      });
    }

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