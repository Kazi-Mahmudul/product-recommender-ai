const fs = require('fs');
const path = require('path');

class ConfigurationManager {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '../config');
    this.config = null;
    this.loadConfiguration();
  }

  loadConfiguration() {
    try {
      // Load providers configuration
      const providersPath = path.join(this.configPath, 'ai-providers.json');
      let providersConfig = {};
      
      if (fs.existsSync(providersPath)) {
        try {
          providersConfig = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
        } catch (error) {
          console.warn(`Failed to load providers config: ${error.message}`);
          providersConfig = this.getDefaultProvidersConfig();
        }
      } else {
        console.warn('Providers config file not found, using defaults');
        providersConfig = this.getDefaultProvidersConfig();
      }

      // Load quota configuration
      const quotaPath = path.join(this.configPath, 'quota-limits.json');
      let quotaConfig = {};
      
      if (fs.existsSync(quotaPath)) {
        try {
          quotaConfig = JSON.parse(fs.readFileSync(quotaPath, 'utf8'));
        } catch (error) {
          console.warn(`Failed to load quota config: ${error.message}`);
          quotaConfig = this.getDefaultQuotaConfig();
        }
      } else {
        console.warn('Quota config file not found, using defaults');
        quotaConfig = this.getDefaultQuotaConfig();
      }

      // Merge configurations
      this.config = {
        ...providersConfig,
        quotaLimits: quotaConfig.quotaLimits || {},
        globalSettings: quotaConfig.globalSettings || {}
      };

      // Convert new format to old format for compatibility
      if (this.config.providers && typeof this.config.providers === 'object') {
        this.config.providers = Object.entries(this.config.providers).map(([name, config]) => ({
          name,
          type: name,
          enabled: config.enabled || false,
          priority: config.priority || 1,
          apiKey: config.apiKey || `test-${name}-key`,
          quotas: config.limits || {},
          retryConfig: {
            maxRetries: config.retries || 3,
            initialDelay: 1000,
            backoffMultiplier: 2
          }
        }));
      }

      this.validateConfiguration(this.config);
      console.log(`✅ Configuration loaded successfully`);
      return this.config;
    } catch (error) {
      console.error(`❌ Failed to load configuration:`, error.message);
      
      // In test environment, use default configuration
      if (process.env.NODE_ENV === 'test') {
        console.warn('Using default configuration for testing');
        this.config = this.getDefaultConfiguration();
        return this.config;
      }
      
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
  }

  getDefaultProvidersConfig() {
    return {
      providers: {
        gemini: {
          enabled: true,
          priority: 1,
          apiKey: 'test-gemini-key',
          limits: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            requestsPerDay: 10000
          },
          retries: 3
        },
        openai: {
          enabled: true,
          priority: 2,
          apiKey: 'test-openai-key',
          limits: {
            requestsPerMinute: 50,
            requestsPerHour: 800,
            requestsPerDay: 8000
          },
          retries: 3
        },
        claude: {
          enabled: false,
          priority: 3,
          apiKey: 'test-claude-key',
          limits: {
            requestsPerMinute: 40,
            requestsPerHour: 600,
            requestsPerDay: 6000
          },
          retries: 3
        }
      },
      fallback: {
        enabled: true,
        responseDelay: 100
      },
      system: {
        defaultProvider: 'gemini'
      }
    };
  }

  getDefaultQuotaConfig() {
    return {
      quotaLimits: {
        gemini: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        },
        openai: {
          requestsPerMinute: 50,
          requestsPerHour: 800,
          requestsPerDay: 8000
        },
        claude: {
          requestsPerMinute: 40,
          requestsPerHour: 600,
          requestsPerDay: 6000
        }
      },
      globalSettings: {
        enableQuotaEnforcement: true,
        quotaCheckInterval: 60000
      }
    };
  }

  getDefaultConfiguration() {
    return {
      providers: [
        {
          name: 'gemini',
          type: 'gemini',
          enabled: true,
          priority: 1,
          apiKey: 'test-gemini-key',
          quotas: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            requestsPerDay: 10000
          },
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000,
            backoffMultiplier: 2
          }
        },
        {
          name: 'openai',
          type: 'openai',
          enabled: true,
          priority: 2,
          apiKey: 'test-openai-key',
          quotas: {
            requestsPerMinute: 50,
            requestsPerHour: 800,
            requestsPerDay: 8000
          },
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000,
            backoffMultiplier: 2
          }
        }
      ],
      fallback: {
        enabled: true,
        responseDelay: 100
      },
      monitoring: {
        healthCheckInterval: 30000,
        quotaWarningThreshold: 0.8
      }
    };
  }

  updateConfiguration(newConfig) {
    try {
      this.validateConfiguration(newConfig);
      this.config = newConfig;
      
      // Write back to file for persistence
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
      console.log(`✅ Configuration updated and saved to: ${this.configPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update configuration:`, error.message);
      throw new Error(`Configuration update failed: ${error.message}`);
    }
  }

  getProviderConfig(providerName) {
    if (!this.config || !this.config.providers) {
      throw new Error('Configuration not loaded or invalid');
    }

    const provider = this.config.providers.find(p => p.name === providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found in configuration`);
    }

    return provider;
  }

  getQuotaLimits(providerName) {
    const provider = this.getProviderConfig(providerName);
    return provider.quotas || {};
  }

  getEnabledProviders() {
    if (!this.config || !this.config.providers) {
      return [];
    }

    return this.config.providers
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  getFallbackConfig() {
    return this.config?.fallback || { enabled: true, responseDelay: 100 };
  }

  getMonitoringConfig() {
    return this.config?.monitoring || {
      healthCheckInterval: 30000,
      quotaWarningThreshold: 0.8
    };
  }

  /**
   * Get quota configuration for QuotaTracker
   */
  getQuotaConfig() {
    return {
      quotaLimits: this.config?.quotaLimits || {},
      globalSettings: this.config?.globalSettings || {}
    };
  }

  /**
   * Get providers configuration for HealthMonitor
   */
  getProvidersConfig() {
    return {
      providers: this.config?.providers || [],
      fallback: this.config?.fallback || { enabled: true },
      system: this.config?.system || {}
    };
  }

  validateConfiguration(config) {
    if (!config) {
      throw new Error('Configuration is null or undefined');
    }

    if (!config.providers || !Array.isArray(config.providers)) {
      throw new Error('Configuration must have a providers array');
    }

    if (config.providers.length === 0) {
      throw new Error('At least one provider must be configured');
    }

    // Validate each provider
    for (const provider of config.providers) {
      this.validateProvider(provider);
    }

    // Validate fallback config
    if (config.fallback && typeof config.fallback.enabled !== 'boolean') {
      throw new Error('Fallback enabled must be a boolean');
    }

    // Validate monitoring config
    if (config.monitoring) {
      if (config.monitoring.healthCheckInterval && typeof config.monitoring.healthCheckInterval !== 'number') {
        throw new Error('Health check interval must be a number');
      }
      if (config.monitoring.quotaWarningThreshold && 
          (typeof config.monitoring.quotaWarningThreshold !== 'number' || 
           config.monitoring.quotaWarningThreshold < 0 || 
           config.monitoring.quotaWarningThreshold > 1)) {
        throw new Error('Quota warning threshold must be a number between 0 and 1');
      }
    }

    return true;
  }

  validateProvider(provider) {
    const requiredFields = ['name', 'type', 'apiKey', 'priority', 'enabled'];
    
    for (const field of requiredFields) {
      if (!(field in provider)) {
        throw new Error(`Provider missing required field: ${field}`);
      }
    }

    if (typeof provider.name !== 'string' || provider.name.trim() === '') {
      throw new Error('Provider name must be a non-empty string');
    }

    if (typeof provider.type !== 'string' || provider.type.trim() === '') {
      throw new Error('Provider type must be a non-empty string');
    }

    if (typeof provider.apiKey !== 'string' || provider.apiKey.trim() === '') {
      throw new Error('Provider apiKey must be a non-empty string');
    }

    if (typeof provider.priority !== 'number' || provider.priority < 1) {
      throw new Error('Provider priority must be a number >= 1');
    }

    if (typeof provider.enabled !== 'boolean') {
      throw new Error('Provider enabled must be a boolean');
    }

    // Validate quotas if present
    if (provider.quotas) {
      const quotaFields = ['requestsPerMinute', 'requestsPerHour', 'requestsPerDay'];
      for (const field of quotaFields) {
        if (provider.quotas[field] && 
            (typeof provider.quotas[field] !== 'number' || provider.quotas[field] < 0)) {
          throw new Error(`Provider quota ${field} must be a non-negative number`);
        }
      }
    }

    // Validate retry config if present
    if (provider.retryConfig) {
      if (provider.retryConfig.maxRetries && 
          (typeof provider.retryConfig.maxRetries !== 'number' || provider.retryConfig.maxRetries < 0)) {
        throw new Error('Provider maxRetries must be a non-negative number');
      }
      if (provider.retryConfig.backoffMultiplier && 
          (typeof provider.retryConfig.backoffMultiplier !== 'number' || provider.retryConfig.backoffMultiplier < 1)) {
        throw new Error('Provider backoffMultiplier must be a number >= 1');
      }
      if (provider.retryConfig.initialDelay && 
          (typeof provider.retryConfig.initialDelay !== 'number' || provider.retryConfig.initialDelay < 0)) {
        throw new Error('Provider initialDelay must be a non-negative number');
      }
    }

    return true;
  }

  // Hot reload configuration from file
  reloadConfiguration() {
    console.log('🔄 Reloading configuration...');
    return this.loadConfiguration();
  }
}

module.exports = ConfigurationManager;