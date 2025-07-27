/**
 * Retry service with exponential backoff logic
 * Handles retry logic for failed API requests with configurable parameters
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
};

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  ABORT_ERROR = 'ABORT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
}

export interface RetryableError extends Error {
  type: ErrorType;
  statusCode?: number;
  retryAfter?: number;
  isRetryable: boolean;
}

export class RetryService {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Classifies an error to determine retry strategy
   */
  private classifyError(error: any): RetryableError {
    const retryableError: RetryableError = {
      ...error,
      type: ErrorType.NETWORK_ERROR,
      isRetryable: true,
    };

    // Network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      retryableError.type = ErrorType.NETWORK_ERROR;
      retryableError.isRetryable = true;
    }
    // Insufficient resources error
    else if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
      retryableError.type = ErrorType.INSUFFICIENT_RESOURCES;
      retryableError.isRetryable = true;
    }
    // Abort errors (not retryable)
    else if (error.name === 'AbortError') {
      retryableError.type = ErrorType.ABORT_ERROR;
      retryableError.isRetryable = false;
    }
    // HTTP errors
    else if (error.statusCode || error.status) {
      const statusCode = error.statusCode || error.status;
      retryableError.statusCode = statusCode;
      retryableError.type = ErrorType.HTTP_ERROR;

      // Rate limiting
      if (statusCode === 429) {
        retryableError.type = ErrorType.RATE_LIMIT_ERROR;
        retryableError.retryAfter = error.retryAfter || undefined;
        retryableError.isRetryable = true;
      }
      // Server errors (5xx) are retryable
      else if (statusCode >= 500) {
        retryableError.isRetryable = true;
      }
      // Client errors (4xx) except 429 are not retryable
      else if (statusCode >= 400 && statusCode < 500) {
        retryableError.isRetryable = false;
      }
    }
    // Timeout errors
    else if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      retryableError.type = ErrorType.TIMEOUT_ERROR;
      retryableError.isRetryable = true;
    }

    return retryableError;
  }

  /**
   * Calculates delay for next retry attempt
   */
  private calculateDelay(attempt: number, error: RetryableError): number {
    let delay: number;

    // Use retry-after header for rate limiting if available
    if (error.type === ErrorType.RATE_LIMIT_ERROR && error.retryAfter) {
      delay = error.retryAfter * 1000; // Convert to milliseconds
    }
    // Longer delay for insufficient resources
    else if (error.type === ErrorType.INSUFFICIENT_RESOURCES) {
      delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt) * 2;
    }
    // Standard exponential backoff
    else {
      delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    }

    // Apply jitter to prevent thundering herd
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    // Cap at maximum delay
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Executes an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = customConfig ? { ...this.config, ...customConfig } : this.config;
    let lastError: RetryableError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      // Check if operation was aborted
      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }

      try {
        return await operation();
      } catch (error) {
        lastError = this.classifyError(error);

        // Don't retry if error is not retryable or we've exhausted retries
        if (!lastError.isRetryable || attempt === config.maxRetries) {
          throw lastError;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, lastError);

        console.warn(
          `Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms delay. Error:`,
          lastError.message
        );

        // Wait before retrying
        await this.delay(delay, signal);
      }
    }

    throw lastError!;
  }

  /**
   * Creates a delay that can be cancelled by AbortSignal
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error('Operation aborted'));
      };

      signal?.addEventListener('abort', abortHandler, { once: true });
    });
  }

  /**
   * Updates retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const retryService = new RetryService();