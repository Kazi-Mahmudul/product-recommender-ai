/**
 * Performance Optimizer Service
 * 
 * Provides performance optimizations for the chat system including:
 * - Parallel processing for context analysis and API calls
 * - Request debouncing and throttling
 * - Memory management and cleanup
 * - Performance monitoring and metrics
 */

import React from 'react';
import { ConversationContext } from './intelligentContextManager';

export interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  cacheHitRate: number;
  memoryUsage: number;
  errorRate: number;
  contextProcessingTime: number;
  apiCallTime: number;
}

export interface OptimizationConfig {
  enableParallelProcessing: boolean;
  enableRequestDebouncing: boolean;
  debounceDelay: number;
  maxConcurrentRequests: number;
  enableMemoryCleanup: boolean;
  cleanupInterval: number;
  enablePerformanceMonitoring: boolean;
}

export class PerformanceOptimizer {
  private static readonly DEFAULT_CONFIG: OptimizationConfig = {
    enableParallelProcessing: true,
    enableRequestDebouncing: true,
    debounceDelay: 300,
    maxConcurrentRequests: 3,
    enableMemoryCleanup: true,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    enablePerformanceMonitoring: true
  };

  private static metrics: PerformanceMetrics = {
    averageResponseTime: 0,
    totalRequests: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    errorRate: 0,
    contextProcessingTime: 0,
    apiCallTime: 0
  };

  private static activeRequests = new Set<string>();
  private static requestQueue: Array<() => Promise<any>> = [];
  private static debounceTimers = new Map<string, NodeJS.Timeout>();
  private static performanceObserver: PerformanceObserver | null = null;
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize performance optimizer
   */
  static initialize(config: Partial<OptimizationConfig> = {}): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (finalConfig.enablePerformanceMonitoring) {
      this.initializePerformanceMonitoring();
    }

    if (finalConfig.enableMemoryCleanup) {
      this.initializeMemoryCleanup(finalConfig.cleanupInterval);
    }

    console.log('Performance optimizer initialized with config:', finalConfig);
  }

  /**
   * Optimize query processing with parallel execution
   */
  static async optimizeQueryProcessing(
    query: string,
    context: ConversationContext,
    apiCall: () => Promise<any>,
    config: Partial<OptimizationConfig> = {}
  ): Promise<{
    response: any;
    contextAnalysis: any;
    processingTime: number;
  }> {
    const startTime = performance.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      // Check if we should debounce this request
      if (finalConfig.enableRequestDebouncing) {
        const debouncedResult = await this.debounceRequest(query, requestId, finalConfig.debounceDelay);
        if (debouncedResult) {
          return debouncedResult;
        }
      }

      // Check concurrent request limit
      if (this.activeRequests.size >= finalConfig.maxConcurrentRequests) {
        console.warn('Max concurrent requests reached, queuing request');
        return await this.queueRequest(() => 
          this.optimizeQueryProcessing(query, context, apiCall, config)
        );
      }

      this.activeRequests.add(requestId);

      let response: any;
      let contextAnalysis: any;

      if (finalConfig.enableParallelProcessing) {
        // Execute context analysis and API call in parallel
        const [apiResponse, contextResult] = await Promise.all([
          this.executeWithTimeout(apiCall(), 30000), // 30 second timeout
          this.analyzeContextInParallel(query, context)
        ]);

        response = apiResponse;
        contextAnalysis = contextResult;
      } else {
        // Sequential execution
        contextAnalysis = await this.analyzeContextInParallel(query, context);
        response = await apiCall();
      }

      const processingTime = performance.now() - startTime;

      // Update metrics
      this.updateMetrics({
        responseTime: processingTime,
        success: true,
        contextProcessingTime: contextAnalysis.processingTime || 0
      });

      return {
        response,
        contextAnalysis,
        processingTime
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      // Update error metrics
      this.updateMetrics({
        responseTime: processingTime,
        success: false,
        error: error as Error
      });

      throw error;
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  /**
   * Debounce requests to prevent rapid-fire queries
   */
  private static async debounceRequest(
    query: string,
    requestId: string,
    delay: number
  ): Promise<any | null> {
    const queryKey = this.normalizeQueryForDebouncing(query);
    
    // Clear existing timer for this query
    const existingTimer = this.debounceTimers.get(queryKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.debounceTimers.delete(queryKey);
        resolve(null); // Proceed with request
      }, delay);

      this.debounceTimers.set(queryKey, timer);
    });
  }

  /**
   * Normalize query for debouncing
   */
  private static normalizeQueryForDebouncing(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Execute promise with timeout
   */
  private static async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Analyze context in parallel with optimizations
   */
  private static async analyzeContextInParallel(
    query: string,
    context: ConversationContext
  ): Promise<any> {
    const startTime = performance.now();

    try {
      // Parallel context analysis tasks
      const analysisPromises = [
        this.analyzeQueryIntent(query),
        this.extractRelevantContext(context),
        this.analyzeTopicContinuity(query, context)
      ];

      const [intentAnalysis, relevantContext, topicAnalysis] = await Promise.all(
        analysisPromises.map(p => this.executeWithTimeout(p, 5000))
      );

      const processingTime = performance.now() - startTime;

      return {
        intentAnalysis,
        relevantContext,
        topicAnalysis,
        processingTime
      };
    } catch (error) {
      console.warn('Context analysis failed:', error);
      return {
        intentAnalysis: null,
        relevantContext: null,
        topicAnalysis: null,
        processingTime: performance.now() - startTime,
        error: error
      };
    }
  }

  /**
   * Analyze query intent
   */
  private static async analyzeQueryIntent(query: string): Promise<any> {
    // Simulate async intent analysis
    return new Promise((resolve) => {
      setTimeout(() => {
        const intent = this.determineQueryIntent(query);
        resolve(intent);
      }, 10);
    });
  }

  /**
   * Determine query intent synchronously
   */
  private static determineQueryIntent(query: string): any {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('recommend') || queryLower.includes('suggest') || queryLower.includes('best')) {
      return { type: 'recommendation', confidence: 0.9 };
    }
    
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      return { type: 'comparison', confidence: 0.9 };
    }
    
    if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('budget')) {
      return { type: 'price_inquiry', confidence: 0.8 };
    }
    
    return { type: 'general', confidence: 0.5 };
  }

  /**
   * Extract relevant context
   */
  private static async extractRelevantContext(context: ConversationContext): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const relevantContext = {
          recentPhones: context.mentioned_phones.slice(0, 3),
          currentTopic: context.conversation_flow.current_topic,
          userPreferences: context.user_preferences
        };
        resolve(relevantContext);
      }, 5);
    });
  }

  /**
   * Analyze topic continuity
   */
  private static async analyzeTopicContinuity(
    query: string,
    context: ConversationContext
  ): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const continuity = {
          isContinuation: context.conversation_flow.current_topic && 
                          query.toLowerCase().includes(context.conversation_flow.current_topic),
          topicShift: false,
          confidence: 0.7
        };
        resolve(continuity);
      }, 5);
    });
  }

  /**
   * Queue request when at capacity
   */
  private static async queueRequest(requestFn: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Process queued requests
   */
  private static processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests.size < this.DEFAULT_CONFIG.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  /**
   * Update performance metrics
   */
  private static updateMetrics(data: {
    responseTime: number;
    success: boolean;
    contextProcessingTime?: number;
    error?: Error;
  }): void {
    this.metrics.totalRequests++;
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + data.responseTime) / 
      this.metrics.totalRequests;

    if (data.contextProcessingTime) {
      this.metrics.contextProcessingTime = 
        (this.metrics.contextProcessingTime + data.contextProcessingTime) / 2;
    }

    if (!data.success) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / 
        this.metrics.totalRequests;
    }

    // Update memory usage estimate
    this.metrics.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage
   */
  private static estimateMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Initialize performance monitoring
   */
  private static initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('chat-api')) {
            this.metrics.apiCallTime = entry.duration;
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }

  /**
   * Initialize memory cleanup
   */
  private static initializeMemoryCleanup(interval: number): void {
    this.cleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, interval);
  }

  /**
   * Perform memory cleanup
   */
  private static performMemoryCleanup(): void {
    // Clear old debounce timers
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // Clear completed requests from active set
    this.activeRequests.clear();

    // Limit request queue size
    if (this.requestQueue.length > 10) {
      this.requestQueue = this.requestQueue.slice(-5);
    }

    console.log('Memory cleanup performed');
  }

  /**
   * Optimize component rendering
   */
  static optimizeComponentRendering<T extends Record<string, any>>(
    component: React.ComponentType<T>
  ): React.MemoExoticComponent<React.ComponentType<T>> {
    return React.memo(component, (prevProps, nextProps) => {
      // Custom comparison logic for chat components
      return JSON.stringify(prevProps) === JSON.stringify(nextProps);
    });
  }

  /**
   * Debounce function for input handling
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function for scroll/resize events
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Get current performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      averageResponseTime: 0,
      totalRequests: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      errorRate: 0,
      contextProcessingTime: 0,
      apiCallTime: 0
    };
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    // Clear all timers
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Disconnect performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    // Clear active requests
    this.activeRequests.clear();
    this.requestQueue = [];
  }

  /**
   * Preload critical resources
   */
  static async preloadCriticalResources(): Promise<void> {
    // Preload common phone images
    const commonPhoneImages = [
      '/images/iphone-placeholder.jpg',
      '/images/samsung-placeholder.jpg',
      '/images/xiaomi-placeholder.jpg'
    ];

    const preloadPromises = commonPhoneImages.map(src => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });
    });

    try {
      await Promise.allSettled(preloadPromises);
      console.log('Critical resources preloaded');
    } catch (error) {
      console.warn('Failed to preload some resources:', error);
    }
  }
}