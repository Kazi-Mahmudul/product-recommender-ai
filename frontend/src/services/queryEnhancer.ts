// Query enhancement service for adding phone context to user queries
import { PhoneRecommendationContext } from './chatContextManager';

export interface QueryEnhancementResult {
  enhancedQuery: string;
  originalQuery: string;
  contextUsed: boolean;
  referencedPhones: string[];
  enhancementType: 'comparison' | 'specification' | 'alternative' | 'general' | 'none';
}

export class QueryEnhancer {
  /**
   * Enhance user query with phone context for any type of phone-related question
   */
  static enhanceQuery(
    originalQuery: string,
    phoneContext: PhoneRecommendationContext[]
  ): QueryEnhancementResult {
    try {
      // Validate inputs
      if (!originalQuery || typeof originalQuery !== 'string' || originalQuery.trim().length === 0) {
        console.warn('QueryEnhancer: Invalid or empty query provided');
        return {
          enhancedQuery: originalQuery || '',
          originalQuery: originalQuery || '',
          contextUsed: false,
          referencedPhones: [],
          enhancementType: 'none'
        };
      }

      if (!phoneContext || !Array.isArray(phoneContext) || phoneContext.length === 0) {
        return {
          enhancedQuery: originalQuery,
          originalQuery,
          contextUsed: false,
          referencedPhones: [],
          enhancementType: 'none'
        };
      }

      // Validate and get the most recent context
      const validContexts = phoneContext.filter(ctx => {
        return ctx && 
               typeof ctx === 'object' &&
               Array.isArray(ctx.phones) &&
               ctx.phones.length > 0 &&
               typeof ctx.originalQuery === 'string' &&
               typeof ctx.timestamp === 'number';
      });

      if (validContexts.length === 0) {
        console.warn('QueryEnhancer: No valid phone contexts available');
        return {
          enhancedQuery: originalQuery,
          originalQuery,
          contextUsed: false,
          referencedPhones: [],
          enhancementType: 'none'
        };
      }

      const recentContext = validContexts[0]; // Most recent valid context
      
      // Validate phone names
      const phoneNames = recentContext.phones
        .map(p => p && p.name ? p.name : '')
        .filter(name => name.length > 0);

      if (phoneNames.length === 0) {
        console.warn('QueryEnhancer: No valid phone names found in context');
        return {
          enhancedQuery: originalQuery,
          originalQuery,
          contextUsed: false,
          referencedPhones: [],
          enhancementType: 'none'
        };
      }

      const lowerQuery = originalQuery.toLowerCase().trim();

      // Comprehensive query enhancement patterns
      const enhancementResult = this.applyEnhancementPatterns(
        originalQuery,
        lowerQuery,
        phoneNames,
        recentContext
      );

      // Validate enhancement result
      if (!enhancementResult || typeof enhancementResult.enhanced !== 'string') {
        console.warn('QueryEnhancer: Invalid enhancement result');
        return {
          enhancedQuery: originalQuery,
          originalQuery,
          contextUsed: false,
          referencedPhones: [],
          enhancementType: 'none'
        };
      }

      return {
        enhancedQuery: enhancementResult.enhanced,
        originalQuery,
        contextUsed: enhancementResult.contextUsed,
        referencedPhones: enhancementResult.contextUsed ? phoneNames : [],
        enhancementType: enhancementResult.type
      };

    } catch (error) {
      console.error('QueryEnhancer: Failed to enhance query:', error);
      return {
        enhancedQuery: originalQuery || '',
        originalQuery: originalQuery || '',
        contextUsed: false,
        referencedPhones: [],
        enhancementType: 'none'
      };
    }
  }

  /**
   * Apply comprehensive enhancement patterns for any phone query
   */
  private static applyEnhancementPatterns(
    originalQuery: string,
    lowerQuery: string,
    phoneNames: string[],
    context: PhoneRecommendationContext
  ): { enhanced: string; contextUsed: boolean; type: QueryEnhancementResult['enhancementType'] } {
    
    // Comparison queries - "better", "best", "superior", "which is"
    if (this.isComparisonQuery(lowerQuery)) {
      return {
        enhanced: this.enhanceComparisonQuery(originalQuery, lowerQuery, phoneNames),
        contextUsed: true,
        type: 'comparison'
      };
    }

    // Specification queries - "specs", "features", "details", "tell me about"
    if (this.isSpecificationQuery(lowerQuery)) {
      return {
        enhanced: this.enhanceSpecificationQuery(originalQuery, lowerQuery, phoneNames),
        contextUsed: true,
        type: 'specification'
      };
    }

    // Alternative queries - "cheaper", "alternative", "similar", "instead"
    if (this.isAlternativeQuery(lowerQuery)) {
      return {
        enhanced: this.enhanceAlternativeQuery(originalQuery, lowerQuery, phoneNames, context),
        contextUsed: true,
        type: 'alternative'
      };
    }

    // General phone queries that can benefit from context
    if (this.isGeneralPhoneQuery(lowerQuery)) {
      return {
        enhanced: this.enhanceGeneralQuery(originalQuery, lowerQuery, phoneNames),
        contextUsed: true,
        type: 'general'
      };
    }

    // If no specific pattern matches, return original query
    return {
      enhanced: originalQuery,
      contextUsed: false,
      type: 'none'
    };
  }

  /**
   * Check if query is asking for comparisons
   */
  private static isComparisonQuery(lowerQuery: string): boolean {
    const comparisonKeywords = [
      'better', 'best', 'superior', 'which is', 'which one', 'compare', 'vs', 'versus',
      'difference', 'differ', 'faster', 'slower', 'stronger', 'weaker', 'more', 'less',
      'prefer', 'choose', 'pick', 'select', 'recommend', 'suggest'
    ];
    
    return comparisonKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Check if query is asking for specifications or details
   */
  private static isSpecificationQuery(lowerQuery: string): boolean {
    const specKeywords = [
      'spec', 'specification', 'feature', 'detail', 'tell me about', 'what about',
      'how is', 'how good', 'quality', 'performance', 'camera', 'battery', 'display',
      'screen', 'processor', 'ram', 'storage', 'memory', 'build', 'design', 'software',
      'android', 'ios', 'update', 'support', 'connectivity', '5g', 'wifi', 'bluetooth'
    ];
    
    return specKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Check if query is asking for alternatives
   */
  private static isAlternativeQuery(lowerQuery: string): boolean {
    const alternativeKeywords = [
      'cheaper', 'alternative', 'similar', 'like', 'instead', 'replace', 'substitute',
      'other', 'different', 'another', 'else', 'equivalent', 'comparable', 'match'
    ];
    
    return alternativeKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Check if query is a general phone-related query that can benefit from context
   */
  private static isGeneralPhoneQuery(lowerQuery: string): boolean {
    const phoneKeywords = [
      'phone', 'mobile', 'smartphone', 'device', 'handset', 'cell',
      'android', 'ios', 'iphone', 'samsung', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme',
      'gaming', 'photography', 'camera', 'battery', 'charging', 'display', 'screen'
    ];
    
    return phoneKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Enhance comparison queries with phone context
   */
  private static enhanceComparisonQuery(
    originalQuery: string,
    lowerQuery: string,
    phoneNames: string[]
  ): string {
    const phoneList = phoneNames.slice(0, 3).join(', ');
    
    if (lowerQuery.includes('which is') || lowerQuery.includes('which one')) {
      return `${originalQuery} among ${phoneList}`;
    }
    
    if (lowerQuery.includes('better') || lowerQuery.includes('best')) {
      return `${originalQuery} compared to ${phoneList}`;
    }
    
    if (lowerQuery.includes('compare')) {
      return `${originalQuery} with ${phoneList}`;
    }
    
    if (lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
      return `${originalQuery} including ${phoneList}`;
    }
    
    // Default comparison enhancement
    return `${originalQuery} (comparing ${phoneList})`;
  }

  /**
   * Enhance specification queries with phone context
   */
  private static enhanceSpecificationQuery(
    originalQuery: string,
    lowerQuery: string,
    phoneNames: string[]
  ): string {
    const phoneList = phoneNames.slice(0, 3).join(', ');
    
    if (lowerQuery.includes('tell me about') || lowerQuery.includes('what about')) {
      return originalQuery.replace(/tell me about|what about/i, `tell me about the`) + ` of ${phoneList}`;
    }
    
    if (lowerQuery.includes('how is') || lowerQuery.includes('how good')) {
      return `${originalQuery} on ${phoneList}`;
    }
    
    if (lowerQuery.includes('spec') || lowerQuery.includes('feature') || lowerQuery.includes('detail')) {
      return `${originalQuery} for ${phoneList}`;
    }
    
    // Specific feature queries
    const features = ['camera', 'battery', 'display', 'performance', 'gaming', 'software'];
    const mentionedFeature = features.find(feature => lowerQuery.includes(feature));
    
    if (mentionedFeature) {
      return `${originalQuery} comparison for ${phoneList}`;
    }
    
    // Default specification enhancement
    return `${originalQuery} (regarding ${phoneList})`;
  }

  /**
   * Enhance alternative queries with phone context and price information
   */
  private static enhanceAlternativeQuery(
    originalQuery: string,
    lowerQuery: string,
    phoneNames: string[],
    context: PhoneRecommendationContext
  ): string {
    const phoneList = phoneNames.slice(0, 3).join(', ');
    const priceRange = context.metadata?.priceRange;
    
    if (lowerQuery.includes('cheaper') || lowerQuery.includes('budget')) {
      if (priceRange?.min) {
        const maxPrice = Math.floor(priceRange.min * 0.8);
        return `${originalQuery} to ${phoneList} under ${maxPrice} BDT`;
      }
      return `${originalQuery} to ${phoneList} at a lower price`;
    }
    
    if (lowerQuery.includes('similar') || lowerQuery.includes('like')) {
      return `${originalQuery} to ${phoneList} in the same price range`;
    }
    
    if (lowerQuery.includes('alternative') || lowerQuery.includes('instead')) {
      return `${originalQuery} to ${phoneList}`;
    }
    
    if (lowerQuery.includes('different') || lowerQuery.includes('other')) {
      return `${originalQuery} from ${phoneList}`;
    }
    
    // Default alternative enhancement
    return `${originalQuery} (alternatives to ${phoneList})`;
  }

  /**
   * Enhance general phone queries with context
   */
  private static enhanceGeneralQuery(
    originalQuery: string,
    lowerQuery: string,
    phoneNames: string[]
  ): string {
    const phoneList = phoneNames.slice(0, 3).join(', ');
    
    // If query already mentions specific phones, don't add context
    if (phoneNames.some(name => lowerQuery.includes(name.toLowerCase()))) {
      return originalQuery;
    }
    
    // Add context based on query structure
    if (lowerQuery.startsWith('what') || lowerQuery.startsWith('how') || lowerQuery.startsWith('which')) {
      return `${originalQuery} for ${phoneList}`;
    }
    
    if (lowerQuery.startsWith('show') || lowerQuery.startsWith('find') || lowerQuery.startsWith('get')) {
      return `${originalQuery} (related to ${phoneList})`;
    }
    
    // Default general enhancement
    return `${originalQuery} (considering ${phoneList})`;
  }

  /**
   * Get enhancement summary for debugging/analytics
   */
  static getEnhancementSummary(result: QueryEnhancementResult): string {
    if (!result.contextUsed) {
      return 'No context enhancement applied';
    }
    
    return `Enhanced ${result.enhancementType} query with context from ${result.referencedPhones.length} phones: ${result.referencedPhones.slice(0, 2).join(', ')}${result.referencedPhones.length > 2 ? '...' : ''}`;
  }

  /**
   * Validate enhancement result
   */
  static validateEnhancement(result: QueryEnhancementResult): boolean {
    return (
      result.enhancedQuery.length > 0 &&
      result.originalQuery.length > 0 &&
      (result.contextUsed ? result.referencedPhones.length > 0 : true)
    );
  }
}