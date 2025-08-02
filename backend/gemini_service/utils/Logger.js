/**
 * Structured Logger for AI Quota Management System
 * 
 * Provides structured logging with request tracking, metrics collection,
 * and different log levels for monitoring and debugging.
 */

const crypto = require('crypto');

class Logger {
  constructor(config = {}) {
    this.config = {
      level: config.level || 'info',
      enableMetrics: config.enableMetrics !== false,
      enableRequestTracking: config.enableRequestTracking !== false,
      maxRequestHistory: config.maxRequestHistory || 1000,
      service: config.service || 'ai-quota-management',
      ...config
    };

    // Log levels (higher number = more verbose)
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    // Current log level
    this.currentLevel = this.levels[this.config.level] || this.levels.info;

    // Request tracking
    this.activeRequests = new Map();
    this.requestHistory = [];
    this.requestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsByProvider: new Map(),
      requestsByType: new Map(),
      errorsByType: new Map()
    };

    // System metrics
    this.systemMetrics = {
      startTime: Date.now(),
      uptime: 0,
      memoryUsage: {},
      cpuUsage: 0
    };

    // Start metrics collection if enabled
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    // Only log initialization in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] 📊 Logger initialized with level: ${this.config.level}`);
    }
  }

  /**
   * Generate a unique request ID
   * @returns {string} Unique request ID
   */
  generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Start tracking a request
   * @param {string} operation - Operation name
   * @param {Object} metadata - Additional metadata
   * @returns {string} Request ID
   */
  startRequest(operation, metadata = {}) {
    if (!this.config.enableRequestTracking) {
      return null;
    }

    const requestId = this.generateRequestId();
    const requestInfo = {
      id: requestId,
      operation,
      startTime: Date.now(),
      metadata: { ...metadata },
      status: 'active'
    };

    this.activeRequests.set(requestId, requestInfo);
    this.requestMetrics.totalRequests++;

    // Update request type metrics
    const typeCount = this.requestMetrics.requestsByType.get(operation) || 0;
    this.requestMetrics.requestsByType.set(operation, typeCount + 1);

    this.debug('Request started', {
      requestId,
      operation,
      metadata
    });

    return requestId;
  }

  /**
   * End tracking a request
   * @param {string} requestId - Request ID
   * @param {boolean} success - Whether request was successful
   * @param {Object} result - Request result or error
   * @returns {Object} Request summary
   */
  endRequest(requestId, success = true, result = {}) {
    if (!requestId || !this.config.enableRequestTracking) {
      return null;
    }

    const requestInfo = this.activeRequests.get(requestId);
    if (!requestInfo) {
      this.warn('Attempted to end unknown request', { requestId });
      return null;
    }

    const endTime = Date.now();
    const responseTime = endTime - requestInfo.startTime;

    // Update request info
    requestInfo.endTime = endTime;
    requestInfo.responseTime = responseTime;
    requestInfo.status = success ? 'completed' : 'failed';
    requestInfo.result = result;

    // Update metrics
    if (success) {
      this.requestMetrics.successfulRequests++;
    } else {
      this.requestMetrics.failedRequests++;
      
      // Track error types
      const errorType = result.type || 'unknown';
      const errorCount = this.requestMetrics.errorsByType.get(errorType) || 0;
      this.requestMetrics.errorsByType.set(errorType, errorCount + 1);
    }

    // Update provider metrics if available
    if (result.provider) {
      const providerStats = this.requestMetrics.requestsByProvider.get(result.provider) || {
        total: 0,
        successful: 0,
        failed: 0,
        totalResponseTime: 0
      };
      
      providerStats.total++;
      providerStats.totalResponseTime += responseTime;
      
      if (success) {
        providerStats.successful++;
      } else {
        providerStats.failed++;
      }
      
      this.requestMetrics.requestsByProvider.set(result.provider, providerStats);
    }

    // Update average response time
    const totalCompleted = this.requestMetrics.successfulRequests + this.requestMetrics.failedRequests;
    this.requestMetrics.averageResponseTime = 
      ((this.requestMetrics.averageResponseTime * (totalCompleted - 1)) + responseTime) / totalCompleted;

    // Move to history
    this.activeRequests.delete(requestId);
    this.requestHistory.push({ ...requestInfo });

    // Trim history if needed
    if (this.requestHistory.length > this.config.maxRequestHistory) {
      this.requestHistory.shift();
    }

    const logLevel = success ? 'info' : 'warn';
    this[logLevel]('Request completed', {
      requestId,
      operation: requestInfo.operation,
      responseTime,
      success,
      result: success ? 'success' : result.message || 'failed'
    });

    return {
      requestId,
      operation: requestInfo.operation,
      responseTime,
      success,
      metadata: requestInfo.metadata
    };
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} requestId - Optional request ID
   */
  error(message, data = {}, requestId = null) {
    this.log('error', message, data, requestId);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} requestId - Optional request ID
   */
  warn(message, data = {}, requestId = null) {
    this.log('warn', message, data, requestId);
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} requestId - Optional request ID
   */
  info(message, data = {}, requestId = null) {
    this.log('info', message, data, requestId);
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} requestId - Optional request ID
   */
  debug(message, data = {}, requestId = null) {
    this.log('debug', message, data, requestId);
  }

  /**
   * Log a trace message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} requestId - Optional request ID
   */
  trace(message, data = {}, requestId = null) {
    this.log('trace', message, data, requestId);
  }

  /**
   * Core logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} requestId - Optional request ID
   */
  log(level, message, data = {}, requestId = null) {
    // Check if we should log this level
    if (this.levels[level] > this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: this.config.service,
      message,
      requestId,
      data: { ...data }
    };

    // Add request context if available
    if (requestId && this.activeRequests.has(requestId)) {
      const requestInfo = this.activeRequests.get(requestId);
      logEntry.requestContext = {
        operation: requestInfo.operation,
        startTime: requestInfo.startTime,
        duration: Date.now() - requestInfo.startTime
      };
    }

    // Format and output log
    this.outputLog(level, logEntry);
  }

  /**
   * Output log entry to console with appropriate formatting
   * @param {string} level - Log level
   * @param {Object} logEntry - Log entry object
   */
  outputLog(level, logEntry) {
    const { timestamp, level: logLevel, message, requestId, data } = logEntry;
    
    // Create base log message
    let logMessage = `[${timestamp}] ${logLevel}`;
    
    if (requestId) {
      logMessage += ` [${requestId}]`;
    }
    
    logMessage += ` ${message}`;

    // Add data if present
    if (Object.keys(data).length > 0) {
      logMessage += ` ${JSON.stringify(data)}`;
    }

    // Output with appropriate console method and emoji
    switch (level) {
      case 'error':
        console.error(`❌ ${logMessage}`);
        break;
      case 'warn':
        console.warn(`⚠️ ${logMessage}`);
        break;
      case 'info':
        console.log(`ℹ️ ${logMessage}`);
        break;
      case 'debug':
        console.log(`🔍 ${logMessage}`);
        break;
      case 'trace':
        console.log(`🔬 ${logMessage}`);
        break;
      default:
        console.log(`📝 ${logMessage}`);
    }
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Update system metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Initial metrics update
    this.updateSystemMetrics();
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    this.systemMetrics.uptime = Date.now() - this.systemMetrics.startTime;
    this.systemMetrics.memoryUsage = process.memoryUsage();
    
    // CPU usage would require additional libraries in production
    // For now, we'll simulate it
    this.systemMetrics.cpuUsage = Math.random() * 100;
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    const providerMetrics = {};
    for (const [provider, stats] of this.requestMetrics.requestsByProvider) {
      providerMetrics[provider] = {
        ...stats,
        successRate: stats.total > 0 ? (stats.successful / stats.total) : 0,
        averageResponseTime: stats.total > 0 ? (stats.totalResponseTime / stats.total) : 0
      };
    }

    const requestTypeMetrics = {};
    for (const [type, count] of this.requestMetrics.requestsByType) {
      requestTypeMetrics[type] = count;
    }

    const errorTypeMetrics = {};
    for (const [type, count] of this.requestMetrics.errorsByType) {
      errorTypeMetrics[type] = count;
    }

    return {
      timestamp: new Date().toISOString(),
      system: {
        ...this.systemMetrics,
        activeRequests: this.activeRequests.size,
        requestHistorySize: this.requestHistory.length
      },
      requests: {
        total: this.requestMetrics.totalRequests,
        successful: this.requestMetrics.successfulRequests,
        failed: this.requestMetrics.failedRequests,
        successRate: this.requestMetrics.totalRequests > 0 ? 
          (this.requestMetrics.successfulRequests / this.requestMetrics.totalRequests) : 0,
        averageResponseTime: Math.round(this.requestMetrics.averageResponseTime),
        byProvider: providerMetrics,
        byType: requestTypeMetrics,
        errorsByType: errorTypeMetrics
      }
    };
  }

  /**
   * Get request history
   * @param {number} limit - Maximum number of requests to return
   * @returns {Array} Request history
   */
  getRequestHistory(limit = 100) {
    return this.requestHistory
      .slice(-limit)
      .map(req => ({
        id: req.id,
        operation: req.operation,
        startTime: req.startTime,
        endTime: req.endTime,
        responseTime: req.responseTime,
        status: req.status,
        provider: req.result?.provider,
        success: req.status === 'completed'
      }));
  }

  /**
   * Get active requests
   * @returns {Array} Currently active requests
   */
  getActiveRequests() {
    return Array.from(this.activeRequests.values()).map(req => ({
      id: req.id,
      operation: req.operation,
      startTime: req.startTime,
      duration: Date.now() - req.startTime,
      metadata: req.metadata
    }));
  }

  /**
   * Set log level
   * @param {string} level - New log level
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.config.level = level;
      this.currentLevel = this.levels[level];
      this.info('Log level changed', { newLevel: level });
    } else {
      this.warn('Invalid log level', { level, validLevels: Object.keys(this.levels) });
    }
  }

  /**
   * Create a child logger with additional context
   * @param {Object} context - Additional context for all logs
   * @returns {Logger} Child logger instance
   */
  child(context = {}) {
    const childLogger = Object.create(this);
    childLogger.childContext = { ...this.childContext, ...context };
    
    // Override log method to include child context
    childLogger.log = (level, message, data = {}, requestId = null) => {
      const mergedData = { ...this.childContext, ...childLogger.childContext, ...data };
      return this.log.call(this, level, message, mergedData, requestId);
    };
    
    return childLogger;
  }

  /**
   * Log performance metrics for an operation
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  logPerformance(operation, duration, metadata = {}) {
    this.info('Performance metric', {
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * Log quota usage
   * @param {string} provider - Provider name
   * @param {Object} quotaInfo - Quota information
   */
  logQuotaUsage(provider, quotaInfo) {
    const level = quotaInfo.usage > 0.8 ? 'warn' : 'info';
    this[level]('Quota usage', {
      provider,
      usage: Math.round(quotaInfo.usage * 100),
      remaining: quotaInfo.remaining,
      limit: quotaInfo.limit,
      resetTime: quotaInfo.resetTime
    });
  }

  /**
   * Log provider health status
   * @param {string} provider - Provider name
   * @param {Object} healthInfo - Health information
   */
  logProviderHealth(provider, healthInfo) {
    const level = healthInfo.isHealthy ? 'info' : 'warn';
    this[level]('Provider health status', {
      provider,
      isHealthy: healthInfo.isHealthy,
      responseTime: healthInfo.responseTime,
      lastCheck: healthInfo.lastCheck,
      errorCount: healthInfo.errorCount
    });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    this.info('Logger cleanup completed');
  }
}

module.exports = Logger;