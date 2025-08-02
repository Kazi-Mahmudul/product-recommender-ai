/**
 * Configuration Validator for AI Quota Management System
 * 
 * Validates configuration files and environment variables
 * to ensure proper system setup and prevent runtime errors.
 */

const fs = require('fs');
const path = require('path');

class ConfigValidator {
  constructor(configPath = './config') {
    this.configPath = configPath;
    this.errors = [];
    this.warnings = [];
    this.validationResults = {
      isValid: false,
      errors: [],
      warnings: [],
      summary: {}
    };
  }

  /**
   * Validate all configuration files and environment variables
   * @returns {Object} Validation results
   */
  async validateAll() {
    this.errors = [];
    this.warnings = [];

    try {
      // Validate configuration files
      await this.validateConfigFiles();
      
      // Validate environment variables
      this.validateEnvironmentVariables();
      
      // Validate provider configurations
      this.validateProviderConfigurations();
      
      // Validate quota configurations
      this.validateQuotaConfigurations();
      
      // Generate summary
      this.generateValidationSummary();
      
    } catch (error) {
      this.addError('system', `Configuration validation failed: ${error.message}`);
    }

    this.validationResults = {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      summary: this.generateValidationSummary()
    };

    return this.validationResults;
  }

  /**
   * Validate configuration files exist and are valid JSON
   */
  async validateConfigFiles() {
    const requiredFiles = [
      'ai-providers.json',
      'quota-limits.json',
      'environment.json'
    ];

    for (const filename of requiredFiles) {
      const filePath = path.join(this.configPath, filename);
      
      try {
        if (!fs.existsSync(filePath)) {
          this.addError('config', `Required configuration file missing: ${filename}`);
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const config = JSON.parse(content);
        
        // Validate specific file structures
        switch (filename) {
          case 'ai-providers.json':
            this.validateProvidersConfig(config);
            break;
          case 'quota-limits.json':
            this.validateQuotaConfig(config);
            break;
          case 'environment.json':
            this.validateEnvironmentConfig(config);
            break;
        }
        
      } catch (error) {
        if (error instanceof SyntaxError) {
          this.addError('config', `Invalid JSON in ${filename}: ${error.message}`);
        } else {
          this.addError('config', `Error reading ${filename}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Validate providers configuration structure
   * @param {Object} config - Providers configuration
   */
  validateProvidersConfig(config) {
    // Check required top-level properties
    const requiredProps = ['providers', 'fallback', 'system'];
    for (const prop of requiredProps) {
      if (!config[prop]) {
        this.addError('providers', `Missing required property: ${prop}`);
      }
    }

    // Validate providers
    if (config.providers) {
      const enabledProviders = [];
      
      for (const [name, provider] of Object.entries(config.providers)) {
        this.validateProvider(name, provider);
        
        if (provider.enabled) {
          enabledProviders.push(name);
        }
      }

      if (enabledProviders.length === 0) {
        this.addWarning('providers', 'No providers are enabled - system will run in fallback mode only');
      }

      // Check if default provider is enabled
      if (config.system?.defaultProvider) {
        const defaultProvider = config.system.defaultProvider;
        if (!config.providers[defaultProvider]) {
          this.addError('providers', `Default provider '${defaultProvider}' not found in providers configuration`);
        } else if (!config.providers[defaultProvider].enabled) {
          this.addWarning('providers', `Default provider '${defaultProvider}' is disabled`);
        }
      }
    }

    // Validate fallback configuration
    if (config.fallback) {
      if (typeof config.fallback.enabled !== 'boolean') {
        this.addError('providers', 'Fallback.enabled must be a boolean');
      }
    }
  }

  /**
   * Validate individual provider configuration
   * @param {string} name - Provider name
   * @param {Object} provider - Provider configuration
   */
  validateProvider(name, provider) {
    const requiredProps = ['name', 'type', 'enabled', 'priority', 'limits'];
    
    for (const prop of requiredProps) {
      if (provider[prop] === undefined) {
        this.addError('providers', `Provider '${name}' missing required property: ${prop}`);
      }
    }

    // Validate provider name matches key
    if (provider.name && provider.name !== name) {
      this.addError('providers', `Provider name '${provider.name}' doesn't match configuration key '${name}'`);
    }

    // Validate provider type
    const validTypes = ['google-generative-ai', 'openai', 'anthropic'];
    if (provider.type && !validTypes.includes(provider.type)) {
      this.addError('providers', `Provider '${name}' has invalid type: ${provider.type}`);
    }

    // Validate priority
    if (provider.priority !== undefined && (typeof provider.priority !== 'number' || provider.priority < 0)) {
      this.addError('providers', `Provider '${name}' priority must be a non-negative number`);
    }

    // Validate limits
    if (provider.limits) {
      this.validateProviderLimits(name, provider.limits);
    }

    // Validate API key environment variable
    if (provider.apiKeyEnv) {
      const envValue = process.env[provider.apiKeyEnv];
      if (provider.enabled && !envValue) {
        this.addError('providers', `Provider '${name}' is enabled but environment variable '${provider.apiKeyEnv}' is not set`);
      }
    }
  }

  /**
   * Validate provider limits configuration
   * @param {string} providerName - Provider name
   * @param {Object} limits - Limits configuration
   */
  validateProviderLimits(providerName, limits) {
    const requiredLimits = ['requestsPerMinute', 'requestsPerHour', 'requestsPerDay'];
    
    for (const limit of requiredLimits) {
      if (limits[limit] === undefined) {
        this.addError('providers', `Provider '${providerName}' missing required limit: ${limit}`);
      } else if (typeof limits[limit] !== 'number' || limits[limit] < 0) {
        this.addError('providers', `Provider '${providerName}' limit '${limit}' must be a non-negative number`);
      }
    }

    // Validate limit hierarchy (day >= hour >= minute)
    if (limits.requestsPerDay && limits.requestsPerHour && limits.requestsPerDay < limits.requestsPerHour) {
      this.addWarning('providers', `Provider '${providerName}' daily limit is less than hourly limit`);
    }
    
    if (limits.requestsPerHour && limits.requestsPerMinute && limits.requestsPerHour < limits.requestsPerMinute * 60) {
      this.addWarning('providers', `Provider '${providerName}' hourly limit is less than 60x minute limit`);
    }
  }

  /**
   * Validate quota configuration structure
   * @param {Object} config - Quota configuration
   */
  validateQuotaConfig(config) {
    if (!config.quotaLimits) {
      this.addError('quota', 'Missing quotaLimits configuration');
      return;
    }

    for (const [provider, quotaConfig] of Object.entries(config.quotaLimits)) {
      this.validateQuotaProvider(provider, quotaConfig);
    }

    // Validate global settings
    if (config.globalSettings) {
      this.validateQuotaGlobalSettings(config.globalSettings);
    }
  }

  /**
   * Validate quota provider configuration
   * @param {string} provider - Provider name
   * @param {Object} quotaConfig - Quota configuration
   */
  validateQuotaProvider(provider, quotaConfig) {
    const requiredProps = ['provider', 'limits', 'tracking', 'thresholds'];
    
    for (const prop of requiredProps) {
      if (!quotaConfig[prop]) {
        this.addError('quota', `Quota config for '${provider}' missing required property: ${prop}`);
      }
    }

    // Validate thresholds
    if (quotaConfig.thresholds) {
      const thresholds = quotaConfig.thresholds;
      
      for (const [type, values] of Object.entries(thresholds)) {
        if (values.requests !== undefined) {
          if (values.requests < 0 || values.requests > 1) {
            this.addError('quota', `Quota threshold '${type}.requests' for '${provider}' must be between 0 and 1`);
          }
        }
      }

      // Validate threshold hierarchy
      if (thresholds.warning?.requests && thresholds.critical?.requests) {
        if (thresholds.warning.requests >= thresholds.critical.requests) {
          this.addWarning('quota', `Warning threshold should be less than critical threshold for '${provider}'`);
        }
      }
    }
  }

  /**
   * Validate quota global settings
   * @param {Object} globalSettings - Global settings
   */
  validateQuotaGlobalSettings(globalSettings) {
    if (globalSettings.quotaCheckInterval !== undefined) {
      if (typeof globalSettings.quotaCheckInterval !== 'number' || globalSettings.quotaCheckInterval < 1000) {
        this.addWarning('quota', 'quotaCheckInterval should be at least 1000ms');
      }
    }

    if (globalSettings.defaultThresholds) {
      const thresholds = globalSettings.defaultThresholds;
      if (thresholds.warning >= thresholds.critical) {
        this.addError('quota', 'Default warning threshold must be less than critical threshold');
      }
    }
  }

  /**
   * Validate environment configuration
   * @param {Object} config - Environment configuration
   */
  validateEnvironmentConfig(config) {
    if (!config.environmentVariables) {
      this.addError('environment', 'Missing environmentVariables configuration');
      return;
    }

    // Validate environment profiles
    if (config.environmentProfiles) {
      const currentEnv = process.env.NODE_ENV || 'development';
      if (!config.environmentProfiles[currentEnv]) {
        this.addWarning('environment', `No environment profile found for NODE_ENV: ${currentEnv}`);
      }
    }
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables() {
    const currentEnv = process.env.NODE_ENV || 'development';
    
    // Load environment configuration
    try {
      const envConfigPath = path.join(this.configPath, 'environment.json');
      const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
      
      // Get required variables for current environment
      const profile = envConfig.environmentProfiles?.[currentEnv];
      const requiredVars = profile?.requiredVariables || [];
      
      // Check required variables
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          this.addError('environment', `Required environment variable missing: ${varName}`);
        } else {
          // Validate format if validation rules exist
          const varConfig = envConfig.environmentVariables[varName];
          if (varConfig?.validation) {
            this.validateEnvironmentVariable(varName, process.env[varName], varConfig.validation);
          }
        }
      }

      // Check recommended variables
      const recommendedVars = profile?.recommendedVariables || [];
      for (const varName of recommendedVars) {
        if (!process.env[varName]) {
          this.addWarning('environment', `Recommended environment variable missing: ${varName}`);
        }
      }
      
    } catch (error) {
      this.addError('environment', `Error validating environment variables: ${error.message}`);
    }
  }

  /**
   * Validate individual environment variable
   * @param {string} name - Variable name
   * @param {string} value - Variable value
   * @param {Object} validation - Validation rules
   */
  validateEnvironmentVariable(name, value, validation) {
    // Pattern validation
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        this.addError('environment', `Environment variable '${name}' doesn't match required pattern`);
      }
    }

    // Length validation
    if (validation.minLength && value.length < validation.minLength) {
      this.addError('environment', `Environment variable '${name}' is too short (minimum: ${validation.minLength})`);
    }
    
    if (validation.maxLength && value.length > validation.maxLength) {
      this.addError('environment', `Environment variable '${name}' is too long (maximum: ${validation.maxLength})`);
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      this.addError('environment', `Environment variable '${name}' has invalid value. Allowed: ${validation.enum.join(', ')}`);
    }

    // Number validation
    if (validation.min !== undefined || validation.max !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        this.addError('environment', `Environment variable '${name}' must be a number`);
      } else {
        if (validation.min !== undefined && numValue < validation.min) {
          this.addError('environment', `Environment variable '${name}' is below minimum value: ${validation.min}`);
        }
        if (validation.max !== undefined && numValue > validation.max) {
          this.addError('environment', `Environment variable '${name}' is above maximum value: ${validation.max}`);
        }
      }
    }
  }

  /**
   * Validate provider configurations against quota configurations
   */
  validateProviderConfigurations() {
    try {
      const providersPath = path.join(this.configPath, 'ai-providers.json');
      const quotaPath = path.join(this.configPath, 'quota-limits.json');
      
      if (!fs.existsSync(providersPath) || !fs.existsSync(quotaPath)) {
        return; // Skip if files don't exist (already reported)
      }

      const providersConfig = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
      const quotaConfig = JSON.parse(fs.readFileSync(quotaPath, 'utf8'));

      // Check that all enabled providers have quota configurations
      for (const [name, provider] of Object.entries(providersConfig.providers || {})) {
        if (provider.enabled && !quotaConfig.quotaLimits?.[name]) {
          this.addWarning('configuration', `Enabled provider '${name}' has no quota configuration`);
        }
      }

      // Check that quota configurations have corresponding providers
      for (const providerName of Object.keys(quotaConfig.quotaLimits || {})) {
        if (providerName !== 'local_fallback' && !providersConfig.providers?.[providerName]) {
          this.addWarning('configuration', `Quota configuration exists for unknown provider: ${providerName}`);
        }
      }
      
    } catch (error) {
      this.addError('configuration', `Error cross-validating configurations: ${error.message}`);
    }
  }

  /**
   * Validate quota configurations
   */
  validateQuotaConfigurations() {
    // This method can be extended for more complex quota validation
    // For now, basic validation is handled in validateQuotaConfig
  }

  /**
   * Add an error to the validation results
   * @param {string} category - Error category
   * @param {string} message - Error message
   */
  addError(category, message) {
    this.errors.push({ category, message, type: 'error' });
  }

  /**
   * Add a warning to the validation results
   * @param {string} category - Warning category
   * @param {string} message - Warning message
   */
  addWarning(category, message) {
    this.warnings.push({ category, message, type: 'warning' });
  }

  /**
   * Generate validation summary
   * @returns {Object} Validation summary
   */
  generateValidationSummary() {
    const summary = {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      isValid: this.errors.length === 0,
      categories: {}
    };

    // Group by category
    [...this.errors, ...this.warnings].forEach(item => {
      if (!summary.categories[item.category]) {
        summary.categories[item.category] = { errors: 0, warnings: 0 };
      }
      summary.categories[item.category][item.type === 'error' ? 'errors' : 'warnings']++;
    });

    return summary;
  }

  /**
   * Get validation report as formatted string
   * @returns {string} Formatted validation report
   */
  getValidationReport() {
    const results = this.validationResults;
    let report = '\n=== Configuration Validation Report ===\n\n';

    if (results.isValid) {
      report += '✅ Configuration is valid!\n';
    } else {
      report += '❌ Configuration has errors that must be fixed.\n';
    }

    report += `\nSummary: ${results.summary.totalErrors} errors, ${results.summary.totalWarnings} warnings\n\n`;

    // Report errors
    if (results.errors.length > 0) {
      report += 'ERRORS:\n';
      results.errors.forEach((error, index) => {
        report += `  ${index + 1}. [${error.category}] ${error.message}\n`;
      });
      report += '\n';
    }

    // Report warnings
    if (results.warnings.length > 0) {
      report += 'WARNINGS:\n';
      results.warnings.forEach((warning, index) => {
        report += `  ${index + 1}. [${warning.category}] ${warning.message}\n`;
      });
      report += '\n';
    }

    // Category breakdown
    if (Object.keys(results.summary.categories).length > 0) {
      report += 'By Category:\n';
      for (const [category, counts] of Object.entries(results.summary.categories)) {
        report += `  ${category}: ${counts.errors} errors, ${counts.warnings} warnings\n`;
      }
    }

    return report;
  }
}

module.exports = ConfigValidator;