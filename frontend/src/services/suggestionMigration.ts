// Migration utility for transitioning existing chat sessions to contextual suggestions

import { ChatContextManager } from './chatContextManager';
import { SuggestionGenerator } from './suggestionGenerator';
import { Phone } from '../api/phones';
import { FollowUpSuggestion, ContextualSuggestion } from '../types/suggestions';

export class SuggestionMigration {
  /**
   * Migrate existing chat sessions to use contextual suggestions
   */
  static migrateToContextualSuggestions(): void {
    try {
      const context = ChatContextManager.loadContext();
      
      // Check if context needs migration
      if (this.needsMigration(context)) {
        console.log('Migrating chat context to support contextual suggestions...');
        
        // Perform migration
        const migratedContext = this.performMigration(context);
        
        // Save migrated context
        ChatContextManager.saveContext(migratedContext);
        
        console.log('Chat context migration completed successfully');
      }
    } catch (error) {
      console.warn('Failed to migrate chat context:', error);
      // If migration fails, clear context to start fresh
      ChatContextManager.clearContext();
    }
  }

  /**
   * Check if context needs migration
   */
  private static needsMigration(context: any): boolean {
    // Check if context has the new phoneRecommendations structure
    return !context.phoneRecommendations || !Array.isArray(context.phoneRecommendations);
  }

  /**
   * Perform the actual migration
   */
  private static performMigration(context: any): any {
    const migratedContext = {
      ...context,
      phoneRecommendations: context.phoneRecommendations || [],
      currentRecommendationId: context.currentRecommendationId || undefined
    };

    // If there are current recommendations but no phone recommendations context,
    // create a basic context from current recommendations
    if (context.currentRecommendations && 
        context.currentRecommendations.length > 0 && 
        migratedContext.phoneRecommendations.length === 0) {
      
      const basicContext = {
        id: `migrated_${Date.now()}`,
        phones: context.currentRecommendations,
        originalQuery: context.lastQuery || 'migrated query',
        timestamp: Date.now(),
        metadata: {
          priceRange: this.calculatePriceRange(context.currentRecommendations),
          brands: this.extractBrands(context.currentRecommendations),
          keyFeatures: [],
          averageRating: this.calculateAverageRating(context.currentRecommendations),
          recommendationReason: 'Migrated from legacy context'
        }
      };

      migratedContext.phoneRecommendations = [basicContext];
      migratedContext.currentRecommendationId = basicContext.id;
    }

    return migratedContext;
  }

  /**
   * Calculate price range from phones
   */
  private static calculatePriceRange(phones: Phone[]): { min: number; max: number } {
    const prices = phones
      .map(p => p.price_original || 0)
      .filter(p => p > 0);
    
    if (prices.length === 0) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }

  /**
   * Extract brands from phones
   */
  private static extractBrands(phones: Phone[]): string[] {
    return Array.from(new Set(
      phones
        .map(p => p.brand)
        .filter(brand => brand && typeof brand === 'string')
    ));
  }

  /**
   * Calculate average rating from phones
   */
  private static calculateAverageRating(phones: Phone[]): number {
    const ratings = phones
      .map(p => p.overall_device_score || 0)
      .filter(rating => rating > 0);
    
    if (ratings.length === 0) {
      return 0;
    }

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  /**
   * Provide backward compatibility wrapper for old suggestion calls
   */
  static generateCompatibleSuggestions(
    phones: Phone[],
    originalQuery: string,
    chatHistory: any[] = []
  ): (FollowUpSuggestion | ContextualSuggestion)[] {
    try {
      // Try to load context and use contextual suggestions
      const context = ChatContextManager.loadContext();
      return SuggestionGenerator.generateSuggestions(phones, originalQuery, chatHistory, context);
    } catch (error) {
      console.warn('Failed to generate contextual suggestions, using regular suggestions:', error);
      // Fallback to regular suggestions
      return SuggestionGenerator.generateRegularSuggestions(phones, originalQuery, chatHistory);
    }
  }

  /**
   * Check if contextual suggestions are available for current context
   */
  static hasContextualSuggestionsAvailable(): boolean {
    try {
      const context = ChatContextManager.loadContext();
      const recentContext = ChatContextManager.getRecentPhoneContext(context, 600000); // 10 minutes
      return recentContext.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get migration status information
   */
  static getMigrationStatus(): {
    isMigrated: boolean;
    hasContext: boolean;
    contextualSuggestionsAvailable: boolean;
    phoneRecommendationsCount: number;
  } {
    try {
      const context = ChatContextManager.loadContext();
      const recentContext = ChatContextManager.getRecentPhoneContext(context, 600000);
      
      return {
        isMigrated: !this.needsMigration(context),
        hasContext: !!context,
        contextualSuggestionsAvailable: recentContext.length > 0,
        phoneRecommendationsCount: context.phoneRecommendations?.length || 0
      };
    } catch (error) {
      return {
        isMigrated: false,
        hasContext: false,
        contextualSuggestionsAvailable: false,
        phoneRecommendationsCount: 0
      };
    }
  }

  /**
   * Force migration for testing purposes
   */
  static forceMigration(): void {
    try {
      const context = ChatContextManager.loadContext();
      const migratedContext = this.performMigration(context);
      ChatContextManager.saveContext(migratedContext);
      console.log('Forced migration completed');
    } catch (error) {
      console.error('Forced migration failed:', error);
      throw error;
    }
  }

  /**
   * Reset context to pre-migration state (for testing)
   */
  static resetToLegacyContext(): void {
    const legacyContext = {
      ...ChatContextManager.initializeContext(),
      phoneRecommendations: undefined, // Remove new property
      currentRecommendationId: undefined
    };
    
    ChatContextManager.saveContext(legacyContext as any);
    console.log('Reset to legacy context format');
  }
}

// Auto-migrate on module load
if (typeof window !== 'undefined') {
  // Only run in browser environment
  try {
    SuggestionMigration.migrateToContextualSuggestions();
  } catch (error) {
    console.warn('Auto-migration failed:', error);
  }
}