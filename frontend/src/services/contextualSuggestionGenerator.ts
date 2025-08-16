// Contextual suggestion generation service for creating context-aware follow-up suggestions

import { Phone } from '../api/phones';
import { ContextualSuggestion, SuggestionContext } from '../types/suggestions';
import { PhoneRecommendationContext } from './chatContextManager';
import { ContextAnalytics } from './contextAnalytics';

export class ContextualSuggestionGenerator {
  /**
   * Generate contextual suggestions with phone context and comprehensive error handling
   */
  static generateContextualSuggestions(
    phones: Phone[],
    originalQuery: string,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    try {
      // Validate inputs
      if (!phones || !Array.isArray(phones) || phones.length === 0) {
        console.warn('ContextualSuggestionGenerator: No valid phones provided');
        return this.getDefaultContextualSuggestions();
      }

      if (!originalQuery || typeof originalQuery !== 'string' || originalQuery.trim().length === 0) {
        console.warn('ContextualSuggestionGenerator: No valid query provided');
        return this.getDefaultContextualSuggestions();
      }

      // Validate phone context
      const validPhoneContext = Array.isArray(phoneContext) 
        ? phoneContext.filter(ctx => {
            return ctx && 
                   typeof ctx === 'object' && 
                   Array.isArray(ctx.phones) && 
                   ctx.phones.length > 0 &&
                   typeof ctx.originalQuery === 'string' &&
                   typeof ctx.timestamp === 'number';
          })
        : [];

      const context = this.analyzeSuggestionContext(phones, originalQuery);
      const suggestions: ContextualSuggestion[] = [];

      try {
        // Generate contextual comparison suggestions
        suggestions.push(...this.generateContextualComparisonSuggestions(context, validPhoneContext));
      } catch (error) {
        console.warn('ContextualSuggestionGenerator: Failed to generate comparison suggestions:', error);
      }

      try {
        // Generate contextual alternative suggestions
        suggestions.push(...this.generateContextualAlternativeSuggestions(context, validPhoneContext));
      } catch (error) {
        console.warn('ContextualSuggestionGenerator: Failed to generate alternative suggestions:', error);
      }

      try {
        // Generate contextual specification suggestions
        suggestions.push(...this.generateContextualSpecificationSuggestions(context, validPhoneContext));
      } catch (error) {
        console.warn('ContextualSuggestionGenerator: Failed to generate specification suggestions:', error);
      }

      try {
        // Generate contextual filter suggestions
        suggestions.push(...this.generateContextualFilterSuggestions(context, validPhoneContext));
      } catch (error) {
        console.warn('ContextualSuggestionGenerator: Failed to generate filter suggestions:', error);
      }

      try {
        // Generate contextual performance suggestions
        suggestions.push(...this.generateContextualPerformanceSuggestions(context, validPhoneContext));
      } catch (error) {
        console.warn('ContextualSuggestionGenerator: Failed to generate performance suggestions:', error);
      }

      try {
        // Generate contextual practical suggestions (real-world usage)
        suggestions.push(...this.generateContextualPracticalSuggestions(context, validPhoneContext));
      } catch (error) {
        console.warn('ContextualSuggestionGenerator: Failed to generate practical suggestions:', error);
      }

      // Filter out invalid suggestions and sort by priority
      const validSuggestions = suggestions.filter(suggestion => {
        return suggestion && 
               typeof suggestion === 'object' &&
               typeof suggestion.id === 'string' &&
               typeof suggestion.text === 'string' &&
               typeof suggestion.query === 'string' &&
               typeof suggestion.contextualQuery === 'string' &&
               typeof suggestion.priority === 'number';
      });

      if (validSuggestions.length === 0) {
        console.warn('ContextualSuggestionGenerator: No valid suggestions generated, falling back to defaults');
        
        // Track fallback
        try {
          ContextAnalytics.trackContextFallback('No valid contextual suggestions generated', 'unknown');
        } catch (error) {
          console.warn('Failed to track context fallback analytics:', error);
        }
        
        return this.getDefaultContextualSuggestions();
      }

      // Sort by priority and return top 5
      const finalSuggestions = validSuggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);

      // Track suggestion generation analytics
      try {
        ContextAnalytics.trackSuggestionGenerated(
          finalSuggestions,
          true, // contextUsed = true
          'unknown' // sessionId - would need to be passed in
        );
      } catch (error) {
        console.warn('Failed to track suggestion generation analytics:', error);
      }

      return finalSuggestions;

    } catch (error) {
      console.error('ContextualSuggestionGenerator: Failed to generate contextual suggestions:', error);
      return this.getDefaultContextualSuggestions();
    }
  }

  /**
   * Enhance query with phone context (comprehensive enhancement for any query type)
   */
  static enhanceQueryWithContext(
    baseQuery: string,
    phoneContext: PhoneRecommendationContext[]
  ): string {
    if (!phoneContext || phoneContext.length === 0) {
      return baseQuery;
    }

    const recentContext = phoneContext[0]; // Most recent context
    const phoneNames = recentContext.phones.map(p => p.name).slice(0, 3); // Limit to 3 phones
    const lowerQuery = baseQuery.toLowerCase();

    // Comprehensive enhancement patterns for different query types
    
    // Comparison queries
    if (lowerQuery.includes('better') || lowerQuery.includes('superior') || lowerQuery.includes('best')) {
      return `${baseQuery} than ${phoneNames.join(', ')}`;
    }
    
    // Alternative/replacement queries
    if (lowerQuery.includes('cheaper') || lowerQuery.includes('alternative') || lowerQuery.includes('instead')) {
      const priceRange = recentContext.metadata.priceRange;
      return `${baseQuery} to ${phoneNames.join(', ')} under ${priceRange.min} BDT`;
    }
    
    // Direct comparison queries
    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
      return `${baseQuery} with ${phoneNames.join(' vs ')}`;
    }
    
    // Similar/equivalent queries
    if (lowerQuery.includes('similar') || lowerQuery.includes('like') || lowerQuery.includes('equivalent')) {
      return `${baseQuery} to ${phoneNames.join(', ')}`;
    }

    // Specification queries
    if (lowerQuery.includes('spec') || lowerQuery.includes('feature') || lowerQuery.includes('detail')) {
      return `${baseQuery} of ${phoneNames.join(', ')}`;
    }

    // Performance queries
    if (lowerQuery.includes('performance') || lowerQuery.includes('speed') || lowerQuery.includes('fast')) {
      return `${baseQuery} comparison between ${phoneNames.join(', ')}`;
    }

    // Camera queries
    if (lowerQuery.includes('camera') || lowerQuery.includes('photo') || lowerQuery.includes('picture')) {
      return `${baseQuery} comparison for ${phoneNames.join(', ')}`;
    }

    // Battery queries
    if (lowerQuery.includes('battery') || lowerQuery.includes('charging') || lowerQuery.includes('power')) {
      return `${baseQuery} analysis for ${phoneNames.join(', ')}`;
    }

    // Gaming queries
    if (lowerQuery.includes('gaming') || lowerQuery.includes('game') || lowerQuery.includes('fps')) {
      return `${baseQuery} performance on ${phoneNames.join(', ')}`;
    }

    // Display queries
    if (lowerQuery.includes('display') || lowerQuery.includes('screen') || lowerQuery.includes('refresh')) {
      return `${baseQuery} quality on ${phoneNames.join(', ')}`;
    }

    // Price queries
    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('expensive')) {
      return `${baseQuery} comparison for ${phoneNames.join(', ')}`;
    }

    // Storage queries
    if (lowerQuery.includes('storage') || lowerQuery.includes('memory') || lowerQuery.includes('space')) {
      return `${baseQuery} options for ${phoneNames.join(', ')}`;
    }

    // Durability queries
    if (lowerQuery.includes('durable') || lowerQuery.includes('build') || lowerQuery.includes('quality')) {
      return `${baseQuery} assessment of ${phoneNames.join(', ')}`;
    }

    // Software queries
    if (lowerQuery.includes('software') || lowerQuery.includes('update') || lowerQuery.includes('android') || lowerQuery.includes('ios')) {
      return `${baseQuery} support for ${phoneNames.join(', ')}`;
    }

    // Connectivity queries
    if (lowerQuery.includes('5g') || lowerQuery.includes('wifi') || lowerQuery.includes('bluetooth') || lowerQuery.includes('network')) {
      return `${baseQuery} capabilities of ${phoneNames.join(', ')}`;
    }

    // General queries - add context in a natural way
    if (lowerQuery.includes('which') || lowerQuery.includes('what') || lowerQuery.includes('how')) {
      return `${baseQuery} among ${phoneNames.join(', ')}`;
    }

    // Default enhancement for any other query type
    return `${baseQuery} (regarding ${phoneNames.join(', ')})`;
  }

  /**
   * Generate contextual comparison suggestions
   */
  private static generateContextualComparisonSuggestions(
    context: SuggestionContext,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    const suggestions: ContextualSuggestion[] = [];

    if (context.phones.length >= 2) {
      const phoneNames = context.phones.map(p => p.name);
      
      suggestions.push({
        id: 'contextual-compare-detailed',
        text: 'Compare these in detail',
        icon: '⚖️',
        query: `compare ${phoneNames.slice(0, 3).join(' vs ')}`,
        contextualQuery: `compare ${phoneNames.slice(0, 3).join(' vs ')} in detail with specifications`,
        category: 'comparison',
        contextType: 'comparison',
        priority: 9,
        referencedPhones: phoneNames.slice(0, 3),
        contextIndicator: {
          icon: '🔗',
          tooltip: `Compare ${phoneNames.slice(0, 3).join(', ')}`,
          description: 'Detailed comparison of recommended phones'
        },
        fallbackQuery: 'compare phones in detail'
      });
    }

    // Brand comparison if multiple brands
    if (context.brands.length > 1) {
      const phoneNames = context.phones.map(p => p.name);
      
      suggestions.push({
        id: 'contextual-compare-brands',
        text: `Compare ${context.brands.slice(0, 2).join(' vs ')}`,
        icon: '🏷️',
        query: `compare ${context.brands.slice(0, 2).join(' vs ')} phones`,
        contextualQuery: `compare ${context.brands.slice(0, 2).join(' vs ')} phones from my recommendations`,
        category: 'comparison',
        contextType: 'comparison',
        priority: 6,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `Compare brands from your recommendations`,
          description: 'Brand comparison based on your results'
        },
        fallbackQuery: `compare ${context.brands.slice(0, 2).join(' vs ')} phones`
      });
    }

    return suggestions;
  }

  /**
   * Generate contextual alternative suggestions
   */
  private static generateContextualAlternativeSuggestions(
    context: SuggestionContext,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    const suggestions: ContextualSuggestion[] = [];
    const phoneNames = context.phones.map(p => p.name);

    // Budget alternatives
    if (context.userIntent !== 'budget' && context.priceRange[0] > 15000) {
      const targetPrice = Math.floor(context.priceRange[0] * 0.8);
      
      suggestions.push({
        id: 'contextual-alt-budget',
        text: 'Show cheaper alternatives',
        icon: '💰',
        query: `phones similar to these but under ${targetPrice} taka`,
        contextualQuery: `phones similar to ${phoneNames.join(', ')} but under ${targetPrice} BDT`,
        category: 'alternative',
        contextType: 'alternative',
        priority: 7,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `Cheaper alternatives to ${phoneNames.slice(0, 2).join(', ')}`,
          description: 'Budget alternatives to your recommendations'
        },
        fallbackQuery: `phones under ${targetPrice} taka`
      });
    }

    // Premium alternatives
    if (context.userIntent !== 'premium' && context.priceRange[1] < 80000) {
      suggestions.push({
        id: 'contextual-alt-premium',
        text: 'Show premium options',
        icon: '✨',
        query: `premium phones with better features than these`,
        contextualQuery: `premium phones with better features than ${phoneNames.join(', ')}`,
        category: 'alternative',
        contextType: 'alternative',
        priority: 6,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `Premium upgrades from ${phoneNames.slice(0, 2).join(', ')}`,
          description: 'Premium alternatives to your recommendations'
        },
        fallbackQuery: 'premium phones with better features'
      });
    }

    // Similar phones from different brands
    if (context.brands.length >= 1) {
      const otherBrands = ['Samsung', 'Apple', 'Xiaomi', 'OnePlus', 'Realme', 'Oppo']
        .filter(brand => !context.brands.includes(brand))
        .slice(0, 2);
      
      if (otherBrands.length > 0) {
        suggestions.push({
          id: 'contextual-alt-brands',
          text: `Similar ${otherBrands.join('/')} phones`,
          icon: '🔄',
          query: `similar phones from ${otherBrands.join(' or ')}`,
          contextualQuery: `${otherBrands.join(' or ')} phones similar to ${phoneNames.join(', ')}`,
          category: 'alternative',
          contextType: 'alternative',
          priority: 5,
          referencedPhones: phoneNames,
          contextIndicator: {
            icon: '🔗',
            tooltip: `${otherBrands.join('/')} alternatives to your results`,
            description: 'Similar phones from other brands'
          },
          fallbackQuery: `phones from ${otherBrands.join(' or ')}`
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate contextual specification suggestions
   */
  private static generateContextualSpecificationSuggestions(
    context: SuggestionContext,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    const suggestions: ContextualSuggestion[] = [];
    const phoneNames = context.phones.map(p => p.name);

    // Camera-focused suggestions
    if (context.missingFeatures.includes('camera') || context.userIntent === 'camera') {
      suggestions.push({
        id: 'contextual-spec-camera',
        text: 'Show phones with better cameras',
        icon: '📸',
        query: 'phones with best camera quality and features',
        contextualQuery: `phones with better cameras than ${phoneNames.join(', ')}`,
        category: 'filter',
        contextType: 'comparison',
        priority: 8,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `Better cameras than ${phoneNames.slice(0, 2).join(', ')}`,
          description: 'Phones with superior camera specs'
        },
        fallbackQuery: 'phones with best camera quality'
      });
    }

    // Battery-focused suggestions
    if (context.missingFeatures.includes('battery') || context.userIntent === 'battery') {
      suggestions.push({
        id: 'contextual-spec-battery',
        text: 'Show phones with better battery',
        icon: '🔋',
        query: 'phones with best battery life above 4000mAh',
        contextualQuery: `phones with better battery life than ${phoneNames.join(', ')}`,
        category: 'filter',
        contextType: 'comparison',
        priority: 8,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `Better battery than ${phoneNames.slice(0, 2).join(', ')}`,
          description: 'Phones with superior battery capacity'
        },
        fallbackQuery: 'phones with best battery life'
      });
    }

    // Performance/Gaming suggestions
    if (context.userIntent === 'gaming' || context.commonFeatures.includes('high_refresh_rate')) {
      suggestions.push({
        id: 'contextual-spec-performance',
        text: 'Show better gaming phones',
        icon: '🎮',
        query: 'which of these phones is best for gaming performance',
        contextualQuery: `gaming phones better than ${phoneNames.join(', ')} for performance`,
        category: 'filter',
        contextType: 'comparison',
        priority: 7,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `Better gaming performance than ${phoneNames.slice(0, 2).join(', ')}`,
          description: 'Superior gaming performance phones'
        },
        fallbackQuery: 'best gaming phones'
      });
    }

    return suggestions;
  }

  /**
   * Generate contextual filter suggestions
   */
  private static generateContextualFilterSuggestions(
    context: SuggestionContext,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    const suggestions: ContextualSuggestion[] = [];
    const phoneNames = context.phones.map(p => p.name);

    // 5G connectivity suggestion
    if (!context.commonFeatures.includes('5g')) {
      suggestions.push({
        id: 'contextual-filter-5g',
        text: 'Do these have 5G?',
        icon: '📶',
        query: 'do these phones support 5G network',
        contextualQuery: `do ${phoneNames.join(', ')} support 5G network`,
        category: 'filter',
        contextType: 'filter',
        priority: 6,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `5G support in ${phoneNames.slice(0, 2).join(', ')}`,
          description: '5G connectivity check for your phones'
        },
        fallbackQuery: 'phones with 5G support'
      });
    }

    // Display details
    if (context.commonFeatures.includes('high_refresh_rate') || context.missingFeatures.includes('display')) {
      suggestions.push({
        id: 'contextual-filter-display',
        text: 'Tell me about the displays',
        icon: '📱',
        query: 'tell me detailed information about the display quality and features',
        contextualQuery: `tell me about the display quality of ${phoneNames.join(', ')}`,
        category: 'detail',
        contextType: 'specification',
        priority: 5,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `Display details for ${phoneNames.slice(0, 2).join(', ')}`,
          description: 'Display specifications of your phones'
        },
        fallbackQuery: 'phone display quality information'
      });
    }

    return suggestions;
  }

  /**
   * Generate contextual performance suggestions
   */
  private static generateContextualPerformanceSuggestions(
    context: SuggestionContext,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    const suggestions: ContextualSuggestion[] = [];
    const phoneNames = context.phones.map(p => p.name);

    // Speed and responsiveness
    suggestions.push({
      id: 'contextual-perf-speed',
      text: 'Which is fastest in daily use?',
      icon: '⚡',
      query: 'which phone is fastest for daily tasks',
      contextualQuery: `which phone is fastest for daily tasks among ${phoneNames.join(', ')}`,
      category: 'filter',
      contextType: 'specification',
      priority: 6,
      referencedPhones: phoneNames,
      contextIndicator: {
        icon: '🔗',
        tooltip: `Speed comparison for ${phoneNames.slice(0, 2).join(', ')}`,
        description: 'Daily performance comparison'
      },
      fallbackQuery: 'fastest phones for daily use'
    });

    // Multitasking capability
    suggestions.push({
      id: 'contextual-perf-multitask',
      text: 'Which handles multitasking better?',
      icon: '🔄',
      query: 'which phone is better for multitasking',
      contextualQuery: `multitasking performance comparison between ${phoneNames.join(', ')}`,
      category: 'filter',
      contextType: 'specification',
      priority: 5,
      referencedPhones: phoneNames,
      contextIndicator: {
        icon: '🔗',
        tooltip: `Multitasking comparison for ${phoneNames.slice(0, 2).join(', ')}`,
        description: 'Multitasking performance analysis'
      },
      fallbackQuery: 'phones with best multitasking'
    });

    return suggestions;
  }

  /**
   * Generate contextual practical suggestions (real-world usage scenarios)
   */
  private static generateContextualPracticalSuggestions(
    context: SuggestionContext,
    phoneContext: PhoneRecommendationContext[]
  ): ContextualSuggestion[] {
    const suggestions: ContextualSuggestion[] = [];
    const phoneNames = context.phones.map(p => p.name);

    // Long-term value
    suggestions.push({
      id: 'contextual-practical-longevity',
      text: 'Which will last longer?',
      icon: '🕐',
      query: 'which phone will last longer and age better',
      contextualQuery: `longevity and future-proofing comparison of ${phoneNames.join(', ')}`,
      category: 'detail',
      contextType: 'specification',
      priority: 5,
      referencedPhones: phoneNames,
      contextIndicator: {
        icon: '🔗',
        tooltip: `Long-term value of ${phoneNames.slice(0, 2).join(', ')}`,
        description: 'Future-proofing and longevity analysis'
      },
      fallbackQuery: 'phones with best long-term value'
    });

    // Ease of use
    suggestions.push({
      id: 'contextual-practical-usability',
      text: 'Which is easier to use?',
      icon: '👆',
      query: 'which phone is most user-friendly',
      contextualQuery: `user experience and ease of use comparison for ${phoneNames.join(', ')}`,
      category: 'detail',
      contextType: 'specification',
      priority: 4,
      referencedPhones: phoneNames,
      contextIndicator: {
        icon: '🔗',
        tooltip: `Usability comparison for ${phoneNames.slice(0, 2).join(', ')}`,
        description: 'User experience analysis'
      },
      fallbackQuery: 'most user-friendly phones'
    });

    // Value for money
    suggestions.push({
      id: 'contextual-practical-value',
      text: 'Which offers best value?',
      icon: '💎',
      query: 'which phone offers the best value for money',
      contextualQuery: `value for money analysis of ${phoneNames.join(', ')}`,
      category: 'detail',
      contextType: 'comparison',
      priority: 7,
      referencedPhones: phoneNames,
      contextIndicator: {
        icon: '🔗',
        tooltip: `Value comparison for ${phoneNames.slice(0, 2).join(', ')}`,
        description: 'Value for money analysis'
      },
      fallbackQuery: 'phones with best value for money'
    });

    // Specific use cases
    const useCase = this.inferUseCaseFromContext(context, phoneContext);
    if (useCase) {
      suggestions.push({
        id: 'contextual-practical-usecase',
        text: `Best for ${useCase}?`,
        icon: '🎯',
        query: `which phone is best for ${useCase}`,
        contextualQuery: `which phone is best for ${useCase} among ${phoneNames.join(', ')}`,
        category: 'filter',
        contextType: 'specification',
        priority: 6,
        referencedPhones: phoneNames,
        contextIndicator: {
          icon: '🔗',
          tooltip: `${useCase} suitability for ${phoneNames.slice(0, 2).join(', ')}`,
          description: `${useCase} performance comparison`
        },
        fallbackQuery: `phones best for ${useCase}`
      });
    }

    return suggestions;
  }

  /**
   * Infer specific use case from context and query patterns
   */
  private static inferUseCaseFromContext(
    context: SuggestionContext,
    phoneContext: PhoneRecommendationContext[]
  ): string | null {
    // Check recent queries for use case patterns
    if (phoneContext.length > 0) {
      const recentQuery = phoneContext[0].originalQuery.toLowerCase();
      
      if (recentQuery.includes('student') || recentQuery.includes('study')) return 'students';
      if (recentQuery.includes('business') || recentQuery.includes('work') || recentQuery.includes('office')) return 'business use';
      if (recentQuery.includes('elderly') || recentQuery.includes('senior') || recentQuery.includes('parent')) return 'elderly users';
      if (recentQuery.includes('travel') || recentQuery.includes('trip')) return 'travel';
      if (recentQuery.includes('content') || recentQuery.includes('creator') || recentQuery.includes('youtube')) return 'content creation';
      if (recentQuery.includes('social') || recentQuery.includes('instagram') || recentQuery.includes('tiktok')) return 'social media';
    }

    // Infer from phone characteristics
    if (context.userIntent === 'gaming') return 'gaming';
    if (context.userIntent === 'camera') return 'photography';
    if (context.userIntent === 'battery') return 'heavy usage';
    
    return null;
  }

  /**
   * Analyze suggestion context (reuse from original SuggestionGenerator)
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
   * Get default contextual suggestions when no context is available
   */
  private static getDefaultContextualSuggestions(): ContextualSuggestion[] {
    return [
      {
        id: 'default-contextual-budget',
        text: 'Show budget phones',
        icon: '💰',
        query: 'best budget phones under 25000 taka',
        contextualQuery: 'best budget phones under 25000 taka',
        category: 'filter',
        contextType: 'general',
        priority: 8,
        referencedPhones: [],
        contextIndicator: {
          icon: '🔍',
          tooltip: 'General budget phone search',
          description: 'Budget phone recommendations'
        },
        fallbackQuery: 'best budget phones under 25000 taka'
      },
      {
        id: 'default-contextual-camera',
        text: 'Phones with best camera',
        icon: '📸',
        query: 'phones with best camera quality',
        contextualQuery: 'phones with best camera quality',
        category: 'filter',
        contextType: 'general',
        priority: 7,
        referencedPhones: [],
        contextIndicator: {
          icon: '🔍',
          tooltip: 'General camera phone search',
          description: 'Best camera phone recommendations'
        },
        fallbackQuery: 'phones with best camera quality'
      },
      {
        id: 'default-contextual-gaming',
        text: 'Gaming phones',
        icon: '🎮',
        query: 'best phones for gaming',
        contextualQuery: 'best phones for gaming',
        category: 'filter',
        contextType: 'general',
        priority: 6,
        referencedPhones: [],
        contextIndicator: {
          icon: '🔍',
          tooltip: 'General gaming phone search',
          description: 'Gaming phone recommendations'
        },
        fallbackQuery: 'best phones for gaming'
      }
    ];
  }
}