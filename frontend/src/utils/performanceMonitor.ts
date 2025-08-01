/**
 * Performance monitoring and debugging utilities for comparison features
 */

export interface RequestMetrics {
  requestId: string;
  phoneIds: number[];
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'cancelled';
  error?: string;
  retryCount: number;
  cacheHit: boolean;
}

export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cancelledRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  totalRetries: number;
  requestsByPhoneCount: Record<number, number>;
}

class PerformanceMonitor {
  private metrics: Map<string, RequestMetrics> = new Map();
  private isEnabled: boolean;
  private maxMetricsHistory = 100;

  constructor() {
    // Enable in development or when explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('comparison-debug') === 'true';
  }

  /**
   * Starts tracking a request
   */
  startRequest(requestId: string, phoneIds: number[], cacheHit = false): void {
    if (!this.isEnabled) return;

    const metric: RequestMetrics = {
      requestId,
      phoneIds: [...phoneIds],
      startTime: performance.now(),
      status: 'pending',
      retryCount: 0,
      cacheHit,
    };

    this.metrics.set(requestId, metric);
    this.enforceHistoryLimit();

    this.log('Request started', { requestId, phoneIds, cacheHit });
  }

  /**
   * Marks a request as successful
   */
  completeRequest(requestId: string): void {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(requestId);
    if (!metric) return;

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.status = 'success';

    this.log('Request completed', {
      requestId,
      duration: metric.duration,
      phoneIds: metric.phoneIds,
    });
  }

  /**
   * Marks a request as failed
   */
  failRequest(requestId: string, error: string): void {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(requestId);
    if (!metric) return;

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.status = 'error';
    metric.error = error;

    this.log('Request failed', {
      requestId,
      duration: metric.duration,
      error,
      phoneIds: metric.phoneIds,
    });
  }

  /**
   * Marks a request as cancelled
   */
  cancelRequest(requestId: string): void {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(requestId);
    if (!metric) return;

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.status = 'cancelled';

    this.log('Request cancelled', {
      requestId,
      duration: metric.duration,
      phoneIds: metric.phoneIds,
    });
  }

  /**
   * Increments retry count for a request
   */
  incrementRetry(requestId: string): void {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(requestId);
    if (!metric) return;

    metric.retryCount++;

    this.log('Request retry', {
      requestId,
      retryCount: metric.retryCount,
      phoneIds: metric.phoneIds,
    });
  }

  /**
   * Gets performance statistics
   */
  getStats(): PerformanceStats {
    if (!this.isEnabled) {
      return this.getEmptyStats();
    }

    const completedMetrics = Array.from(this.metrics.values()).filter(
      m => m.status !== 'pending'
    );

    const successfulRequests = completedMetrics.filter(m => m.status === 'success');
    const failedRequests = completedMetrics.filter(m => m.status === 'error');
    const cancelledRequests = completedMetrics.filter(m => m.status === 'cancelled');
    const cacheHits = completedMetrics.filter(m => m.cacheHit);

    const totalDuration = successfulRequests.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageResponseTime = successfulRequests.length > 0 
      ? totalDuration / successfulRequests.length 
      : 0;

    const cacheHitRate = completedMetrics.length > 0 
      ? (cacheHits.length / completedMetrics.length) * 100 
      : 0;

    const totalRetries = completedMetrics.reduce((sum, m) => sum + m.retryCount, 0);

    // Group requests by phone count
    const requestsByPhoneCount: Record<number, number> = {};
    completedMetrics.forEach(m => {
      const phoneCount = m.phoneIds.length;
      requestsByPhoneCount[phoneCount] = (requestsByPhoneCount[phoneCount] || 0) + 1;
    });

    return {
      totalRequests: completedMetrics.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      cancelledRequests: cancelledRequests.length,
      averageResponseTime,
      cacheHitRate,
      totalRetries,
      requestsByPhoneCount,
    };
  }

  /**
   * Gets detailed metrics for debugging
   */
  getDetailedMetrics(): RequestMetrics[] {
    if (!this.isEnabled) return [];
    return Array.from(this.metrics.values());
  }

  /**
   * Clears all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.log('Metrics cleared');
  }

  /**
   * Enables or disables monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      localStorage.setItem('comparison-debug', 'true');
    } else {
      localStorage.removeItem('comparison-debug');
    }
    this.log(`Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Checks if monitoring is enabled
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Logs performance data to console (development only)
   */
  private log(message: string, data?: any): void {
    // Disabled in production - no console output
    if (!this.isEnabled || process.env.NODE_ENV === 'production') return;

    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      message,
      ...data,
    };

    console.group(`🔍 Performance Monitor: ${message}`);
    console.log(logData);
    console.groupEnd();
  }

  /**
   * Enforces maximum metrics history to prevent memory leaks
   */
  private enforceHistoryLimit(): void {
    if (this.metrics.size <= this.maxMetricsHistory) return;

    // Remove oldest metrics
    const entries = Array.from(this.metrics.entries());
    const sortedEntries = entries.sort(([, a], [, b]) => a.startTime - b.startTime);
    const toRemove = sortedEntries.slice(0, this.metrics.size - this.maxMetricsHistory);

    toRemove.forEach(([requestId]) => {
      this.metrics.delete(requestId);
    });
  }

  /**
   * Returns empty stats when monitoring is disabled
   */
  private getEmptyStats(): PerformanceStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cancelledRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      totalRetries: 0,
      requestsByPhoneCount: {},
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Debug utilities for development
 */
export const debugUtils = {
  /**
   * Enables debug mode
   */
  enable(): void {
    performanceMonitor.setEnabled(true);
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Comparison debug mode enabled');
    }
  },

  /**
   * Disables debug mode
   */
  disable(): void {
    performanceMonitor.setEnabled(false);
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Comparison debug mode disabled');
    }
  },

  /**
   * Prints current performance stats
   */
  stats(): void {
    if (process.env.NODE_ENV !== 'production') {
      const stats = performanceMonitor.getStats();
      console.table(stats);
    }
  },

  /**
   * Prints detailed metrics
   */
  metrics(): void {
    if (process.env.NODE_ENV !== 'production') {
      const metrics = performanceMonitor.getDetailedMetrics();
      console.table(metrics);
    }
  },

  /**
   * Clears all metrics
   */
  clear(): void {
    performanceMonitor.clearMetrics();
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Metrics cleared');
    }
  },

  /**
   * Exports metrics as JSON
   */
  export(): string {
    const data = {
      stats: performanceMonitor.getStats(),
      metrics: performanceMonitor.getDetailedMetrics(),
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },
};

// Make debug utils available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).comparisonDebug = debugUtils;
}