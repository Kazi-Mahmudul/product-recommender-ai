/**
 * Metrics Collector for AI Quota Management System
 * 
 * Collects and aggregates metrics for monitoring dashboard,
 * alerting, and performance analysis.
 */

class MetricsCollector {
  constructor(config = {}) {
    this.config = {
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      aggregationInterval: config.aggregationInterval || 60 * 1000, // 1 minute
      maxDataPoints: config.maxDataPoints || 1440, // 24 hours of minute data
      enableAlerts: config.enableAlerts !== false,
      alertThresholds: {
        errorRate: 0.1, // 10% error rate
        responseTime: 5000, // 5 seconds
        quotaUsage: 0.9, // 90% quota usage
        ...config.alertThresholds
      },
      ...config
    };

    // Time series data storage
    this.timeSeries = {
      requests: [],
      errors: [],
      responseTime: [],
      quotaUsage: [],
      providerHealth: []
    };

    // Current aggregation window
    this.currentWindow = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      providerStats: new Map(),
      errorTypes: new Map()
    };

    // Alert state tracking
    this.alertState = {
      activeAlerts: new Map(),
      alertHistory: [],
      lastAlertCheck: Date.now()
    };

    // Start aggregation timer
    this.startAggregation();

    console.log(`[${new Date().toISOString()}] 📊 MetricsCollector initialized`);
  }

  /**
   * Record a request metric
   * @param {Object} requestData - Request data
   */
  recordRequest(requestData) {
    const {
      success = true,
      responseTime = 0,
      provider = 'unknown',
      operation = 'unknown',
      errorType = null
    } = requestData;

    // Update current window
    this.currentWindow.requests++;
    this.currentWindow.totalResponseTime += responseTime;

    if (!success) {
      this.currentWindow.errors++;
      
      if (errorType) {
        const errorCount = this.currentWindow.errorTypes.get(errorType) || 0;
        this.currentWindow.errorTypes.set(errorType, errorCount + 1);
      }
    }

    // Update provider stats
    if (!this.currentWindow.providerStats.has(provider)) {
      this.currentWindow.providerStats.set(provider, {
        requests: 0,
        errors: 0,
        totalResponseTime: 0
      });
    }

    const providerStats = this.currentWindow.providerStats.get(provider);
    providerStats.requests++;
    providerStats.totalResponseTime += responseTime;
    
    if (!success) {
      providerStats.errors++;
    }
  }

  /**
   * Record quota usage metric
   * @param {string} provider - Provider name
   * @param {Object} quotaData - Quota data
   */
  recordQuotaUsage(provider, quotaData) {
    const {
      used = 0,
      limit = 0,
      usage = 0,
      resetTime = null
    } = quotaData;

    // Store quota usage data
    const quotaMetric = {
      timestamp: Date.now(),
      provider,
      used,
      limit,
      usage,
      resetTime
    };

    // Add to current window (for aggregation)
    if (!this.currentWindow.quotaUsage) {
      this.currentWindow.quotaUsage = new Map();
    }
    this.currentWindow.quotaUsage.set(provider, quotaMetric);

    // Check for quota alerts
    if (this.config.enableAlerts && usage >= this.config.alertThresholds.quotaUsage) {
      this.triggerAlert('quota_high', {
        provider,
        usage: Math.round(usage * 100),
        threshold: Math.round(this.config.alertThresholds.quotaUsage * 100)
      });
    }
  }

  /**
   * Record provider health metric
   * @param {string} provider - Provider name
   * @param {Object} healthData - Health data
   */
  recordProviderHealth(provider, healthData) {
    const {
      isHealthy = true,
      responseTime = 0,
      errorCount = 0,
      lastCheck = Date.now()
    } = healthData;

    const healthMetric = {
      timestamp: Date.now(),
      provider,
      isHealthy,
      responseTime,
      errorCount,
      lastCheck
    };

    // Store in current window
    if (!this.currentWindow.providerHealth) {
      this.currentWindow.providerHealth = new Map();
    }
    this.currentWindow.providerHealth.set(provider, healthMetric);

    // Check for health alerts
    if (this.config.enableAlerts && !isHealthy) {
      this.triggerAlert('provider_unhealthy', {
        provider,
        errorCount,
        responseTime
      });
    }
  }

  /**
   * Start metrics aggregation
   */
  startAggregation() {
    this.aggregationTimer = setInterval(() => {
      this.aggregateCurrentWindow();
    }, this.config.aggregationInterval);
  }

  /**
   * Aggregate current window data
   */
  aggregateCurrentWindow() {
    const now = Date.now();
    const windowDuration = now - this.currentWindow.startTime;

    // Calculate aggregated metrics
    const aggregatedData = {
      timestamp: now,
      duration: windowDuration,
      requests: {
        total: this.currentWindow.requests,
        errors: this.currentWindow.errors,
        successRate: this.currentWindow.requests > 0 ? 
          ((this.currentWindow.requests - this.currentWindow.errors) / this.currentWindow.requests) : 1,
        averageResponseTime: this.currentWindow.requests > 0 ? 
          (this.currentWindow.totalResponseTime / this.currentWindow.requests) : 0,
        requestsPerSecond: windowDuration > 0 ? 
          (this.currentWindow.requests / (windowDuration / 1000)) : 0
      },
      providers: {},
      errorTypes: {},
      quotaUsage: {},
      providerHealth: {}
    };

    // Aggregate provider stats
    for (const [provider, stats] of this.currentWindow.providerStats) {
      aggregatedData.providers[provider] = {
        requests: stats.requests,
        errors: stats.errors,
        successRate: stats.requests > 0 ? ((stats.requests - stats.errors) / stats.requests) : 1,
        averageResponseTime: stats.requests > 0 ? (stats.totalResponseTime / stats.requests) : 0
      };
    }

    // Aggregate error types
    for (const [errorType, count] of this.currentWindow.errorTypes) {
      aggregatedData.errorTypes[errorType] = count;
    }

    // Include quota usage
    if (this.currentWindow.quotaUsage) {
      for (const [provider, quota] of this.currentWindow.quotaUsage) {
        aggregatedData.quotaUsage[provider] = quota;
      }
    }

    // Include provider health
    if (this.currentWindow.providerHealth) {
      for (const [provider, health] of this.currentWindow.providerHealth) {
        aggregatedData.providerHealth[provider] = health;
      }
    }

    // Store aggregated data
    this.addToTimeSeries('requests', aggregatedData);

    // Check for alerts based on aggregated data
    if (this.config.enableAlerts) {
      this.checkAlerts(aggregatedData);
    }

    // Reset current window
    this.resetCurrentWindow();

    // Clean old data
    this.cleanOldData();
  }

  /**
   * Add data to time series
   * @param {string} series - Series name
   * @param {Object} data - Data to add
   */
  addToTimeSeries(series, data) {
    if (!this.timeSeries[series]) {
      this.timeSeries[series] = [];
    }

    this.timeSeries[series].push(data);

    // Limit data points
    if (this.timeSeries[series].length > this.config.maxDataPoints) {
      this.timeSeries[series].shift();
    }
  }

  /**
   * Reset current aggregation window
   */
  resetCurrentWindow() {
    this.currentWindow = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      providerStats: new Map(),
      errorTypes: new Map()
    };
  }

  /**
   * Clean old data beyond retention period
   */
  cleanOldData() {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    for (const series in this.timeSeries) {
      this.timeSeries[series] = this.timeSeries[series].filter(
        data => data.timestamp > cutoffTime
      );
    }

    // Clean old alerts
    this.alertState.alertHistory = this.alertState.alertHistory.filter(
      alert => alert.timestamp > cutoffTime
    );
  }

  /**
   * Check for alert conditions
   * @param {Object} data - Aggregated data
   */
  checkAlerts(data) {
    const now = Date.now();

    // Error rate alert
    if (data.requests.successRate < (1 - this.config.alertThresholds.errorRate)) {
      this.triggerAlert('high_error_rate', {
        errorRate: Math.round((1 - data.requests.successRate) * 100),
        threshold: Math.round(this.config.alertThresholds.errorRate * 100)
      });
    }

    // Response time alert
    if (data.requests.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.triggerAlert('high_response_time', {
        responseTime: Math.round(data.requests.averageResponseTime),
        threshold: this.config.alertThresholds.responseTime
      });
    }

    // Provider-specific alerts
    for (const [provider, stats] of Object.entries(data.providers)) {
      if (stats.successRate < (1 - this.config.alertThresholds.errorRate)) {
        this.triggerAlert('provider_high_error_rate', {
          provider,
          errorRate: Math.round((1 - stats.successRate) * 100),
          threshold: Math.round(this.config.alertThresholds.errorRate * 100)
        });
      }
    }

    this.alertState.lastAlertCheck = now;
  }

  /**
   * Trigger an alert
   * @param {string} alertType - Type of alert
   * @param {Object} alertData - Alert data
   */
  triggerAlert(alertType, alertData) {
    const alertKey = `${alertType}_${JSON.stringify(alertData)}`;
    const now = Date.now();

    // Check if this alert is already active (avoid spam)
    if (this.alertState.activeAlerts.has(alertKey)) {
      const existingAlert = this.alertState.activeAlerts.get(alertKey);
      // Only re-trigger if it's been more than 5 minutes
      if (now - existingAlert.timestamp < 5 * 60 * 1000) {
        return;
      }
    }

    const alert = {
      id: this.generateAlertId(),
      type: alertType,
      timestamp: now,
      data: alertData,
      severity: this.getAlertSeverity(alertType),
      message: this.formatAlertMessage(alertType, alertData)
    };

    // Store active alert
    this.alertState.activeAlerts.set(alertKey, alert);

    // Add to history
    this.alertState.alertHistory.push(alert);

    // Log the alert
    console.warn(`[${new Date().toISOString()}] 🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.message}`);

    return alert;
  }

  /**
   * Generate unique alert ID
   * @returns {string} Alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get alert severity
   * @param {string} alertType - Alert type
   * @returns {string} Severity level
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      quota_high: 'high',
      provider_unhealthy: 'high',
      high_error_rate: 'medium',
      high_response_time: 'medium',
      provider_high_error_rate: 'medium'
    };

    return severityMap[alertType] || 'low';
  }

  /**
   * Format alert message
   * @param {string} alertType - Alert type
   * @param {Object} alertData - Alert data
   * @returns {string} Formatted message
   */
  formatAlertMessage(alertType, alertData) {
    switch (alertType) {
      case 'quota_high':
        return `High quota usage for ${alertData.provider}: ${alertData.usage}% (threshold: ${alertData.threshold}%)`;
      
      case 'provider_unhealthy':
        return `Provider ${alertData.provider} is unhealthy (errors: ${alertData.errorCount}, response time: ${alertData.responseTime}ms)`;
      
      case 'high_error_rate':
        return `High system error rate: ${alertData.errorRate}% (threshold: ${alertData.threshold}%)`;
      
      case 'high_response_time':
        return `High average response time: ${alertData.responseTime}ms (threshold: ${alertData.threshold}ms)`;
      
      case 'provider_high_error_rate':
        return `High error rate for ${alertData.provider}: ${alertData.errorRate}% (threshold: ${alertData.threshold}%)`;
      
      default:
        return `Alert: ${alertType} - ${JSON.stringify(alertData)}`;
    }
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID to resolve
   */
  resolveAlert(alertId) {
    for (const [key, alert] of this.alertState.activeAlerts) {
      if (alert.id === alertId) {
        this.alertState.activeAlerts.delete(key);
        console.log(`[${new Date().toISOString()}] ✅ Alert resolved: ${alert.message}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Get current metrics summary
   * @returns {Object} Metrics summary
   */
  getCurrentMetrics() {
    const now = Date.now();
    const recentData = this.getRecentData(5 * 60 * 1000); // Last 5 minutes

    return {
      timestamp: now,
      summary: {
        totalRequests: recentData.reduce((sum, d) => sum + d.requests.total, 0),
        totalErrors: recentData.reduce((sum, d) => sum + d.requests.errors, 0),
        averageResponseTime: this.calculateAverageResponseTime(recentData),
        requestsPerSecond: this.calculateRequestsPerSecond(recentData)
      },
      alerts: {
        active: Array.from(this.alertState.activeAlerts.values()),
        total: this.alertState.alertHistory.length
      },
      timeSeries: {
        requests: this.timeSeries.requests.slice(-60), // Last hour
        dataPoints: this.timeSeries.requests.length
      }
    };
  }

  /**
   * Get recent data within time window
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Array} Recent data points
   */
  getRecentData(timeWindow) {
    const cutoffTime = Date.now() - timeWindow;
    return this.timeSeries.requests.filter(data => data.timestamp > cutoffTime);
  }

  /**
   * Calculate average response time from data points
   * @param {Array} dataPoints - Data points
   * @returns {number} Average response time
   */
  calculateAverageResponseTime(dataPoints) {
    if (dataPoints.length === 0) return 0;
    
    const totalTime = dataPoints.reduce((sum, d) => sum + (d.requests.averageResponseTime * d.requests.total), 0);
    const totalRequests = dataPoints.reduce((sum, d) => sum + d.requests.total, 0);
    
    return totalRequests > 0 ? (totalTime / totalRequests) : 0;
  }

  /**
   * Calculate requests per second from data points
   * @param {Array} dataPoints - Data points
   * @returns {number} Requests per second
   */
  calculateRequestsPerSecond(dataPoints) {
    if (dataPoints.length === 0) return 0;
    
    const totalRequests = dataPoints.reduce((sum, d) => sum + d.requests.total, 0);
    const timeSpan = dataPoints.length * (this.config.aggregationInterval / 1000);
    
    return timeSpan > 0 ? (totalRequests / timeSpan) : 0;
  }

  /**
   * Get metrics for a specific time range
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {Object} Time range metrics
   */
  getMetricsForTimeRange(startTime, endTime) {
    const filteredData = this.timeSeries.requests.filter(
      data => data.timestamp >= startTime && data.timestamp <= endTime
    );

    return {
      timeRange: { startTime, endTime },
      dataPoints: filteredData.length,
      summary: {
        totalRequests: filteredData.reduce((sum, d) => sum + d.requests.total, 0),
        totalErrors: filteredData.reduce((sum, d) => sum + d.requests.errors, 0),
        averageResponseTime: this.calculateAverageResponseTime(filteredData),
        requestsPerSecond: this.calculateRequestsPerSecond(filteredData)
      },
      data: filteredData
    };
  }

  /**
   * Export metrics data
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} Exported data
   */
  exportMetrics(format = 'json') {
    const data = {
      exportTime: new Date().toISOString(),
      config: this.config,
      timeSeries: this.timeSeries,
      alerts: this.alertState.alertHistory
    };

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        // Simple CSV export for requests data
        const csvLines = ['timestamp,requests,errors,success_rate,avg_response_time'];
        this.timeSeries.requests.forEach(point => {
          csvLines.push([
            new Date(point.timestamp).toISOString(),
            point.requests.total,
            point.requests.errors,
            point.requests.successRate.toFixed(3),
            point.requests.averageResponseTime.toFixed(2)
          ].join(','));
        });
        return csvLines.join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    console.log(`[${new Date().toISOString()}] 🧹 MetricsCollector cleanup completed`);
  }
}

module.exports = MetricsCollector;