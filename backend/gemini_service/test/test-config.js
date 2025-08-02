/**
 * Test Configuration Setup
 * 
 * Sets up test environment with proper configuration files and mocks.
 */

const fs = require('fs');
const path = require('path');

class TestConfigSetup {
  constructor() {
    this.configDir = path.join(__dirname, '../config');
    this.testConfigDir = path.join(__dirname, 'fixtures/config');
  }

  /**
   * Setup test configuration files
   */
  setupTestConfig() {
    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Create test configuration files if they don't exist
    this.createTestProvidersConfig();
    this.createTestQuotaConfig();
    this.createTestEnvironmentConfig();
  }

  createTestProvidersConfig() {
    const configPath = path.join(this.configDir, 'ai-providers.json');
    
    if (!fs.existsSync(configPath)) {
      const config = {
        providers: {
          gemini: {
            enabled: true,
            priority: 1,
            apiKey: 'test-gemini-key',
            baseUrl: 'https://test-gemini.com/v1',
            model: 'gemini-pro',
            timeout: 5000,
            retries: 2,
            limits: {
              requestsPerMinute: 10,
              requestsPerHour: 100,
              requestsPerDay: 1000
            }
          },
          openai: {
            enabled: true,
            priority: 2,
            apiKey: 'test-openai-key',
            baseUrl: 'https://test-openai.com/v1',
            model: 'gpt-3.5-turbo',
            timeout: 5000,
            retries: 2,
            limits: {
              requestsPerMinute: 8,
              requestsPerHour: 80,
              requestsPerDay: 800
            }
          },
          claude: {
            enabled: false,
            priority: 3,
            apiKey: 'test-claude-key',
            baseUrl: 'https://test-claude.com/v1',
            model: 'claude-3-sonnet',
            timeout: 5000,
            retries: 2,
            limits: {
              requestsPerMinute: 5,
              requestsPerHour: 50,
              requestsPerDay: 500
            }
          }
        },
        fallback: {
          enabled: true,
          timeout: 2000,
          retries: 1
        },
        system: {
          defaultProvider: 'gemini',
          enableHealthChecks: false,
          healthCheckInterval: 10000,
          enableMetrics: false,
          enableLogging: false
        }
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
  }

  createTestQuotaConfig() {
    const configPath = path.join(this.configDir, 'quota-limits.json');
    
    if (!fs.existsSync(configPath)) {
      const config = {
        quotaLimits: {
          gemini: {
            requestsPerMinute: 10,
            requestsPerHour: 100,
            requestsPerDay: 1000,
            tokensPerMinute: 5000,
            tokensPerHour: 50000,
            tokensPerDay: 500000,
            resetPeriod: 'daily',
            warningThreshold: 0.8,
            hardLimit: true
          },
          openai: {
            requestsPerMinute: 8,
            requestsPerHour: 80,
            requestsPerDay: 800,
            tokensPerMinute: 4000,
            tokensPerHour: 40000,
            tokensPerDay: 400000,
            resetPeriod: 'daily',
            warningThreshold: 0.8,
            hardLimit: true
          },
          claude: {
            requestsPerMinute: 5,
            requestsPerHour: 50,
            requestsPerDay: 500,
            tokensPerMinute: 2500,
            tokensPerHour: 25000,
            tokensPerDay: 250000,
            resetPeriod: 'daily',
            warningThreshold: 0.8,
            hardLimit: true
          }
        },
        globalSettings: {
          enableQuotaEnforcement: true,
          quotaCheckInterval: 5000,
          quotaResetTime: '00:00',
          quotaResetTimezone: 'UTC',
          enableQuotaAlerts: false,
          quotaAlertThreshold: 0.9,
          enableQuotaLogging: false,
          quotaLogLevel: 'error'
        }
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
  }

  createTestEnvironmentConfig() {
    const configPath = path.join(this.configDir, 'environment.json');
    
    if (!fs.existsSync(configPath)) {
      const config = {
        environmentVariables: {
          NODE_ENV: 'test',
          LOG_LEVEL: 'error',
          PORT: '3000',
          ENABLE_METRICS: 'false',
          ENABLE_HEALTH_CHECKS: 'false',
          HEALTH_CHECK_INTERVAL: '10000',
          QUOTA_CHECK_INTERVAL: '5000',
          FALLBACK_ENABLED: 'true',
          FALLBACK_TIMEOUT: '2000'
        },
        environmentProfiles: {
          test: {
            LOG_LEVEL: 'error',
            ENABLE_METRICS: 'false',
            ENABLE_HEALTH_CHECKS: 'false'
          }
        }
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
  }

  /**
   * Clean up test configuration files
   */
  cleanupTestConfig() {
    const configFiles = [
      'ai-providers.json',
      'quota-limits.json',
      'environment.json'
    ];

    configFiles.forEach(file => {
      const filePath = path.join(this.configDir, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn(`Failed to cleanup test config file ${file}:`, error.message);
        }
      }
    });
  }

  /**
   * Get mock configuration for tests
   */
  getMockConfig() {
    return {
      providers: [
        {
          name: 'gemini',
          type: 'gemini',
          enabled: true,
          priority: 1,
          apiKey: 'test-gemini-key',
          quotas: {
            requestsPerMinute: 10,
            requestsPerHour: 100,
            requestsPerDay: 1000
          },
          retryConfig: {
            maxRetries: 2,
            initialDelay: 500,
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
            requestsPerMinute: 8,
            requestsPerHour: 80,
            requestsPerDay: 800
          },
          retryConfig: {
            maxRetries: 2,
            initialDelay: 500,
            backoffMultiplier: 2
          }
        }
      ],
      fallback: {
        enabled: true,
        responseDelay: 50
      },
      monitoring: {
        healthCheckInterval: 10000,
        quotaWarningThreshold: 0.8
      }
    };
  }
}

module.exports = TestConfigSetup;