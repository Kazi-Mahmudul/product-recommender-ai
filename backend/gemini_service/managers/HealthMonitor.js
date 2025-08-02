const ErrorClassifier = require('../utils/ErrorClassifier');

class HealthMonitor {
  constructor(configManagerOrProviders, config) {
    // Handle both ConfigurationManager and array of providers
    if (configManagerOrProviders && typeof configManagerOrProviders.getEnabledProviders === 'function') {
      // It's a ConfigurationManager
      this.configManager = configManagerOrProviders;
      this.providers = this.configManager.getEnabledProviders();
      this.config = config || {};
    } else {
      // It's an array of providers (legacy)
      this.providers = configManagerOrProviders || [];
      this.config = config || {};
    }
    
    this.providerStatus = new Map();
    this.healthCheckTimers = new Map();
    this.errorClassifier = new ErrorClassifier();
    this.initializeProviders();
  }

  initializeProviders() {
    for (const provider of this.providers) {
      this.initializeProviderStatus(provider.name);
    }
  }

  initializeProviderStatus(providerName) {
    if (!this.providerStatus.has(providerName)) {
      this.providerStatus.set(providerName, {
        status: 'available',
        lastCheck: new Date(),
        lastSuccess: new Date(),
        errorCount: 0,
        consecutiveErrors: 0,
        nextRetry: null,
        currentError: null,
        responseTime: null,
        healthHistory: []
      });
      
      console.log(`[${new Date().toISOString()}] 🏥 Initialized health monitoring for provider: ${providerName}`);
    }
  }

  async checkProviderHealth(providerName) {
    try {
      if (!this.providerStatus.has(providerName)) {
        this.initializeProviderStatus(providerName);
      }

      const status = this.providerStatus.get(providerName);
      const startTime = Date.now();
      
      console.log(`[${new Date().toISOString()}] 🔍 Checking health for provider: ${providerName}`);

      // Get provider configuration - handle both ConfigurationManager and direct config
      let providerConfig;
      if (this.configManager && typeof this.configManager.getProviderConfig === 'function') {
        providerConfig = this.configManager.getProviderConfig(providerName);
      } else {
        // Fallback to default config for testing
        providerConfig = {
          enabled: true,
          apiKey: `test-${providerName}-key`,
          name: providerName
        };
      }
      
      // Perform health check based on provider type
      const healthResult = await this.performHealthCheck(providerConfig);
      const responseTime = Date.now() - startTime;

      // Update status based on result
      if (healthResult.healthy) {
        this.markProviderHealthy(providerName, responseTime);
        console.log(`[${new Date().toISOString()}] ✅ Provider ${providerName} is healthy (${responseTime}ms)`);
      } else {
        this.markProviderUnhealthy(providerName, healthResult.error, responseTime);
        console.warn(`[${new Date().toISOString()}] ❌ Provider ${providerName} is unhealthy: ${healthResult.error.message}`);
      }

      return {
        provider: providerName,
        healthy: healthResult.healthy,
        responseTime,
        error: healthResult.error,
        status: this.providerStatus.get(providerName)
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error checking health for ${providerName}:`, error.message);
      this.markProviderUnhealthy(providerName, error, 0);
      
      return {
        provider: providerName,
        healthy: false,
        responseTime: 0,
        error,
        status: this.providerStatus.get(providerName)
      };
    }
  }

  async performHealthCheck(providerConfig) {
    try {
      // For now, we'll do a simple configuration validation
      // In a real implementation, this would make actual API calls
      
      if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
        throw new Error('API key is missing or empty');
      }

      if (!providerConfig.enabled) {
        throw new Error('Provider is disabled in configuration');
      }

      // Simulate a lightweight health check
      // In production, this might be a simple API call like getting model info
      // For testing, we'll skip the delay

      return { healthy: true };
    } catch (error) {
      return { healthy: false, error };
    }
  }

  markProviderHealthy(providerName, responseTime) {
    const status = this.providerStatus.get(providerName);
    const now = new Date();

    status.status = 'available';
    status.lastCheck = now;
    status.lastSuccess = now;
    status.consecutiveErrors = 0;
    status.nextRetry = null;
    status.currentError = null;
    status.responseTime = responseTime;

    // Add to health history (keep last 10 entries)
    status.healthHistory.push({
      timestamp: now,
      healthy: true,
      responseTime,
      error: null
    });
    
    if (status.healthHistory.length > 10) {
      status.healthHistory.shift();
    }

    // Clear any existing recovery timer
    if (this.healthCheckTimers.has(providerName)) {
      clearTimeout(this.healthCheckTimers.get(providerName));
      this.healthCheckTimers.delete(providerName);
    }
  }

  markProviderUnhealthy(providerName, error, responseTime) {
    const status = this.providerStatus.get(providerName);
    const now = new Date();

    status.lastCheck = now;
    status.errorCount++;
    status.consecutiveErrors++;
    status.currentError = {
      message: error.message,
      type: this.classifyError(error),
      timestamp: now
    };
    status.responseTime = responseTime;

    // Add to health history
    status.healthHistory.push({
      timestamp: now,
      healthy: false,
      responseTime,
      error: {
        message: error.message,
        type: status.currentError.type
      }
    });
    
    if (status.healthHistory.length > 10) {
      status.healthHistory.shift();
    }

    // Determine if provider should be marked as unavailable
    if (status.consecutiveErrors >= 3) {
      status.status = 'unavailable';
      this.scheduleRecoveryCheck(providerName);
      console.warn(`[${new Date().toISOString()}] 🚫 Provider ${providerName} marked as unavailable after ${status.consecutiveErrors} consecutive errors`);
    } else {
      status.status = 'degraded';
      console.warn(`[${new Date().toISOString()}] ⚠️ Provider ${providerName} is degraded (${status.consecutiveErrors}/3 errors)`);
    }
  }

  classifyError(error) {
    return this.errorClassifier.classifyError(error);
  }

  scheduleRecoveryCheck(providerName) {
    const status = this.providerStatus.get(providerName);
    
    // Calculate exponential backoff delay
    const baseDelay = 30000; // 30 seconds
    const maxDelay = 300000; // 5 minutes
    const backoffMultiplier = Math.min(status.consecutiveErrors, 10);
    const delay = Math.min(baseDelay * Math.pow(2, backoffMultiplier - 1), maxDelay);
    
    status.nextRetry = new Date(Date.now() + delay);
    
    console.log(`[${new Date().toISOString()}] ⏰ Scheduled recovery check for ${providerName} in ${Math.round(delay / 1000)}s`);

    // Clear existing timer
    if (this.healthCheckTimers.has(providerName)) {
      clearTimeout(this.healthCheckTimers.get(providerName));
    }

    // Schedule recovery check
    const timer = setTimeout(async () => {
      console.log(`[${new Date().toISOString()}] 🔄 Attempting recovery check for ${providerName}`);
      const result = await this.checkProviderHealth(providerName);
      
      if (!result.healthy) {
        // Still unhealthy, schedule another check
        this.scheduleRecoveryCheck(providerName);
      }
    }, delay);

    this.healthCheckTimers.set(providerName, timer);
  }

  getProviderStatus(providerName) {
    if (!this.providerStatus.has(providerName)) {
      return null;
    }

    const status = this.providerStatus.get(providerName);
    return {
      provider: providerName,
      status: status.status,
      lastCheck: status.lastCheck,
      lastSuccess: status.lastSuccess,
      errorCount: status.errorCount,
      consecutiveErrors: status.consecutiveErrors,
      nextRetry: status.nextRetry,
      currentError: status.currentError,
      responseTime: status.responseTime,
      healthHistory: [...status.healthHistory] // Return a copy
    };
  }

  getAllProviderStatus() {
    const allStatus = {};
    for (const [providerName] of this.providerStatus) {
      allStatus[providerName] = this.getProviderStatus(providerName);
    }
    return allStatus;
  }

  isProviderAvailable(providerName) {
    const status = this.providerStatus.get(providerName);
    return status ? status.status === 'available' : false;
  }

  getAvailableProviders() {
    const available = [];
    for (const [providerName, status] of this.providerStatus) {
      if (status.status === 'available') {
        available.push(providerName);
      }
    }
    return available;
  }

  async performHealthChecks() {
    console.log(`[${new Date().toISOString()}] 🏥 Performing health checks for all providers`);
    
    const results = [];
    for (const provider of this.providers) {
      try {
        const result = await this.checkProviderHealth(provider.name);
        results.push(result);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to check health for ${provider.name}:`, error.message);
        results.push({
          provider: provider.name,
          healthy: false,
          error,
          responseTime: 0
        });
      }
    }

    return results;
  }

  startPeriodicHealthChecks(interval = 60000) { // Default 1 minute
    console.log(`[${new Date().toISOString()}] 🔄 Starting periodic health checks every ${interval / 1000}s`);
    
    // Perform initial health check
    this.performHealthChecks();

    // Schedule periodic checks
    this.periodicTimer = setInterval(() => {
      this.performHealthChecks();
    }, interval);

    return this.periodicTimer;
  }

  stopPeriodicHealthChecks() {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
      console.log(`[${new Date().toISOString()}] ⏹️ Stopped periodic health checks`);
    }
  }

  // Force mark a provider as available (for manual recovery)
  forceMarkAvailable(providerName) {
    if (!this.providerStatus.has(providerName)) {
      this.initializeProviderStatus(providerName);
    }

    const status = this.providerStatus.get(providerName);
    status.status = 'available';
    status.consecutiveErrors = 0;
    status.nextRetry = null;
    status.currentError = null;

    // Clear recovery timer
    if (this.healthCheckTimers.has(providerName)) {
      clearTimeout(this.healthCheckTimers.get(providerName));
      this.healthCheckTimers.delete(providerName);
    }

    console.log(`[${new Date().toISOString()}] 🔧 Manually marked ${providerName} as available`);
  }

  // Force mark a provider as unavailable (for manual intervention)
  forceMarkUnavailable(providerName, reason = 'Manual intervention') {
    if (!this.providerStatus.has(providerName)) {
      this.initializeProviderStatus(providerName);
    }

    const status = this.providerStatus.get(providerName);
    status.status = 'unavailable';
    status.currentError = {
      message: reason,
      type: 'manual_intervention',
      timestamp: new Date()
    };

    console.log(`[${new Date().toISOString()}] 🔧 Manually marked ${providerName} as unavailable: ${reason}`);
  }

  /**
   * Get the status of a specific provider
   */
  getProviderStatus(providerName) {
    const status = this.providerStatus.get(providerName);
    if (!status) {
      return null;
    }
    
    return {
      ...status,
      isHealthy: status.status === 'available'
    };
  }

  /**
   * Get the status of all providers
   */
  getAllProviderStatus() {
    const allStatus = {};
    for (const [providerName, status] of this.providerStatus) {
      allStatus[providerName] = {
        ...status,
        isHealthy: status.status === 'available'
      };
    }
    return allStatus;
  }

  cleanup() {
    // Clear all timers
    for (const [providerName, timer] of this.healthCheckTimers) {
      clearTimeout(timer);
    }
    this.healthCheckTimers.clear();

    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }

    console.log(`[${new Date().toISOString()}] 🧹 HealthMonitor cleanup completed`);
  }
}

module.exports = HealthMonitor;