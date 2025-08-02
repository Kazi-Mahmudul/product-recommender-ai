/**
 * Error Classification Utility for AI Quota Management System
 * 
 * This utility provides comprehensive error classification and handling
 * for different types of errors that can occur with AI providers.
 */

class ErrorClassifier {
  constructor() {
    // Error type constants
    this.ERROR_TYPES = {
      QUOTA_EXCEEDED: 'quota_exceeded',
      AUTHENTICATION_ERROR: 'authentication_error',
      RATE_LIMIT_ERROR: 'rate_limit_error',
      NETWORK_ERROR: 'network_error',
      TIMEOUT_ERROR: 'timeout_error',
      PARSE_ERROR: 'parse_error',
      CONFIGURATION_ERROR: 'configuration_error',
      PROVIDER_ERROR: 'provider_error',
      UNKNOWN_ERROR: 'unknown_error'
    };

    // Error patterns for classification
    this.errorPatterns = {
      [this.ERROR_TYPES.QUOTA_EXCEEDED]: [
        /quota.*exceeded/i,
        /exceeded.*quota/i,
        /limit.*exceeded/i,
        /exceeded.*limit/i,
        /usage.*limit/i,
        /daily.*limit/i,
        /monthly.*limit/i,
        /billing.*quota/i,
        /resource.*exhausted/i,
        /current.*quota/i
      ],
      [this.ERROR_TYPES.AUTHENTICATION_ERROR]: [
        /authentication.*failed/i,
        /invalid.*api.*key/i,
        /unauthorized/i,
        /access.*denied/i,
        /forbidden/i,
        /invalid.*credentials/i,
        /api.*key.*missing/i,
        /token.*expired/i,
        /permission.*denied/i
      ],
      [this.ERROR_TYPES.RATE_LIMIT_ERROR]: [
        /rate.*limit(?!.*exceeded)/i,  // Rate limit but not "rate limit exceeded"
        /too.*many.*requests/i,
        /throttled/i,
        /requests.*per.*second/i,
        /requests.*per.*minute/i,
        /slow.*down/i,
        /backoff/i
      ],
      [this.ERROR_TYPES.NETWORK_ERROR]: [
        /network.*error/i,
        /connection.*failed/i,
        /connection.*refused/i,
        /connection.*timeout/i,
        /dns.*resolution/i,
        /host.*unreachable/i,
        /socket.*error/i,
        /econnrefused/i,
        /enotfound/i,
        /etimedout/i
      ],
      [this.ERROR_TYPES.TIMEOUT_ERROR]: [
        /(?<!connection\s)timeout/i,  // Timeout but not "connection timeout"
        /request.*timeout/i,
        /response.*timeout/i,
        /deadline.*exceeded/i,
        /operation.*timeout/i,
        /timed.*out/i
      ],
      [this.ERROR_TYPES.PARSE_ERROR]: [
        /json.*parse/i,
        /invalid.*json/i,
        /malformed.*response/i,
        /unexpected.*token/i,
        /syntax.*error/i,
        /parse.*error/i,
        /invalid.*format/i
      ],
      [this.ERROR_TYPES.CONFIGURATION_ERROR]: [
        /configuration.*error/i,
        /config.*invalid/i,
        /missing.*configuration/i,
        /invalid.*provider/i,
        /unsupported.*provider/i,
        /provider.*not.*found/i,
        /invalid.*configuration/i,
        /configuration.*error/i
      ],
      [this.ERROR_TYPES.PROVIDER_ERROR]: [
        /provider.*error/i,
        /service.*unavailable/i,
        /internal.*server.*error/i,
        /bad.*gateway/i,
        /service.*down/i,
        /maintenance.*mode/i,
        /temporarily.*unavailable/i
      ]
    };

    // HTTP status code mappings
    this.statusCodeMappings = {
      400: this.ERROR_TYPES.PROVIDER_ERROR,
      401: this.ERROR_TYPES.AUTHENTICATION_ERROR,
      403: this.ERROR_TYPES.AUTHENTICATION_ERROR,
      404: this.ERROR_TYPES.PROVIDER_ERROR,
      408: this.ERROR_TYPES.TIMEOUT_ERROR,
      429: this.ERROR_TYPES.QUOTA_EXCEEDED,
      500: this.ERROR_TYPES.PROVIDER_ERROR,
      502: this.ERROR_TYPES.PROVIDER_ERROR,
      503: this.ERROR_TYPES.PROVIDER_ERROR,
      504: this.ERROR_TYPES.TIMEOUT_ERROR
    };

    // User-friendly error messages
    this.userMessages = {
      [this.ERROR_TYPES.QUOTA_EXCEEDED]: "I'm experiencing high usage right now. Please try again in a moment.",
      [this.ERROR_TYPES.AUTHENTICATION_ERROR]: "I'm having trouble with my AI service configuration. Please contact support.",
      [this.ERROR_TYPES.RATE_LIMIT_ERROR]: "I'm processing too many requests right now. Please wait a moment and try again.",
      [this.ERROR_TYPES.NETWORK_ERROR]: "I'm having trouble connecting to my AI services. Please try again in a moment.",
      [this.ERROR_TYPES.TIMEOUT_ERROR]: "The request is taking longer than expected. Please try again.",
      [this.ERROR_TYPES.PARSE_ERROR]: "I'm having trouble understanding the response. Could you try rephrasing your question?",
      [this.ERROR_TYPES.CONFIGURATION_ERROR]: "There's a configuration issue with my AI services. Please contact support.",
      [this.ERROR_TYPES.PROVIDER_ERROR]: "My AI service is temporarily unavailable. Please try again in a moment.",
      [this.ERROR_TYPES.UNKNOWN_ERROR]: "Sorry, I couldn't understand that. Can you please rephrase your question?"
    };
  }

  /**
   * Classify an error based on its message, status code, and other properties
   * @param {Error} error - The error to classify
   * @returns {string} - The error type
   */
  classifyError(error) {
    if (!error) {
      return this.ERROR_TYPES.UNKNOWN_ERROR;
    }

    // Check status code first if available
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      if (this.statusCodeMappings[statusCode]) {
        return this.statusCodeMappings[statusCode];
      }
    }

    // Check error message patterns in specific order (most specific first)
    const errorMessage = error.message || error.toString() || '';
    
    // Check for quota exceeded patterns first (most specific)
    if (this.errorPatterns[this.ERROR_TYPES.QUOTA_EXCEEDED].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.QUOTA_EXCEEDED;
    }
    
    // Check for authentication errors
    if (this.errorPatterns[this.ERROR_TYPES.AUTHENTICATION_ERROR].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.AUTHENTICATION_ERROR;
    }
    
    // Check for configuration errors
    if (this.errorPatterns[this.ERROR_TYPES.CONFIGURATION_ERROR].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.CONFIGURATION_ERROR;
    }
    
    // Check for parse errors
    if (this.errorPatterns[this.ERROR_TYPES.PARSE_ERROR].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.PARSE_ERROR;
    }
    
    // Check for timeout errors (before network errors as they can overlap)
    if (this.errorPatterns[this.ERROR_TYPES.TIMEOUT_ERROR].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.TIMEOUT_ERROR;
    }
    
    // Check for network errors
    if (this.errorPatterns[this.ERROR_TYPES.NETWORK_ERROR].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.NETWORK_ERROR;
    }
    
    // Check for rate limit errors
    if (this.errorPatterns[this.ERROR_TYPES.RATE_LIMIT_ERROR].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.RATE_LIMIT_ERROR;
    }
    
    // Check for provider errors
    if (this.errorPatterns[this.ERROR_TYPES.PROVIDER_ERROR].some(pattern => pattern.test(errorMessage))) {
      return this.ERROR_TYPES.PROVIDER_ERROR;
    }

    // Check error name/type
    if (error.name) {
      const errorName = error.name.toLowerCase();
      if (errorName.includes('timeout')) {
        return this.ERROR_TYPES.TIMEOUT_ERROR;
      }
      if (errorName.includes('network') || errorName.includes('connection')) {
        return this.ERROR_TYPES.NETWORK_ERROR;
      }
      if (errorName.includes('syntax') || errorName.includes('parse')) {
        return this.ERROR_TYPES.PARSE_ERROR;
      }
    }

    // Check error code
    if (error.code) {
      const errorCode = error.code.toLowerCase();
      if (errorCode.includes('timeout') || errorCode.includes('etimedout')) {
        return this.ERROR_TYPES.TIMEOUT_ERROR;
      }
      if (errorCode.includes('econnrefused') || errorCode.includes('enotfound')) {
        return this.ERROR_TYPES.NETWORK_ERROR;
      }
    }

    return this.ERROR_TYPES.UNKNOWN_ERROR;
  }

  /**
   * Get a user-friendly error message for a given error type
   * @param {string} errorType - The error type
   * @returns {string} - User-friendly error message
   */
  getUserMessage(errorType) {
    return this.userMessages[errorType] || this.userMessages[this.ERROR_TYPES.UNKNOWN_ERROR];
  }

  /**
   * Create a classified error object with additional metadata
   * @param {Error} originalError - The original error
   * @param {string} provider - The provider that caused the error
   * @param {string} operation - The operation that failed
   * @returns {Object} - Classified error object
   */
  createClassifiedError(originalError, provider = 'unknown', operation = 'unknown') {
    const errorType = this.classifyError(originalError);
    const userMessage = this.getUserMessage(errorType);
    
    return {
      type: errorType,
      message: originalError.message || 'Unknown error',
      userMessage: userMessage,
      provider: provider,
      operation: operation,
      timestamp: new Date().toISOString(),
      statusCode: originalError.status || originalError.statusCode || null,
      originalError: {
        name: originalError.name,
        message: originalError.message,
        stack: process.env.NODE_ENV === 'development' ? originalError.stack : undefined
      }
    };
  }

  /**
   * Determine if an error is retryable
   * @param {string} errorType - The error type
   * @returns {boolean} - Whether the error is retryable
   */
  isRetryable(errorType) {
    const retryableErrors = [
      this.ERROR_TYPES.NETWORK_ERROR,
      this.ERROR_TYPES.TIMEOUT_ERROR,
      this.ERROR_TYPES.RATE_LIMIT_ERROR,
      this.ERROR_TYPES.PROVIDER_ERROR
    ];
    
    return retryableErrors.includes(errorType);
  }

  /**
   * Get recommended retry delay for an error type
   * @param {string} errorType - The error type
   * @param {number} attemptNumber - The current attempt number
   * @returns {number} - Recommended delay in milliseconds
   */
  getRetryDelay(errorType, attemptNumber = 1) {
    const baseDelays = {
      [this.ERROR_TYPES.RATE_LIMIT_ERROR]: 5000,  // 5 seconds
      [this.ERROR_TYPES.NETWORK_ERROR]: 2000,     // 2 seconds
      [this.ERROR_TYPES.TIMEOUT_ERROR]: 3000,     // 3 seconds
      [this.ERROR_TYPES.PROVIDER_ERROR]: 10000    // 10 seconds
    };

    const baseDelay = baseDelays[errorType] || 1000;
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 60000); // Cap at 1 minute
  }

  /**
   * Determine if an error should trigger fallback mode
   * @param {string} errorType - The error type
   * @returns {boolean} - Whether to trigger fallback mode
   */
  shouldTriggerFallback(errorType) {
    const fallbackTriggers = [
      this.ERROR_TYPES.QUOTA_EXCEEDED,
      this.ERROR_TYPES.AUTHENTICATION_ERROR,
      this.ERROR_TYPES.CONFIGURATION_ERROR
    ];
    
    return fallbackTriggers.includes(errorType);
  }

  /**
   * Get error severity level
   * @param {string} errorType - The error type
   * @returns {string} - Severity level (low, medium, high, critical)
   */
  getErrorSeverity(errorType) {
    const severityLevels = {
      [this.ERROR_TYPES.PARSE_ERROR]: 'low',
      [this.ERROR_TYPES.TIMEOUT_ERROR]: 'low',
      [this.ERROR_TYPES.NETWORK_ERROR]: 'medium',
      [this.ERROR_TYPES.RATE_LIMIT_ERROR]: 'medium',
      [this.ERROR_TYPES.PROVIDER_ERROR]: 'medium',
      [this.ERROR_TYPES.QUOTA_EXCEEDED]: 'high',
      [this.ERROR_TYPES.AUTHENTICATION_ERROR]: 'high',
      [this.ERROR_TYPES.CONFIGURATION_ERROR]: 'critical',
      [this.ERROR_TYPES.UNKNOWN_ERROR]: 'medium'
    };
    
    return severityLevels[errorType] || 'medium';
  }

  /**
   * Log error with appropriate level based on severity
   * @param {Object} classifiedError - The classified error object
   * @param {string} context - Additional context for logging
   */
  logError(classifiedError, context = '') {
    const severity = this.getErrorSeverity(classifiedError.type);
    const logMessage = `[${classifiedError.timestamp}] ${context} Error: ${classifiedError.type} - ${classifiedError.message}`;
    
    switch (severity) {
      case 'low':
        console.log(`ℹ️ ${logMessage}`);
        break;
      case 'medium':
        console.warn(`⚠️ ${logMessage}`);
        break;
      case 'high':
        console.error(`❌ ${logMessage}`);
        break;
      case 'critical':
        console.error(`🚨 CRITICAL ${logMessage}`);
        break;
      default:
        console.log(`📝 ${logMessage}`);
    }
  }
}

module.exports = ErrorClassifier;