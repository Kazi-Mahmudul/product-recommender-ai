/**
 * Response Cache Service
 * 
 * Provides intelligent caching for AI service responses to improve performance
 * and reduce API calls. Includes cache invalidation strategies and similarity matching.
 */

import { ConversationContext } from './intelligentContextManager';

export interface CacheEntry {
  id: string;
  query: string;
  normalizedQuery: string;
  response: any;
  timestamp: Date;
  contextHash: string;
  hitCount: number;
  lastAccessed: Date;
  metadata: {
    responseType: string;
    confidence?: number;
    phoneCount?: number;
    queryComplexity: number;
  };
}

export interface CacheConfig {
  maxEntries: number;
  maxAge: number; // in milliseconds
  similarityThreshold: number;
  enableContextAwareness: boolean;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  averageResponseTime: number;
  cacheSize: number; // in bytes
}

export class ResponseCacheService {
  private static readonly DEFAULT_CONFIG: CacheConfig = {
    maxEntries: 100,
    maxAge: 30 * 60 * 1000, // 30 minutes
    similarityThreshold: 0.85,
    enableContextAwareness: true
  };

  private static readonly CACHE_KEY = 'smart_chat_cache';
  private static readonly STATS_KEY = 'smart_chat_cache_stats';
  
  private static cache: Map<string, CacheEntry> = new Map();
  private static stats = {
    totalHits: 0,
    totalMisses: 0,
    responseTimes: [] as number[]
  };

  /**
   * Initialize cache from localStorage
   */
  static initialize(config: Partial<CacheConfig> = {}): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    try {
      // Load cache from localStorage
      const storedCache = localStorage.getItem(this.CACHE_KEY);
      if (storedCache) {
        const cacheData = JSON.parse(storedCache);
        this.cache = new Map(
          cacheData.map((entry: any) => [
            entry.id,
            {
              ...entry,
              timestamp: new Date(entry.timestamp),
              lastAccessed: new Date(entry.lastAccessed)
            }
          ])
        );
      }

      // Load stats
      const storedStats = localStorage.getItem(this.STATS_KEY);
      if (storedStats) {
        this.stats = { ...this.stats, ...JSON.parse(storedStats) };
      }

      // Clean up expired entries
      this.cleanup(finalConfig);
    } catch (error) {
      console.warn('Failed to initialize cache:', error);
      this.cache = new Map();
    }
  }

  /**
   * Get cached response for a query
   */
  static async getCachedResponse(
    query: string,
    context?: ConversationContext,
    config: Partial<CacheConfig> = {}
  ): Promise<any | null> {
    const startTime = Date.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    try {
      const normalizedQuery = this.normalizeQuery(query);
      const contextHash = finalConfig.enableContextAwareness 
        ? this.generateContextHash(context) 
        : '';

      // Direct match first
      const directMatch = this.findDirectMatch(normalizedQuery, contextHash);
      if (directMatch) {
        this.recordHit(directMatch, Date.now() - startTime);
        return directMatch.response;
      }

      // Similarity match
      const similarMatch = this.findSimilarMatch(
        normalizedQuery, 
        contextHash, 
        finalConfig.similarityThreshold
      );
      if (similarMatch) {
        this.recordHit(similarMatch, Date.now() - startTime);
        return similarMatch.response;
      }

      // No match found
      this.stats.totalMisses++;
      return null;
    } catch (error) {
      console.warn('Cache lookup failed:', error);
      this.stats.totalMisses++;
      return null;
    }
  }

  /**
   * Cache a response
   */
  static async cacheResponse(
    query: string,
    response: any,
    context?: ConversationContext,
    config: Partial<CacheConfig> = {}
  ): Promise<void> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    try {
      const normalizedQuery = this.normalizeQuery(query);
      const contextHash = finalConfig.enableContextAwareness 
        ? this.generateContextHash(context) 
        : '';
      
      const cacheId = this.generateCacheId(normalizedQuery, contextHash);
      
      const entry: CacheEntry = {
        id: cacheId,
        query: query,
        normalizedQuery: normalizedQuery,
        response: response,
        timestamp: new Date(),
        contextHash: contextHash,
        hitCount: 0,
        lastAccessed: new Date(),
        metadata: {
          responseType: response.response_type || response.type || 'unknown',
          confidence: response.metadata?.ai_confidence,
          phoneCount: response.metadata?.phone_count || response.phones?.length,
          queryComplexity: this.calculateQueryComplexity(query)
        }
      };

      // Add to cache
      this.cache.set(cacheId, entry);

      // Enforce cache size limits
      if (this.cache.size > finalConfig.maxEntries) {
        this.evictOldEntries(finalConfig);
      }

      // Persist to localStorage
      this.persistCache();
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  /**
   * Normalize query for better matching
   */
  private static normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      // Remove common variations
      .replace(/\b(please|can you|could you|i want|i need|show me|tell me|find me)\b/g, '')
      // Normalize phone names
      .replace(/\biphone\s*(\d+)/g, 'iphone $1')
      .replace(/\bsamsung\s*galaxy\s*/g, 'samsung galaxy ')
      // Normalize price formats
      .replace(/\b(\d+)k\b/g, '$1000')
      .replace(/\btaka\b/g, 'bdt')
      .replace(/৳/g, 'bdt')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate context hash for context-aware caching
   */
  private static generateContextHash(context?: ConversationContext): string {
    if (!context) return '';

    const contextData = {
      recent_topics: context.recent_topics.slice(0, 3), // Only recent topics
      mentioned_phones: context.mentioned_phones.slice(0, 5).map(p => p.name),
      budget_range: context.user_preferences.budget_range,
      preferred_brands: context.user_preferences.preferred_brands?.slice(0, 3)
    };

    return btoa(JSON.stringify(contextData)).substring(0, 16);
  }

  /**
   * Generate cache ID
   */
  private static generateCacheId(normalizedQuery: string, contextHash: string): string {
    const combined = normalizedQuery + contextHash;
    return btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  /**
   * Find direct match in cache
   */
  private static findDirectMatch(normalizedQuery: string, contextHash: string): CacheEntry | null {
    const cacheId = this.generateCacheId(normalizedQuery, contextHash);
    const entry = this.cache.get(cacheId);
    
    if (entry && this.isEntryValid(entry)) {
      return entry;
    }
    
    return null;
  }

  /**
   * Find similar match using string similarity
   */
  private static findSimilarMatch(
    normalizedQuery: string, 
    contextHash: string, 
    threshold: number
  ): CacheEntry | null {
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;

    this.cache.forEach((entry) => {
      if (!this.isEntryValid(entry)) return;

      // Context must match for context-aware caching
      if (contextHash && entry.contextHash !== contextHash) return;

      const similarity = this.calculateSimilarity(normalizedQuery, entry.normalizedQuery);
      
      if (similarity >= threshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    });

    return bestMatch;
  }

  /**
   * Calculate string similarity using Jaccard similarity
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));
    
    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);
    
    const intersection = new Set(words1Array.filter(x => words2.has(x)));
    const union = new Set([...words1Array, ...words2Array]);
    
    return intersection.size / union.size;
  }

  /**
   * Check if cache entry is still valid
   */
  private static isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    
    return age < this.DEFAULT_CONFIG.maxAge;
  }

  /**
   * Calculate query complexity for caching priority
   */
  private static calculateQueryComplexity(query: string): number {
    let complexity = 0;
    
    // Length factor
    complexity += Math.min(query.length / 100, 1);
    
    // Phone name mentions
    const phoneMatches = query.match(/\b(iPhone|Samsung|Xiaomi|OnePlus|Google|Huawei|Oppo|Vivo)\b/gi);
    complexity += (phoneMatches?.length || 0) * 0.2;
    
    // Comparison indicators
    if (/\b(compare|vs|versus|better|difference)\b/i.test(query)) {
      complexity += 0.5;
    }
    
    // Technical terms
    const techTerms = query.match(/\b(camera|battery|performance|display|RAM|storage|processor)\b/gi);
    complexity += (techTerms?.length || 0) * 0.1;
    
    return Math.min(complexity, 2); // Cap at 2
  }

  /**
   * Record cache hit
   */
  private static recordHit(entry: CacheEntry, responseTime: number): void {
    entry.hitCount++;
    entry.lastAccessed = new Date();
    this.stats.totalHits++;
    this.stats.responseTimes.push(responseTime);
    
    // Keep only recent response times
    if (this.stats.responseTimes.length > 100) {
      this.stats.responseTimes = this.stats.responseTimes.slice(-50);
    }
  }

  /**
   * Evict old entries when cache is full
   */
  private static evictOldEntries(config: CacheConfig): void {
    const entries = Array.from(this.cache.values());
    
    // Sort by priority (least recently used + lowest hit count)
    entries.sort((a, b) => {
      const aScore = a.hitCount + (Date.now() - a.lastAccessed.getTime()) / 1000;
      const bScore = b.hitCount + (Date.now() - b.lastAccessed.getTime()) / 1000;
      return aScore - bScore;
    });

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - config.maxEntries + 10);
    toRemove.forEach(entry => this.cache.delete(entry.id));
  }

  /**
   * Clean up expired entries
   */
  private static cleanup(config: CacheConfig): void {
    const now = Date.now();
    const expiredEntries: string[] = [];

    this.cache.forEach((entry, id) => {
      if (now - entry.timestamp.getTime() > config.maxAge) {
        expiredEntries.push(id);
      }
    });

    expiredEntries.forEach(id => this.cache.delete(id));
    
    if (expiredEntries.length > 0) {
      console.log(`Cleaned up ${expiredEntries.length} expired cache entries`);
    }
  }

  /**
   * Persist cache to localStorage
   */
  private static persistCache(): void {
    try {
      const cacheData = Array.from(this.cache.values());
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
      // If localStorage is full, try to clear some space
      this.clearOldestEntries(10);
    }
  }

  /**
   * Clear oldest entries to free up space
   */
  private static clearOldestEntries(count: number): void {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    entries.slice(0, count).forEach(entry => this.cache.delete(entry.id));
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): CacheStats {
    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;
    const avgResponseTime = this.stats.responseTimes.length > 0 
      ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length 
      : 0;

    // Estimate cache size
    const cacheSize = JSON.stringify(Array.from(this.cache.values())).length;

    return {
      totalEntries: this.cache.size,
      hitRate: hitRate,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      averageResponseTime: avgResponseTime,
      cacheSize: cacheSize
    };
  }

  /**
   * Clear entire cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      responseTimes: []
    };
    
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.STATS_KEY);
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error);
    }
  }

  /**
   * Invalidate cache entries based on patterns
   */
  static invalidateByPattern(pattern: RegExp): number {
    let invalidatedCount = 0;
    
    this.cache.forEach((entry, id) => {
      if (pattern.test(entry.query) || pattern.test(entry.normalizedQuery)) {
        this.cache.delete(id);
        invalidatedCount++;
      }
    });
    
    if (invalidatedCount > 0) {
      this.persistCache();
    }
    
    return invalidatedCount;
  }

  /**
   * Warm cache with common queries
   */
  static async warmCache(commonQueries: string[]): Promise<void> {
    console.log(`Warming cache with ${commonQueries.length} common queries`);
    
    // This would typically make actual API calls to populate the cache
    // For now, we'll just log the intent
    for (const query of commonQueries) {
      console.log(`Would warm cache for: ${query}`);
    }
  }

  /**
   * Export cache for debugging
   */
  static exportCache(): any {
    return {
      entries: Array.from(this.cache.values()),
      stats: this.stats,
      config: this.DEFAULT_CONFIG
    };
  }
}