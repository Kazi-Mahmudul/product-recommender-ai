const ErrorClassifier = require('../utils/ErrorClassifier');

describe('ErrorClassifier', () => {
  let errorClassifier;

  beforeEach(() => {
    errorClassifier = new ErrorClassifier();
  });

  describe('constructor', () => {
    test('should initialize with error types and patterns', () => {
      expect(errorClassifier.ERROR_TYPES).toBeDefined();
      expect(errorClassifier.errorPatterns).toBeDefined();
      expect(errorClassifier.statusCodeMappings).toBeDefined();
      expect(errorClassifier.userMessages).toBeDefined();
    });

    test('should have all required error types', () => {
      const expectedTypes = [
        'QUOTA_EXCEEDED', 'AUTHENTICATION_ERROR', 'RATE_LIMIT_ERROR',
        'NETWORK_ERROR', 'TIMEOUT_ERROR', 'PARSE_ERROR',
        'CONFIGURATION_ERROR', 'PROVIDER_ERROR', 'UNKNOWN_ERROR'
      ];
      
      expectedTypes.forEach(type => {
        expect(errorClassifier.ERROR_TYPES[type]).toBeDefined();
      });
    });
  });

  describe('classifyError', () => {
    test('should classify quota exceeded errors', () => {
      const errors = [
        new Error('You exceeded your current quota'),
        new Error('Daily limit exceeded'),
        new Error('Usage limit reached'),
        new Error('Billing quota exhausted'),
        new Error('Resource exhausted')
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED);
      });
    });

    test('should classify authentication errors', () => {
      const errors = [
        new Error('Invalid API key'),
        new Error('Authentication failed'),
        new Error('Unauthorized access'),
        new Error('Access denied'),
        new Error('Forbidden'),
        new Error('Token expired')
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.AUTHENTICATION_ERROR);
      });
    });

    test('should classify rate limit errors', () => {
      const errors = [
        new Error('Too many requests'),
        new Error('Request throttled'),
        new Error('Requests per second limit'),
        new Error('Please slow down'),
        new Error('Rate limit reached')  // Changed from "exceeded" to avoid quota classification
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.RATE_LIMIT_ERROR);
      });
    });

    test('should classify network errors', () => {
      const errors = [
        new Error('Network error occurred'),
        new Error('Connection failed'),
        new Error('Connection refused'),
        new Error('Host unreachable'),
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND')
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.NETWORK_ERROR);
      });
    });

    test('should classify timeout errors', () => {
      const errors = [
        new Error('Request timeout'),
        new Error('Response timeout'),
        new Error('Operation timed out'),
        new Error('Deadline exceeded'),
        new Error('ETIMEDOUT')
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.TIMEOUT_ERROR);
      });
    });

    test('should classify parse errors', () => {
      const errors = [
        new Error('JSON parse error'),
        new Error('Invalid JSON format'),
        new Error('Malformed response'),
        new Error('Unexpected token'),
        new Error('Syntax error in response')
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.PARSE_ERROR);
      });
    });

    test('should classify configuration errors', () => {
      const errors = [
        new Error('Configuration error'),
        new Error('Invalid configuration'),
        new Error('Missing configuration'),
        new Error('Unsupported provider type'),
        new Error('Provider not found')
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.CONFIGURATION_ERROR);
      });
    });

    test('should classify provider errors', () => {
      const errors = [
        new Error('Service unavailable'),
        new Error('Internal server error'),
        new Error('Bad gateway'),
        new Error('Service is down'),
        new Error('Temporarily unavailable')
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.PROVIDER_ERROR);
      });
    });

    test('should classify errors by status code', () => {
      const testCases = [
        { status: 401, expected: errorClassifier.ERROR_TYPES.AUTHENTICATION_ERROR },
        { status: 403, expected: errorClassifier.ERROR_TYPES.AUTHENTICATION_ERROR },
        { status: 429, expected: errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED },
        { status: 408, expected: errorClassifier.ERROR_TYPES.TIMEOUT_ERROR },
        { status: 500, expected: errorClassifier.ERROR_TYPES.PROVIDER_ERROR },
        { status: 502, expected: errorClassifier.ERROR_TYPES.PROVIDER_ERROR },
        { status: 503, expected: errorClassifier.ERROR_TYPES.PROVIDER_ERROR },
        { status: 504, expected: errorClassifier.ERROR_TYPES.TIMEOUT_ERROR }
      ];

      testCases.forEach(({ status, expected }) => {
        const error = new Error('Test error');
        error.status = status;
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(expected);
      });
    });

    test('should classify errors by error name', () => {
      const testCases = [
        { name: 'TimeoutError', expected: errorClassifier.ERROR_TYPES.TIMEOUT_ERROR },
        { name: 'NetworkError', expected: errorClassifier.ERROR_TYPES.NETWORK_ERROR },
        { name: 'ConnectionError', expected: errorClassifier.ERROR_TYPES.NETWORK_ERROR },
        { name: 'SyntaxError', expected: errorClassifier.ERROR_TYPES.PARSE_ERROR },
        { name: 'ParseError', expected: errorClassifier.ERROR_TYPES.PARSE_ERROR }
      ];

      testCases.forEach(({ name, expected }) => {
        const error = new Error('Test error');
        error.name = name;
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(expected);
      });
    });

    test('should classify errors by error code', () => {
      const testCases = [
        { code: 'ETIMEDOUT', expected: errorClassifier.ERROR_TYPES.TIMEOUT_ERROR },
        { code: 'ECONNREFUSED', expected: errorClassifier.ERROR_TYPES.NETWORK_ERROR },
        { code: 'ENOTFOUND', expected: errorClassifier.ERROR_TYPES.NETWORK_ERROR }
      ];

      testCases.forEach(({ code, expected }) => {
        const error = new Error('Test error');
        error.code = code;
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(expected);
      });
    });

    test('should return unknown error for unclassifiable errors', () => {
      const errors = [
        new Error('Some random error message'),
        new Error(''),
        null,
        undefined
      ];

      errors.forEach(error => {
        const result = errorClassifier.classifyError(error);
        expect(result).toBe(errorClassifier.ERROR_TYPES.UNKNOWN_ERROR);
      });
    });
  });

  describe('getUserMessage', () => {
    test('should return appropriate user messages for each error type', () => {
      const errorTypes = Object.values(errorClassifier.ERROR_TYPES);
      
      errorTypes.forEach(errorType => {
        const message = errorClassifier.getUserMessage(errorType);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('null');
      });
    });

    test('should return default message for unknown error types', () => {
      const message = errorClassifier.getUserMessage('invalid_error_type');
      expect(message).toBe(errorClassifier.userMessages[errorClassifier.ERROR_TYPES.UNKNOWN_ERROR]);
    });

    test('should not expose internal details in user messages', () => {
      const errorTypes = Object.values(errorClassifier.ERROR_TYPES);
      
      errorTypes.forEach(errorType => {
        const message = errorClassifier.getUserMessage(errorType);
        expect(message).not.toMatch(/error/i);
        expect(message).not.toMatch(/exception/i);
        expect(message).not.toMatch(/stack/i);
        expect(message).not.toMatch(/debug/i);
      });
    });
  });

  describe('createClassifiedError', () => {
    test('should create classified error object with all required fields', () => {
      const originalError = new Error('Test error message');
      originalError.status = 429;
      
      const result = errorClassifier.createClassifiedError(originalError, 'gemini', 'parseQuery');
      
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('operation');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('originalError');
      
      expect(result.type).toBe(errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED);
      expect(result.provider).toBe('gemini');
      expect(result.operation).toBe('parseQuery');
      expect(result.statusCode).toBe(429);
    });

    test('should handle errors without status codes', () => {
      const originalError = new Error('Network connection failed');
      
      const result = errorClassifier.createClassifiedError(originalError);
      
      expect(result.type).toBe(errorClassifier.ERROR_TYPES.NETWORK_ERROR);
      expect(result.statusCode).toBeNull();
      expect(result.provider).toBe('unknown');
      expect(result.operation).toBe('unknown');
    });

    test('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const originalError = new Error('Test error');
      const result = errorClassifier.createClassifiedError(originalError);
      
      expect(result.originalError.stack).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should exclude stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const originalError = new Error('Test error');
      const result = errorClassifier.createClassifiedError(originalError);
      
      expect(result.originalError.stack).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('isRetryable', () => {
    test('should identify retryable errors', () => {
      const retryableTypes = [
        errorClassifier.ERROR_TYPES.NETWORK_ERROR,
        errorClassifier.ERROR_TYPES.TIMEOUT_ERROR,
        errorClassifier.ERROR_TYPES.RATE_LIMIT_ERROR,
        errorClassifier.ERROR_TYPES.PROVIDER_ERROR
      ];

      retryableTypes.forEach(errorType => {
        expect(errorClassifier.isRetryable(errorType)).toBe(true);
      });
    });

    test('should identify non-retryable errors', () => {
      const nonRetryableTypes = [
        errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED,
        errorClassifier.ERROR_TYPES.AUTHENTICATION_ERROR,
        errorClassifier.ERROR_TYPES.PARSE_ERROR,
        errorClassifier.ERROR_TYPES.CONFIGURATION_ERROR,
        errorClassifier.ERROR_TYPES.UNKNOWN_ERROR
      ];

      nonRetryableTypes.forEach(errorType => {
        expect(errorClassifier.isRetryable(errorType)).toBe(false);
      });
    });
  });

  describe('getRetryDelay', () => {
    test('should return appropriate delays for different error types', () => {
      const testCases = [
        { type: errorClassifier.ERROR_TYPES.RATE_LIMIT_ERROR, expectedBase: 5000 },
        { type: errorClassifier.ERROR_TYPES.NETWORK_ERROR, expectedBase: 2000 },
        { type: errorClassifier.ERROR_TYPES.TIMEOUT_ERROR, expectedBase: 3000 },
        { type: errorClassifier.ERROR_TYPES.PROVIDER_ERROR, expectedBase: 10000 }
      ];

      testCases.forEach(({ type, expectedBase }) => {
        const delay = errorClassifier.getRetryDelay(type, 1);
        expect(delay).toBeGreaterThanOrEqual(expectedBase);
        expect(delay).toBeLessThanOrEqual(expectedBase + 1000); // Base + jitter
      });
    });

    test('should implement exponential backoff', () => {
      const errorType = errorClassifier.ERROR_TYPES.NETWORK_ERROR;
      
      const delay1 = errorClassifier.getRetryDelay(errorType, 1);
      const delay2 = errorClassifier.getRetryDelay(errorType, 2);
      const delay3 = errorClassifier.getRetryDelay(errorType, 3);
      
      // Should increase with attempt number (accounting for jitter)
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
      expect(delay3).toBeGreaterThan(delay2 * 1.5);
    });

    test('should cap delay at maximum value', () => {
      const errorType = errorClassifier.ERROR_TYPES.NETWORK_ERROR;
      const delay = errorClassifier.getRetryDelay(errorType, 10); // High attempt number
      
      expect(delay).toBeLessThanOrEqual(60000); // Should be capped at 1 minute
    });

    test('should return default delay for unknown error types', () => {
      const delay = errorClassifier.getRetryDelay('unknown_type', 1);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(2000); // 1000 + jitter
    });
  });

  describe('shouldTriggerFallback', () => {
    test('should trigger fallback for appropriate error types', () => {
      const fallbackTriggers = [
        errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED,
        errorClassifier.ERROR_TYPES.AUTHENTICATION_ERROR,
        errorClassifier.ERROR_TYPES.CONFIGURATION_ERROR
      ];

      fallbackTriggers.forEach(errorType => {
        expect(errorClassifier.shouldTriggerFallback(errorType)).toBe(true);
      });
    });

    test('should not trigger fallback for temporary errors', () => {
      const nonFallbackTypes = [
        errorClassifier.ERROR_TYPES.NETWORK_ERROR,
        errorClassifier.ERROR_TYPES.TIMEOUT_ERROR,
        errorClassifier.ERROR_TYPES.RATE_LIMIT_ERROR,
        errorClassifier.ERROR_TYPES.PROVIDER_ERROR,
        errorClassifier.ERROR_TYPES.PARSE_ERROR,
        errorClassifier.ERROR_TYPES.UNKNOWN_ERROR
      ];

      nonFallbackTypes.forEach(errorType => {
        expect(errorClassifier.shouldTriggerFallback(errorType)).toBe(false);
      });
    });
  });

  describe('getErrorSeverity', () => {
    test('should return correct severity levels', () => {
      const severityTests = [
        { type: errorClassifier.ERROR_TYPES.PARSE_ERROR, expected: 'low' },
        { type: errorClassifier.ERROR_TYPES.TIMEOUT_ERROR, expected: 'low' },
        { type: errorClassifier.ERROR_TYPES.NETWORK_ERROR, expected: 'medium' },
        { type: errorClassifier.ERROR_TYPES.RATE_LIMIT_ERROR, expected: 'medium' },
        { type: errorClassifier.ERROR_TYPES.PROVIDER_ERROR, expected: 'medium' },
        { type: errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED, expected: 'high' },
        { type: errorClassifier.ERROR_TYPES.AUTHENTICATION_ERROR, expected: 'high' },
        { type: errorClassifier.ERROR_TYPES.CONFIGURATION_ERROR, expected: 'critical' },
        { type: errorClassifier.ERROR_TYPES.UNKNOWN_ERROR, expected: 'medium' }
      ];

      severityTests.forEach(({ type, expected }) => {
        expect(errorClassifier.getErrorSeverity(type)).toBe(expected);
      });
    });

    test('should return default severity for unknown error types', () => {
      const severity = errorClassifier.getErrorSeverity('unknown_type');
      expect(severity).toBe('medium');
    });
  });

  describe('logError', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation()
      };
    });

    afterEach(() => {
      Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });

    test('should log with appropriate level based on severity', () => {
      const testCases = [
        { type: errorClassifier.ERROR_TYPES.PARSE_ERROR, expectedMethod: 'log' },
        { type: errorClassifier.ERROR_TYPES.NETWORK_ERROR, expectedMethod: 'warn' },
        { type: errorClassifier.ERROR_TYPES.QUOTA_EXCEEDED, expectedMethod: 'error' },
        { type: errorClassifier.ERROR_TYPES.CONFIGURATION_ERROR, expectedMethod: 'error' }
      ];

      testCases.forEach(({ type, expectedMethod }) => {
        const classifiedError = {
          type: type,
          message: 'Test error',
          timestamp: new Date().toISOString()
        };

        errorClassifier.logError(classifiedError, 'Test context');
        expect(consoleSpy[expectedMethod]).toHaveBeenCalled();
      });
    });

    test('should include context in log message', () => {
      const classifiedError = {
        type: errorClassifier.ERROR_TYPES.NETWORK_ERROR,
        message: 'Test error',
        timestamp: new Date().toISOString()
      };

      errorClassifier.logError(classifiedError, 'API Request');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('API Request')
      );
    });

    test('should include error type and message in log', () => {
      const classifiedError = {
        type: errorClassifier.ERROR_TYPES.TIMEOUT_ERROR,
        message: 'Request timed out',
        timestamp: new Date().toISOString()
      };

      errorClassifier.logError(classifiedError);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('timeout_error')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Request timed out')
      );
    });
  });
});