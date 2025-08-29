// Analytics service for tracking contextual suggestion effectiveness

import { ContextualSuggestion, FollowUpSuggestion } from '../types/suggestions';

export interface ContextAnalyticsEvent {
  eventType: 'context_created' | 'context_retrieved' | 'context_expired' | 
             'suggestion_generated' | 'suggestion_clicked' | 'context_fallback';
  timestamp: number;
  sessionId: string;
  data: any;
}

export interface SuggestionClickEvent {
  suggestionId: string;
  suggestionText: string;
  suggestionType: 'contextual' | 'regular';
  contextType?: string;
  referencedPhones: string[];
  clickTimestamp: number;
  sessionId: string;
}

export interface ContextUsageMetrics {
  totalContextsCreated: number;
  totalContextsRetrieved: number;
  totalContextsExpired: number;
  totalSuggestionsGenerated: number;
  totalSuggestionsClicked: number;
  contextualSuggestionClickRate: number;
  regularSuggestionClickRate: number;
  averageContextLifetime: number;
  mostReferencedPhones: { phone: string; count: number }[];
  popularSuggestionTypes: { type: string; count: number }[];
}

export interface PerformanceMetrics {
  contextCreationLatency: number[];
  contextRetrievalLatency: number[];
  suggestionGenerationLatency: number[];
  averageContextCreationTime: number;
  averageContextRetrievalTime: number;
  averageSuggestionGenerationTime: number;
}

export class ContextAnalytics {
  private static readonly STORAGE_KEY = 'peyechi_context_analytics';
  private static readonly MAX_EVENTS = 1000;
  private static readonly METRICS_RETENTION_DAYS = 30;
  
  private static events: ContextAnalyticsEvent[] = [];
  private static performanceMetrics: PerformanceMetrics = {
    contextCreationLatency: [],
    contextRetrievalLatency: [],
    suggestionGenerationLatency: [],
    averageContextCreationTime: 0,
    averageContextRetrievalTime: 0,
    averageSuggestionGenerationTime: 0
  };

  /**
   * Initialize analytics service
   */
  static initialize(): void {
    try {
      this.loadStoredEvents();
      this.cleanupOldEvents();
    } catch (error) {
      console.warn('Failed to initialize context analytics:', error);
    }
  }

  /**
   * Track context creation
   */
  static trackContextCreated(
    contextId: string,
    phoneCount: number,
    originalQuery: string,
    sessionId: string,
    creationTime?: number
  ): void {
    const event: ContextAnalyticsEvent = {
      eventType: 'context_created',
      timestamp: Date.now(),
      sessionId,
      data: {
        contextId,
        phoneCount,
        originalQuery,
        creationTime
      }
    };

    this.addEvent(event);

    if (creationTime) {
      this.performanceMetrics.contextCreationLatency.push(creationTime);
      this.updateAverageTime('creation', creationTime);
    }
  }

  /**
   * Track context retrieval
   */
  static trackContextRetrieved(
    contextId: string,
    contextAge: number,
    sessionId: string,
    retrievalTime?: number
  ): void {
    const event: ContextAnalyticsEvent = {
      eventType: 'context_retrieved',
      timestamp: Date.now(),
      sessionId,
      data: {
        contextId,
        contextAge,
        retrievalTime
      }
    };

    this.addEvent(event);

    if (retrievalTime) {
      this.performanceMetrics.contextRetrievalLatency.push(retrievalTime);
      this.updateAverageTime('retrieval', retrievalTime);
    }
  }

  /**
   * Track context expiration
   */
  static trackContextExpired(
    contextId: string,
    lifetime: number,
    sessionId: string
  ): void {
    const event: ContextAnalyticsEvent = {
      eventType: 'context_expired',
      timestamp: Date.now(),
      sessionId,
      data: {
        contextId,
        lifetime
      }
    };

    this.addEvent(event);
  }

  /**
   * Track suggestion generation
   */
  static trackSuggestionGenerated(
    suggestions: (FollowUpSuggestion | ContextualSuggestion)[],
    contextUsed: boolean,
    sessionId: string,
    generationTime?: number
  ): void {
    const contextualCount = suggestions.filter(s => 
      'contextualQuery' in s && s.referencedPhones.length > 0
    ).length;

    const event: ContextAnalyticsEvent = {
      eventType: 'suggestion_generated',
      timestamp: Date.now(),
      sessionId,
      data: {
        totalSuggestions: suggestions.length,
        contextualSuggestions: contextualCount,
        regularSuggestions: suggestions.length - contextualCount,
        contextUsed,
        generationTime,
        suggestionTypes: suggestions.map(s => ({
          id: s.id,
          type: 'contextualQuery' in s ? 'contextual' : 'regular',
          contextType: 'contextType' in s ? s.contextType : undefined,
          category: s.category
        }))
      }
    };

    this.addEvent(event);

    if (generationTime) {
      this.performanceMetrics.suggestionGenerationLatency.push(generationTime);
      this.updateAverageTime('suggestion', generationTime);
    }
  }

  /**
   * Track suggestion click
   */
  static trackSuggestionClicked(
    suggestion: FollowUpSuggestion | ContextualSuggestion,
    sessionId: string
  ): void {
    const isContextual = 'contextualQuery' in suggestion;
    const referencedPhones = isContextual ? suggestion.referencedPhones : [];

    const clickEvent: SuggestionClickEvent = {
      suggestionId: suggestion.id,
      suggestionText: suggestion.text,
      suggestionType: isContextual ? 'contextual' : 'regular',
      contextType: isContextual ? suggestion.contextType : undefined,
      referencedPhones,
      clickTimestamp: Date.now(),
      sessionId
    };

    const event: ContextAnalyticsEvent = {
      eventType: 'suggestion_clicked',
      timestamp: Date.now(),
      sessionId,
      data: clickEvent
    };

    this.addEvent(event);
  }

  /**
   * Track context fallback (when contextual suggestions fail)
   */
  static trackContextFallback(
    reason: string,
    sessionId: string
  ): void {
    const event: ContextAnalyticsEvent = {
      eventType: 'context_fallback',
      timestamp: Date.now(),
      sessionId,
      data: {
        reason
      }
    };

    this.addEvent(event);
  }

  /**
   * Get comprehensive usage metrics
   */
  static getUsageMetrics(): ContextUsageMetrics {
    const contextCreatedEvents = this.events.filter(e => e.eventType === 'context_created');
    const contextRetrievedEvents = this.events.filter(e => e.eventType === 'context_retrieved');
    const contextExpiredEvents = this.events.filter(e => e.eventType === 'context_expired');
    const suggestionGeneratedEvents = this.events.filter(e => e.eventType === 'suggestion_generated');
    const suggestionClickedEvents = this.events.filter(e => e.eventType === 'suggestion_clicked');

    // Calculate click rates
    const contextualClicks = suggestionClickedEvents.filter(e => 
      e.data.suggestionType === 'contextual'
    ).length;
    const regularClicks = suggestionClickedEvents.filter(e => 
      e.data.suggestionType === 'regular'
    ).length;

    const totalContextualSuggestions = suggestionGeneratedEvents.reduce((sum, e) => 
      sum + (e.data.contextualSuggestions || 0), 0
    );
    const totalRegularSuggestions = suggestionGeneratedEvents.reduce((sum, e) => 
      sum + (e.data.regularSuggestions || 0), 0
    );

    const contextualClickRate = totalContextualSuggestions > 0 
      ? (contextualClicks / totalContextualSuggestions) * 100 
      : 0;
    const regularClickRate = totalRegularSuggestions > 0 
      ? (regularClicks / totalRegularSuggestions) * 100 
      : 0;

    // Calculate average context lifetime
    const lifetimes = contextExpiredEvents.map(e => e.data.lifetime).filter(l => l > 0);
    const averageContextLifetime = lifetimes.length > 0 
      ? lifetimes.reduce((sum, l) => sum + l, 0) / lifetimes.length 
      : 0;

    // Get most referenced phones
    const phoneReferences: Record<string, number> = {};
    suggestionClickedEvents.forEach(e => {
      if (e.data.referencedPhones) {
        e.data.referencedPhones.forEach((phone: string) => {
          phoneReferences[phone] = (phoneReferences[phone] || 0) + 1;
        });
      }
    });

    const mostReferencedPhones = Object.entries(phoneReferences)
      .map(([phone, count]) => ({ phone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get popular suggestion types
    const suggestionTypes: Record<string, number> = {};
    suggestionClickedEvents.forEach(e => {
      const type = e.data.contextType || e.data.suggestionType;
      suggestionTypes[type] = (suggestionTypes[type] || 0) + 1;
    });

    const popularSuggestionTypes = Object.entries(suggestionTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalContextsCreated: contextCreatedEvents.length,
      totalContextsRetrieved: contextRetrievedEvents.length,
      totalContextsExpired: contextExpiredEvents.length,
      totalSuggestionsGenerated: suggestionGeneratedEvents.length,
      totalSuggestionsClicked: suggestionClickedEvents.length,
      contextualSuggestionClickRate: contextualClickRate,
      regularSuggestionClickRate: regularClickRate,
      averageContextLifetime,
      mostReferencedPhones,
      popularSuggestionTypes
    };
  }

  /**
   * Get performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get context effectiveness report
   */
  static getEffectivenessReport(): {
    contextUsageRate: number;
    contextualSuggestionPerformance: number;
    averageContextLifetime: number;
    fallbackRate: number;
    topPerformingContextTypes: { type: string; clickRate: number }[];
  } {
    const metrics = this.getUsageMetrics();
    const totalSuggestionEvents = this.events.filter(e => e.eventType === 'suggestion_generated').length;
    const contextUsedEvents = this.events.filter(e => 
      e.eventType === 'suggestion_generated' && e.data.contextUsed
    ).length;

    const contextUsageRate = totalSuggestionEvents > 0 
      ? (contextUsedEvents / totalSuggestionEvents) * 100 
      : 0;

    const fallbackEvents = this.events.filter(e => e.eventType === 'context_fallback').length;
    const fallbackRate = totalSuggestionEvents > 0 
      ? (fallbackEvents / totalSuggestionEvents) * 100 
      : 0;

    // Calculate click rates by context type
    const contextTypePerformance: Record<string, { clicks: number; generated: number }> = {};
    
    this.events.forEach(e => {
      if (e.eventType === 'suggestion_generated' && e.data.suggestionTypes) {
        e.data.suggestionTypes.forEach((s: any) => {
          if (s.contextType) {
            if (!contextTypePerformance[s.contextType]) {
              contextTypePerformance[s.contextType] = { clicks: 0, generated: 0 };
            }
            contextTypePerformance[s.contextType].generated++;
          }
        });
      } else if (e.eventType === 'suggestion_clicked' && e.data.contextType) {
        if (!contextTypePerformance[e.data.contextType]) {
          contextTypePerformance[e.data.contextType] = { clicks: 0, generated: 0 };
        }
        contextTypePerformance[e.data.contextType].clicks++;
      }
    });

    const topPerformingContextTypes = Object.entries(contextTypePerformance)
      .map(([type, data]) => ({
        type,
        clickRate: data.generated > 0 ? (data.clicks / data.generated) * 100 : 0
      }))
      .sort((a, b) => b.clickRate - a.clickRate)
      .slice(0, 5);

    return {
      contextUsageRate,
      contextualSuggestionPerformance: metrics.contextualSuggestionClickRate,
      averageContextLifetime: metrics.averageContextLifetime,
      fallbackRate,
      topPerformingContextTypes
    };
  }

  /**
   * Export analytics data for external analysis
   */
  static exportAnalyticsData(): {
    events: ContextAnalyticsEvent[];
    metrics: ContextUsageMetrics;
    performance: PerformanceMetrics;
    effectiveness: any;
    exportTimestamp: number;
  } {
    return {
      events: [...this.events],
      metrics: this.getUsageMetrics(),
      performance: this.getPerformanceMetrics(),
      effectiveness: this.getEffectivenessReport(),
      exportTimestamp: Date.now()
    };
  }

  /**
   * Clear all analytics data
   */
  static clearAnalyticsData(): void {
    this.events = [];
    this.performanceMetrics = {
      contextCreationLatency: [],
      contextRetrievalLatency: [],
      suggestionGenerationLatency: [],
      averageContextCreationTime: 0,
      averageContextRetrievalTime: 0,
      averageSuggestionGenerationTime: 0
    };
    this.saveEvents();
  }

  /**
   * Get analytics summary for debugging
   */
  static getAnalyticsSummary(): string {
    const metrics = this.getUsageMetrics();
    const effectiveness = this.getEffectivenessReport();
    
    return `Context Analytics Summary:
- Contexts Created: ${metrics.totalContextsCreated}
- Suggestions Generated: ${metrics.totalSuggestionsGenerated}
- Suggestions Clicked: ${metrics.totalSuggestionsClicked}
- Context Usage Rate: ${effectiveness.contextUsageRate.toFixed(1)}%
- Contextual Click Rate: ${metrics.contextualSuggestionClickRate.toFixed(1)}%
- Regular Click Rate: ${metrics.regularSuggestionClickRate.toFixed(1)}%
- Average Context Lifetime: ${(effectiveness.averageContextLifetime / 1000 / 60).toFixed(1)} minutes
- Fallback Rate: ${effectiveness.fallbackRate.toFixed(1)}%`;
  }

  /**
   * Private helper methods
   */

  private static addEvent(event: ContextAnalyticsEvent): void {
    this.events.push(event);
    
    // Limit events to prevent memory issues
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
    
    this.saveEvents();
  }

  private static loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.events = Array.isArray(data.events) ? data.events : [];
        this.performanceMetrics = data.performanceMetrics || this.performanceMetrics;
      }
    } catch (error) {
      console.warn('Failed to load stored analytics events:', error);
      this.events = [];
    }
  }

  private static saveEvents(): void {
    try {
      const data = {
        events: this.events,
        performanceMetrics: this.performanceMetrics,
        lastUpdated: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save analytics events:', error);
    }
  }

  private static cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (this.METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const initialLength = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
    
    if (this.events.length < initialLength) {
      console.log(`Cleaned up ${initialLength - this.events.length} old analytics events`);
      this.saveEvents();
    }
  }

  private static updateAverageTime(type: 'creation' | 'retrieval' | 'suggestion', time: number): void {
    switch (type) {
      case 'creation':
        const creationCount = this.performanceMetrics.contextCreationLatency.length;
        this.performanceMetrics.averageContextCreationTime = 
          (this.performanceMetrics.averageContextCreationTime * (creationCount - 1) + time) / creationCount;
        break;
      case 'retrieval':
        const retrievalCount = this.performanceMetrics.contextRetrievalLatency.length;
        this.performanceMetrics.averageContextRetrievalTime = 
          (this.performanceMetrics.averageContextRetrievalTime * (retrievalCount - 1) + time) / retrievalCount;
        break;
      case 'suggestion':
        const suggestionCount = this.performanceMetrics.suggestionGenerationLatency.length;
        this.performanceMetrics.averageSuggestionGenerationTime = 
          (this.performanceMetrics.averageSuggestionGenerationTime * (suggestionCount - 1) + time) / suggestionCount;
        break;
    }
  }
}

// Initialize analytics on module load
if (typeof window !== 'undefined') {
  ContextAnalytics.initialize();
}