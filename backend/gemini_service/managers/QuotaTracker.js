class QuotaTracker {
  constructor(config) {
    this.config = config;
    this.usage = new Map(); // provider -> usage data
    this.quotaResetTimers = new Map(); // provider -> timer references
    this.initializeProviders();
  }

  initializeProviders() {
    const providers = this.config.getEnabledProviders();
    for (const provider of providers) {
      this.initializeProviderUsage(provider.name);
    }
  }

  initializeProviderUsage(providerName) {
    if (!this.usage.has(providerName)) {
      this.usage.set(providerName, {
        minute: { used: 0, resetTime: this.getNextResetTime('minute') },
        hour: { used: 0, resetTime: this.getNextResetTime('hour') },
        day: { used: 0, resetTime: this.getNextResetTime('day') },
        requests: [] // Store individual request timestamps for cleanup
      });
      
      // Schedule automatic resets
      this.scheduleQuotaResets(providerName);
    }
  }

  getNextResetTime(window) {
    const now = new Date();
    switch (window) {
      case 'minute':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                       now.getHours(), now.getMinutes() + 1, 0, 0);
      case 'hour':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                       now.getHours() + 1, 0, 0, 0);
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 
                       0, 0, 0, 0);
      default:
        throw new Error(`Invalid time window: ${window}`);
    }
  }

  scheduleQuotaResets(providerName) {
    const usage = this.usage.get(providerName);
    if (!usage) return;

    // Clear existing timers
    if (this.quotaResetTimers.has(providerName)) {
      const timers = this.quotaResetTimers.get(providerName);
      Object.values(timers).forEach(timer => clearTimeout(timer));
    }

    const timers = {};
    
    // Schedule minute reset
    const minuteDelay = usage.minute.resetTime.getTime() - Date.now();
    if (minuteDelay > 0) {
      timers.minute = setTimeout(() => {
        this.resetQuota(providerName, 'minute');
      }, minuteDelay);
    }

    // Schedule hour reset
    const hourDelay = usage.hour.resetTime.getTime() - Date.now();
    if (hourDelay > 0) {
      timers.hour = setTimeout(() => {
        this.resetQuota(providerName, 'hour');
      }, hourDelay);
    }

    // Schedule day reset
    const dayDelay = usage.day.resetTime.getTime() - Date.now();
    if (dayDelay > 0) {
      timers.day = setTimeout(() => {
        this.resetQuota(providerName, 'day');
      }, dayDelay);
    }

    this.quotaResetTimers.set(providerName, timers);
  }

  async checkQuota(providerName, requestType = 'parseQuery') {
    try {
      // Initialize provider if not exists
      if (!this.usage.has(providerName)) {
        this.initializeProviderUsage(providerName);
      }

      const providerConfig = this.config.getProviderConfig(providerName);
      const quotaLimits = providerConfig.quotas || {};
      const usage = this.usage.get(providerName);

      // Clean up old requests first
      this.cleanupOldRequests(providerName);

      // Check each time window
      const checks = [
        { window: 'minute', limit: quotaLimits.requestsPerMinute },
        { window: 'hour', limit: quotaLimits.requestsPerHour },
        { window: 'day', limit: quotaLimits.requestsPerDay }
      ];

      for (const check of checks) {
        if (check.limit && usage[check.window].used >= check.limit) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Quota exceeded for ${providerName} (${check.window}): ${usage[check.window].used}/${check.limit}`);
          return {
            allowed: false,
            reason: 'quota_exceeded',
            window: check.window,
            used: usage[check.window].used,
            limit: check.limit,
            resetTime: usage[check.window].resetTime
          };
        }
      }

      // Check warning threshold
      const warningThreshold = this.config.getMonitoringConfig().quotaWarningThreshold || 0.8;
      for (const check of checks) {
        if (check.limit && usage[check.window].used >= check.limit * warningThreshold) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Quota warning for ${providerName} (${check.window}): ${usage[check.window].used}/${check.limit} (${Math.round(usage[check.window].used / check.limit * 100)}%)`);
        }
      }

      return {
        allowed: true,
        quotaStatus: {
          minute: { used: usage.minute.used, limit: quotaLimits.requestsPerMinute || null },
          hour: { used: usage.hour.used, limit: quotaLimits.requestsPerHour || null },
          day: { used: usage.day.used, limit: quotaLimits.requestsPerDay || null }
        }
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error checking quota for ${providerName}:`, error.message);
      // Allow request on error to avoid blocking service
      return { allowed: true, error: error.message };
    }
  }

  async recordUsage(providerName, requestType = 'parseQuery', tokensUsed = 1) {
    try {
      if (!this.usage.has(providerName)) {
        this.initializeProviderUsage(providerName);
      }

      const usage = this.usage.get(providerName);
      const now = new Date();

      // Record the request
      usage.requests.push({
        timestamp: now,
        type: requestType,
        tokens: tokensUsed
      });

      // Update counters
      usage.minute.used += tokensUsed;
      usage.hour.used += tokensUsed;
      usage.day.used += tokensUsed;

      console.log(`[${new Date().toISOString()}] 📊 Recorded usage for ${providerName}: ${requestType} (${tokensUsed} tokens)`);
      
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error recording usage for ${providerName}:`, error.message);
      return false;
    }
  }

  cleanupOldRequests(providerName) {
    const usage = this.usage.get(providerName);
    if (!usage || !usage.requests) return;

    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Remove requests older than 1 hour
    usage.requests = usage.requests.filter(req => req.timestamp.getTime() > oneHourAgo);
  }

  resetQuota(providerName, window) {
    const usage = this.usage.get(providerName);
    if (!usage) return;

    const oldUsed = usage[window].used;
    usage[window].used = 0;
    usage[window].resetTime = this.getNextResetTime(window);

    console.log(`[${new Date().toISOString()}] 🔄 Reset ${window} quota for ${providerName}: ${oldUsed} -> 0`);

    // Schedule next reset
    this.scheduleQuotaResets(providerName);
  }

  async resetQuotas(providerName = null) {
    try {
      if (providerName) {
        // Reset specific provider
        const usage = this.usage.get(providerName);
        if (usage) {
          usage.minute.used = 0;
          usage.hour.used = 0;
          usage.day.used = 0;
          usage.minute.resetTime = this.getNextResetTime('minute');
          usage.hour.resetTime = this.getNextResetTime('hour');
          usage.day.resetTime = this.getNextResetTime('day');
          usage.requests = [];
          
          this.scheduleQuotaResets(providerName);
          console.log(`[${new Date().toISOString()}] 🔄 Manual reset all quotas for ${providerName}`);
        }
      } else {
        // Reset all providers
        for (const [name] of this.usage) {
          await this.resetQuotas(name);
        }
      }
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error resetting quotas:`, error.message);
      return false;
    }
  }

  isQuotaExceeded(providerName) {
    if (!this.usage.has(providerName)) {
      return false;
    }

    const providerConfig = this.config.getProviderConfig(providerName);
    const quotaLimits = providerConfig.quotas || {};
    const usage = this.usage.get(providerName);

    // Check if any quota is exceeded
    const checks = [
      { window: 'minute', limit: quotaLimits.requestsPerMinute },
      { window: 'hour', limit: quotaLimits.requestsPerHour },
      { window: 'day', limit: quotaLimits.requestsPerDay }
    ];

    for (const check of checks) {
      if (check.limit && usage[check.window].used >= check.limit) {
        return {
          exceeded: true,
          window: check.window,
          used: usage[check.window].used,
          limit: check.limit
        };
      }
    }

    return { exceeded: false };
  }

  async getUsageStats(providerName) {
    try {
      if (!this.usage.has(providerName)) {
        return null;
      }

      const providerConfig = this.config.getProviderConfig(providerName);
      const quotaLimits = providerConfig.quotas || {};
      const usage = this.usage.get(providerName);

      const exceededStatus = this.isQuotaExceeded(providerName);
      
      return {
        provider: providerName,
        timestamp: new Date().toISOString(),
        exceeded: exceededStatus.exceeded,
        quotas: {
          minute: {
            used: usage.minute.used,
            limit: quotaLimits.requestsPerMinute || null,
            resetTime: usage.minute.resetTime,
            utilization: quotaLimits.requestsPerMinute ? 
              Math.round((usage.minute.used / quotaLimits.requestsPerMinute) * 100) : null
          },
          hour: {
            used: usage.hour.used,
            limit: quotaLimits.requestsPerHour || null,
            resetTime: usage.hour.resetTime,
            utilization: quotaLimits.requestsPerHour ? 
              Math.round((usage.hour.used / quotaLimits.requestsPerHour) * 100) : null
          },
          day: {
            used: usage.day.used,
            limit: quotaLimits.requestsPerDay || null,
            resetTime: usage.day.resetTime,
            utilization: quotaLimits.requestsPerDay ? 
              Math.round((usage.day.used / quotaLimits.requestsPerDay) * 100) : null
          }
        },
        recentRequests: usage.requests.slice(-10) // Last 10 requests
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error getting usage stats for ${providerName}:`, error.message);
      return null;
    }
  }

  // Get all providers usage stats
  async getAllUsageStats() {
    const stats = {};
    for (const [providerName] of this.usage) {
      stats[providerName] = await this.getUsageStats(providerName);
    }
    return stats;
  }

  // Cleanup method to clear all timers
  cleanup() {
    for (const [providerName, timers] of this.quotaResetTimers) {
      Object.values(timers).forEach(timer => clearTimeout(timer));
    }
    this.quotaResetTimers.clear();
    console.log(`[${new Date().toISOString()}] 🧹 QuotaTracker cleanup completed`);
  }
}

module.exports = QuotaTracker;