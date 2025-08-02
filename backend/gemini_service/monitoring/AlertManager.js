/**
 * Alert Manager
 * 
 * Manages system alerts, notifications, and alert rules.
 * Provides configurable alerting based on system metrics and thresholds.
 */

const EventEmitter = require('events');

class AlertManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Alert thresholds
      thresholds: {
        responseTime: config.thresholds?.responseTime || 5000, // 5 seconds
        errorRate: config.thresholds?.errorRate || 0.1, // 10%
        quotaUsage: config.thresholds?.quotaUsage || 0.9, // 90%
        providerFailures: config.thresholds?.providerFailures || 3,
        memoryUsage: config.thresholds?.memoryUsage || 0.85, // 85%
        ...config.thresholds
      },
      
      // Alert settings
      enableAlerts: config.enableAlerts !== false,
      alertCooldown: config.alertCooldown || 300000, // 5 minutes
      maxActiveAlerts: config.maxActiveAlerts || 50,
      alertRetention: config.alertRetention || (24 * 60 * 60 * 1000), // 24 hours
      
      // Notification settings
      notifications: {
        console: config.notifications?.console !== false,
        webhook: config.notifications?.webhook || null,
        email: config.notifications?.email || null,
        ...config.notifications
      },
      
      ...config
    };
    
    // Alert storage
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.alertCooldowns = new Map();
    
    // Alert rules
    this.alertRules = new Map();
    this.setupDefaultRules();
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredAlerts();
    }, 60000); // Every minute
    
    console.log(`[${new Date().toISOString()}] 🚨 AlertManager initialized with ${this.alertRules.size} rules`);
  }

  /**
   * Setup default alert rules
   */
  setupDefaultRules() {
    // High response time alert
    this.addRule('high_response_time', {
      condition: (metrics) => {
        return metrics.averageResponseTime > this.config.thresholds.responseTime;
      },
      severity: 'warning',
      message: (metrics) => `High response time detected: ${metrics.averageResponseTime.toFixed(0)}ms (threshold: ${this.config.thresholds.responseTime}ms)`,
      cooldown: 300000 // 5 minutes
    });

    // High error rate alert
    this.addRule('high_error_rate', {
      condition: (metrics) => {
        return (1 - metrics.successRate) > this.config.thresholds.errorRate;
      },
      severity: 'error',
      message: (metrics) => `High error rate detected: ${((1 - metrics.successRate) * 100).toFixed(1)}% (threshold: ${(this.config.thresholds.errorRate * 100).toFixed(1)}%)`,
      cooldown: 300000
    });

    // Provider failure alert
    this.addRule('provider_failure', {
      condition: (metrics, context) => {
        if (!context.healthStatus) return false;
        const unhealthyProviders = Object.values(context.healthStatus).filter(p => !p.isHealthy);
        return unhealthyProviders.length >= this.config.thresholds.providerFailures;
      },
      severity: 'error',
      message: (metrics, context) => {
        const unhealthyProviders = Object.values(context.healthStatus).filter(p => !p.isHealthy);
        return `Multiple provider failures: ${unhealthyProviders.length} providers unhealthy`;
      },
      cooldown: 600000 // 10 minutes
    });

    // Quota usage alert
    this.addRule('high_quota_usage', {
      condition: (metrics, context) => {
        if (!context.quotaStatus) return false;
        return Object.values(context.quotaStatus).some(quota => 
          quota.usage > this.config.thresholds.quotaUsage
        );
      },
      severity: 'warning',
      message: (metrics, context) => {
        const highUsageProviders = Object.entries(context.quotaStatus)
          .filter(([_, quota]) => quota.usage > this.config.thresholds.quotaUsage)
          .map(([provider, quota]) => `${provider}: ${(quota.usage * 100).toFixed(1)}%`);
        return `High quota usage detected: ${highUsageProviders.join(', ')}`;
      },
      cooldown: 900000 // 15 minutes
    });

    // Memory usage alert
    this.addRule('high_memory_usage', {
      condition: () => {
        const memUsage = process.memoryUsage();
        const totalMem = require('os').totalmem();
        const usageRatio = memUsage.heapUsed / totalMem;
        return usageRatio > this.config.thresholds.memoryUsage;
      },
      severity: 'warning',
      message: () => {
        const memUsage = process.memoryUsage();
        const totalMem = require('os').totalmem();
        const usageRatio = memUsage.heapUsed / totalMem;
        return `High memory usage: ${(usageRatio * 100).toFixed(1)}% (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB)`;
      },
      cooldown: 600000 // 10 minutes
    });

    // Fallback mode alert
    this.addRule('fallback_mode_active', {
      condition: (metrics, context) => {
        return context.fallbackMode === true;
      },
      severity: 'warning',
      message: () => 'System running in fallback mode - all AI providers unavailable',
      cooldown: 1800000 // 30 minutes
    });
  }

  /**
   * Add a custom alert rule
   */
  addRule(name, rule) {
    if (!rule.condition || typeof rule.condition !== 'function') {
      throw new Error('Alert rule must have a condition function');
    }

    this.alertRules.set(name, {
      name,
      condition: rule.condition,
      severity: rule.severity || 'warning',
      message: rule.message || (() => `Alert: ${name}`),
      cooldown: rule.cooldown || this.config.alertCooldown,
      enabled: rule.enabled !== false,
      metadata: rule.metadata || {}
    });

    console.log(`[${new Date().toISOString()}] 📋 Alert rule added: ${name}`);
  }

  /**
   * Remove an alert rule
   */
  removeRule(name) {
    const removed = this.alertRules.delete(name);
    if (removed) {
      console.log(`[${new Date().toISOString()}] 🗑️ Alert rule removed: ${name}`);
    }
    return removed;
  }

  /**
   * Enable or disable an alert rule
   */
  toggleRule(name, enabled) {
    const rule = this.alertRules.get(name);
    if (rule) {
      rule.enabled = enabled;
      console.log(`[${new Date().toISOString()}] ${enabled ? '✅' : '❌'} Alert rule ${enabled ? 'enabled' : 'disabled'}: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Check all alert rules against current metrics
   */
  checkAlerts(metrics, context = {}) {
    if (!this.config.enableAlerts) {
      return { triggered: [], active: this.getActiveAlerts() };
    }

    const triggeredAlerts = [];
    const now = Date.now();

    for (const [ruleName, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTriggered = this.alertCooldowns.get(ruleName);
      if (lastTriggered && (now - lastTriggered) < rule.cooldown) {
        continue;
      }

      try {
        // Evaluate rule condition
        if (rule.condition(metrics, context)) {
          const alertId = `${ruleName}_${now}`;
          const message = typeof rule.message === 'function' 
            ? rule.message(metrics, context)
            : rule.message;

          const alert = {
            id: alertId,
            rule: ruleName,
            severity: rule.severity,
            message,
            timestamp: now,
            metrics: { ...metrics },
            context: { ...context },
            metadata: rule.metadata
          };

          // Add to active alerts
          this.activeAlerts.set(alertId, alert);
          this.alertHistory.push(alert);
          this.alertCooldowns.set(ruleName, now);

          triggeredAlerts.push(alert);

          // Emit alert event
          this.emit('alert', alert);

          // Send notifications
          this.sendNotification(alert);

          console.log(`[${new Date().toISOString()}] 🚨 Alert triggered: ${ruleName} - ${message}`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error evaluating alert rule ${ruleName}:`, error.message);
      }
    }

    // Cleanup if too many active alerts
    if (this.activeAlerts.size > this.config.maxActiveAlerts) {
      this.cleanupOldestAlerts();
    }

    return {
      triggered: triggeredAlerts,
      active: this.getActiveAlerts()
    };
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear a specific alert
   */
  clearAlert(alertId) {
    const cleared = this.activeAlerts.delete(alertId);
    if (cleared) {
      console.log(`[${new Date().toISOString()}] ✅ Alert cleared: ${alertId}`);
      this.emit('alertCleared', alertId);
    }
    return cleared;
  }

  /**
   * Clear all active alerts
   */
  clearAllAlerts() {
    const count = this.activeAlerts.size;
    this.activeAlerts.clear();
    console.log(`[${new Date().toISOString()}] 🧹 Cleared ${count} active alerts`);
    this.emit('allAlertsCleared', count);
    return count;
  }

  /**
   * Send notification for an alert
   */
  async sendNotification(alert) {
    const notifications = this.config.notifications;

    // Console notification
    if (notifications.console) {
      const severityIcon = {
        'error': '🔴',
        'warning': '🟡',
        'info': '🔵'
      }[alert.severity] || '⚪';
      
      console.log(`${severityIcon} ALERT [${alert.severity.toUpperCase()}] ${alert.rule}: ${alert.message}`);
    }

    // Webhook notification
    if (notifications.webhook) {
      try {
        const response = await fetch(notifications.webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            alert,
            timestamp: new Date().toISOString(),
            system: 'ai-quota-management'
          })
        });

        if (!response.ok) {
          console.error(`[${new Date().toISOString()}] ❌ Webhook notification failed:`, response.statusText);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Webhook notification error:`, error.message);
      }
    }

    // Email notification (placeholder - would need email service integration)
    if (notifications.email) {
      console.log(`[${new Date().toISOString()}] 📧 Email notification would be sent to: ${notifications.email}`);
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last1h = now - (60 * 60 * 1000);

    const recent24h = this.alertHistory.filter(alert => alert.timestamp > last24h);
    const recent1h = this.alertHistory.filter(alert => alert.timestamp > last1h);

    const severityCounts = {
      error: 0,
      warning: 0,
      info: 0
    };

    recent24h.forEach(alert => {
      severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
    });

    return {
      active: this.activeAlerts.size,
      total: this.alertHistory.length,
      last24h: recent24h.length,
      last1h: recent1h.length,
      severityCounts,
      rules: {
        total: this.alertRules.size,
        enabled: Array.from(this.alertRules.values()).filter(r => r.enabled).length
      }
    };
  }

  /**
   * Cleanup expired alerts
   */
  cleanupExpiredAlerts() {
    const now = Date.now();
    const expiredThreshold = now - this.config.alertRetention;

    // Remove expired alerts from history
    const originalHistoryLength = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > expiredThreshold);
    
    const removedFromHistory = originalHistoryLength - this.alertHistory.length;

    // Remove expired active alerts (older than retention period)
    let removedFromActive = 0;
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.timestamp < expiredThreshold) {
        this.activeAlerts.delete(alertId);
        removedFromActive++;
      }
    }

    if (removedFromHistory > 0 || removedFromActive > 0) {
      console.log(`[${new Date().toISOString()}] 🧹 Cleaned up ${removedFromHistory} expired alerts from history, ${removedFromActive} from active`);
    }
  }

  /**
   * Cleanup oldest alerts when limit exceeded
   */
  cleanupOldestAlerts() {
    const alerts = Array.from(this.activeAlerts.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = alerts.length - this.config.maxActiveAlerts + 10; // Remove extra 10
    
    for (let i = 0; i < toRemove && i < alerts.length; i++) {
      this.activeAlerts.delete(alerts[i][0]);
    }

    console.log(`[${new Date().toISOString()}] 🧹 Removed ${toRemove} oldest active alerts`);
  }

  /**
   * Export alert data
   */
  exportAlerts(format = 'json') {
    const data = {
      activeAlerts: this.getActiveAlerts(),
      alertHistory: this.getAlertHistory(1000),
      stats: this.getAlertStats(),
      rules: Array.from(this.alertRules.entries()).map(([name, rule]) => ({
        name,
        severity: rule.severity,
        enabled: rule.enabled,
        cooldown: rule.cooldown,
        metadata: rule.metadata
      })),
      exportTimestamp: new Date().toISOString()
    };

    if (format === 'csv') {
      // Simple CSV export for alerts
      const csvRows = [
        'Timestamp,Rule,Severity,Message,Status'
      ];

      data.alertHistory.forEach(alert => {
        const row = [
          new Date(alert.timestamp).toISOString(),
          alert.rule,
          alert.severity,
          `"${alert.message.replace(/"/g, '""')}"`,
          this.activeAlerts.has(alert.id) ? 'Active' : 'Resolved'
        ].join(',');
        csvRows.push(row);
      });

      return csvRows.join('\n');
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Update alert configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(`[${new Date().toISOString()}] ⚙️ Alert configuration updated`);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
    this.removeAllListeners();
    
    console.log(`[${new Date().toISOString()}] 🧹 AlertManager cleaned up`);
  }
}

module.exports = AlertManager;