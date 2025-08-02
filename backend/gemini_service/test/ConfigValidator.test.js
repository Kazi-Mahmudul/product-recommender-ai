const ConfigValidator = require('../utils/ConfigValidator');
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');

describe('ConfigValidator', () => {
  let validator;
  let mockFs;

  beforeEach(() => {
    mockFs = fs;
    validator = new ConfigValidator('./test-config');
    
    // Reset environment variables
    delete process.env.GOOGLE_API_KEY;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default config path', () => {
      const defaultValidator = new ConfigValidator();
      expect(defaultValidator.configPath).toBe('./config');
    });

    test('should initialize with custom config path', () => {
      expect(validator.configPath).toBe('./test-config');
      expect(validator.errors).toEqual([]);
      expect(validator.warnings).toEqual([]);
    });
  });

  describe('validateConfigFiles', () => {
    test('should report missing required files', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await validator.validateConfigFiles();

      expect(validator.errors).toHaveLength(3);
      expect(validator.errors[0].message).toContain('ai-providers.json');
      expect(validator.errors[1].message).toContain('quota-limits.json');
      expect(validator.errors[2].message).toContain('environment.json');
    });

    test('should report invalid JSON files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json content');

      await validator.validateConfigFiles();

      expect(validator.errors.length).toBeGreaterThan(0);
      expect(validator.errors.some(e => e.message.includes('Invalid JSON'))).toBe(true);
    });

    test('should validate valid configuration files', async () => {
      const validProvidersConfig = {
        providers: {
          gemini: {
            name: 'gemini',
            type: 'google-generative-ai',
            enabled: true,
            priority: 100,
            limits: {
              requestsPerMinute: 15,
              requestsPerHour: 1000,
              requestsPerDay: 1500
            }
          }
        },
        fallback: { enabled: true },
        system: { defaultProvider: 'gemini' }
      };

      const validQuotaConfig = {
        quotaLimits: {
          gemini: {
            provider: 'gemini',
            limits: { requestsPerMinute: 15 },
            tracking: { primaryMetric: 'requests' },
            thresholds: { warning: { requests: 0.8 } }
          }
        }
      };

      const validEnvironmentConfig = {
        environmentVariables: {
          GOOGLE_API_KEY: { required: true }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ai-providers.json')) {
          return JSON.stringify(validProvidersConfig);
        } else if (filePath.includes('quota-limits.json')) {
          return JSON.stringify(validQuotaConfig);
        } else if (filePath.includes('environment.json')) {
          return JSON.stringify(validEnvironmentConfig);
        }
        return '{}';
      });

      await validator.validateConfigFiles();

      // Should have minimal errors for this basic valid config
      const configErrors = validator.errors.filter(e => e.category === 'config');
      expect(configErrors).toHaveLength(0);
    });
  });

  describe('validateProvider', () => {
    test('should validate required provider properties', () => {
      const invalidProvider = {
        name: 'test',
        // missing required properties
      };

      validator.validateProvider('test', invalidProvider);

      const providerErrors = validator.errors.filter(e => e.category === 'providers');
      expect(providerErrors.length).toBeGreaterThan(0);
      expect(providerErrors.some(e => e.message.includes('missing required property'))).toBe(true);
    });

    test('should validate provider name matches key', () => {
      const provider = {
        name: 'different-name',
        type: 'google-generative-ai',
        enabled: true,
        priority: 100,
        limits: { requestsPerMinute: 15, requestsPerHour: 1000, requestsPerDay: 1500 }
      };

      validator.validateProvider('test', provider);

      const nameError = validator.errors.find(e => 
        e.message.includes("doesn't match configuration key")
      );
      expect(nameError).toBeDefined();
    });

    test('should validate provider type', () => {
      const provider = {
        name: 'test',
        type: 'invalid-type',
        enabled: true,
        priority: 100,
        limits: { requestsPerMinute: 15, requestsPerHour: 1000, requestsPerDay: 1500 }
      };

      validator.validateProvider('test', provider);

      const typeError = validator.errors.find(e => 
        e.message.includes('has invalid type')
      );
      expect(typeError).toBeDefined();
    });

    test('should validate priority is a non-negative number', () => {
      const provider = {
        name: 'test',
        type: 'google-generative-ai',
        enabled: true,
        priority: -1,
        limits: { requestsPerMinute: 15, requestsPerHour: 1000, requestsPerDay: 1500 }
      };

      validator.validateProvider('test', provider);

      const priorityError = validator.errors.find(e => 
        e.message.includes('priority must be a non-negative number')
      );
      expect(priorityError).toBeDefined();
    });

    test('should check for API key environment variable', () => {
      const provider = {
        name: 'test',
        type: 'google-generative-ai',
        enabled: true,
        priority: 100,
        limits: { requestsPerMinute: 15, requestsPerHour: 1000, requestsPerDay: 1500 },
        apiKeyEnv: 'TEST_API_KEY'
      };

      validator.validateProvider('test', provider);

      const apiKeyError = validator.errors.find(e => 
        e.message.includes('environment variable') && e.message.includes('is not set')
      );
      expect(apiKeyError).toBeDefined();
    });
  });

  describe('validateProviderLimits', () => {
    test('should validate required limits', () => {
      const limits = {
        // missing required limits
      };

      validator.validateProviderLimits('test', limits);

      const limitErrors = validator.errors.filter(e => 
        e.message.includes('missing required limit')
      );
      expect(limitErrors.length).toBe(3); // requestsPerMinute, requestsPerHour, requestsPerDay
    });

    test('should validate limits are non-negative numbers', () => {
      const limits = {
        requestsPerMinute: -1,
        requestsPerHour: 'invalid',
        requestsPerDay: 1500
      };

      validator.validateProviderLimits('test', limits);

      const numberErrors = validator.errors.filter(e => 
        e.message.includes('must be a non-negative number')
      );
      expect(numberErrors.length).toBe(2);
    });

    test('should warn about limit hierarchy issues', () => {
      const limits = {
        requestsPerMinute: 100,
        requestsPerHour: 50, // Less than 60 * requestsPerMinute
        requestsPerDay: 25   // Less than requestsPerHour
      };

      validator.validateProviderLimits('test', limits);

      const hierarchyWarnings = validator.warnings.filter(w => 
        w.message.includes('limit is less than')
      );
      expect(hierarchyWarnings.length).toBe(2);
    });
  });

  describe('validateEnvironmentVariables', () => {
    test('should validate required environment variables', () => {
      const envConfig = {
        environmentVariables: {
          GOOGLE_API_KEY: { required: true }
        },
        environmentProfiles: {
          development: {
            requiredVariables: ['GOOGLE_API_KEY']
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(envConfig));

      process.env.NODE_ENV = 'development';

      validator.validateEnvironmentVariables();

      const envError = validator.errors.find(e => 
        e.message.includes('Required environment variable missing: GOOGLE_API_KEY')
      );
      expect(envError).toBeDefined();
    });

    test('should validate environment variable patterns', () => {
      const envConfig = {
        environmentVariables: {
          GOOGLE_API_KEY: {
            required: true,
            validation: {
              pattern: '^[A-Za-z0-9_-]+$',
              minLength: 10
            }
          }
        },
        environmentProfiles: {
          development: {
            requiredVariables: ['GOOGLE_API_KEY']
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(envConfig));

      process.env.NODE_ENV = 'development';
      process.env.GOOGLE_API_KEY = 'invalid@key'; // Contains invalid character

      validator.validateEnvironmentVariables();

      const patternError = validator.errors.find(e => 
        e.message.includes("doesn't match required pattern")
      );
      expect(patternError).toBeDefined();
    });

    test('should validate environment variable length', () => {
      const envConfig = {
        environmentVariables: {
          GOOGLE_API_KEY: {
            required: true,
            validation: {
              minLength: 20,
              maxLength: 100
            }
          }
        },
        environmentProfiles: {
          development: {
            requiredVariables: ['GOOGLE_API_KEY']
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(envConfig));

      process.env.NODE_ENV = 'development';
      process.env.GOOGLE_API_KEY = 'short'; // Too short

      validator.validateEnvironmentVariables();

      const lengthError = validator.errors.find(e => 
        e.message.includes('is too short')
      );
      expect(lengthError).toBeDefined();
    });

    test('should validate enum values', () => {
      const envConfig = {
        environmentVariables: {
          LOG_LEVEL: {
            validation: {
              enum: ['error', 'warn', 'info', 'debug']
            }
          }
        },
        environmentProfiles: {
          development: {
            requiredVariables: ['LOG_LEVEL']
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(envConfig));

      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'invalid';

      validator.validateEnvironmentVariables();

      const enumError = validator.errors.find(e => 
        e.message.includes('has invalid value')
      );
      expect(enumError).toBeDefined();
    });
  });

  describe('validateAll', () => {
    test('should perform complete validation', async () => {
      // Mock all files as missing to trigger errors
      mockFs.existsSync.mockReturnValue(false);

      const results = await validator.validateAll();

      expect(results.isValid).toBe(false);
      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.summary.totalErrors).toBe(results.errors.length);
      expect(results.summary.totalWarnings).toBe(results.warnings.length);
    });

    test('should handle validation errors gracefully', async () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const results = await validator.validateAll();

      expect(results.isValid).toBe(false);
      expect(results.errors.length).toBeGreaterThan(0);
      
      // Check if there's a system error (the exact message might vary)
      const hasSystemError = results.errors.some(e => 
        e.category === 'system' || e.message.includes('validation failed') || e.message.includes('File system error')
      );
      expect(hasSystemError).toBe(true);
    });
  });

  describe('validation report', () => {
    test('should generate formatted validation report', async () => {
      // Add some test errors and warnings
      validator.addError('test', 'Test error message');
      validator.addWarning('test', 'Test warning message');

      validator.validationResults = {
        isValid: false,
        errors: validator.errors,
        warnings: validator.warnings,
        summary: validator.generateValidationSummary()
      };

      const report = validator.getValidationReport();

      expect(report).toContain('Configuration Validation Report');
      expect(report).toContain('❌ Configuration has errors');
      expect(report).toContain('ERRORS:');
      expect(report).toContain('WARNINGS:');
      expect(report).toContain('Test error message');
      expect(report).toContain('Test warning message');
    });

    test('should show success message for valid configuration', async () => {
      validator.validationResults = {
        isValid: true,
        errors: [],
        warnings: [],
        summary: { totalErrors: 0, totalWarnings: 0, categories: {} }
      };

      const report = validator.getValidationReport();

      expect(report).toContain('✅ Configuration is valid!');
    });
  });

  describe('helper methods', () => {
    test('should add errors correctly', () => {
      validator.addError('test', 'Test error');
      
      expect(validator.errors).toHaveLength(1);
      expect(validator.errors[0]).toEqual({
        category: 'test',
        message: 'Test error',
        type: 'error'
      });
    });

    test('should add warnings correctly', () => {
      validator.addWarning('test', 'Test warning');
      
      expect(validator.warnings).toHaveLength(1);
      expect(validator.warnings[0]).toEqual({
        category: 'test',
        message: 'Test warning',
        type: 'warning'
      });
    });

    test('should generate validation summary correctly', () => {
      validator.addError('config', 'Config error');
      validator.addError('providers', 'Provider error');
      validator.addWarning('config', 'Config warning');

      const summary = validator.generateValidationSummary();

      expect(summary.totalErrors).toBe(2);
      expect(summary.totalWarnings).toBe(1);
      expect(summary.isValid).toBe(false);
      expect(summary.categories.config).toEqual({ errors: 1, warnings: 1 });
      expect(summary.categories.providers).toEqual({ errors: 1, warnings: 0 });
    });
  });
});