/**
 * Unit tests for RetryService
 */

import { RetryService, ErrorType, DEFAULT_RETRY_CONFIG } from '../retryService';

describe('RetryService', () => {
  let retryService: RetryService;

  beforeEach(() => {
    retryService = new RetryService();
    jest.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', async () => {
      const networkError = new TypeError('Failed to fetch');
      let caughtError: any;

      try {
        await retryService.executeWithRetry(() => Promise.reject(networkError));
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(caughtError.isRetryable).toBe(true);
    });

    it('should classify insufficient resources errors correctly', async () => {
      const resourceError = new Error('net::ERR_INSUFFICIENT_RESOURCES');
      let caughtError: any;

      try {
        await retryService.executeWithRetry(() => Promise.reject(resourceError));
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.type).toBe(ErrorType.INSUFFICIENT_RESOURCES);
      expect(caughtError.isRetryable).toBe(true);
    });

    it('should classify abort errors as non-retryable', async () => {
      const abortError = new Error('Operation aborted');
      abortError.name = 'AbortError';
      let caughtError: any;

      try {
        await retryService.executeWithRetry(() => Promise.reject(abortError));
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.type).toBe(ErrorType.ABORT_ERROR);
      expect(caughtError.isRetryable).toBe(false);
    });

    it('should classify HTTP 429 as rate limit error', async () => {
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).statusCode = 429;
      let caughtError: any;

      try {
        await retryService.executeWithRetry(() => Promise.reject(rateLimitError));
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.type).toBe(ErrorType.RATE_LIMIT_ERROR);
      expect(caughtError.isRetryable).toBe(true);
    });

    it('should classify HTTP 5xx as retryable', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).statusCode = 500;
      let caughtError: any;

      try {
        await retryService.executeWithRetry(() => Promise.reject(serverError));
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.type).toBe(ErrorType.HTTP_ERROR);
      expect(caughtError.isRetryable).toBe(true);
    });

    it('should classify HTTP 4xx (except 429) as non-retryable', async () => {
      const clientError = new Error('Not Found');
      (clientError as any).statusCode = 404;
      let caughtError: any;

      try {
        await retryService.executeWithRetry(() => Promise.reject(clientError));
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError.type).toBe(ErrorType.HTTP_ERROR);
      expect(caughtError.isRetryable).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should retry retryable errors up to max attempts', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce('success');

      const result = await retryService.executeWithRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const abortError = new Error('Operation aborted');
      abortError.name = 'AbortError';
      const mockOperation = jest.fn().mockRejectedValue(abortError);

      await expect(retryService.executeWithRetry(mockOperation)).rejects.toThrow('Operation aborted');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const networkError = new TypeError('Failed to fetch');
      const mockOperation = jest.fn().mockRejectedValue(networkError);

      await expect(retryService.executeWithRetry(mockOperation)).rejects.toThrow('Failed to fetch');
      expect(mockOperation).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxRetries + 1);
    });

    it('should respect AbortSignal', async () => {
      const controller = new AbortController();
      const mockOperation = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      // Abort after first attempt
      setTimeout(() => controller.abort(), 100);

      await expect(
        retryService.executeWithRetry(mockOperation, controller.signal)
      ).rejects.toThrow('Operation aborted');
    });
  });

  describe('Delay Calculation', () => {
    it('should calculate exponential backoff correctly', async () => {
      const startTime = Date.now();
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce('success');

      await retryService.executeWithRetry(mockOperation);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should have waited at least the initial delay (accounting for jitter)
      expect(elapsed).toBeGreaterThan(DEFAULT_RETRY_CONFIG.initialDelay * 0.5);
    });

    it('should use longer delay for insufficient resources', async () => {
      const customService = new RetryService({ initialDelay: 100, jitter: false });
      const startTime = Date.now();
      
      const resourceError = new Error('net::ERR_INSUFFICIENT_RESOURCES');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(resourceError)
        .mockResolvedValueOnce('success');

      await customService.executeWithRetry(mockOperation);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should have waited longer than standard delay (2x multiplier for insufficient resources)
      expect(elapsed).toBeGreaterThan(200);
    });

    it('should respect retry-after header for rate limiting', async () => {
      const customService = new RetryService({ jitter: false });
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).statusCode = 429;
      (rateLimitError as any).retryAfter = 2; // 2 seconds

      const startTime = Date.now();
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      await customService.executeWithRetry(mockOperation);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should have waited approximately 2 seconds
      expect(elapsed).toBeGreaterThan(1900);
      expect(elapsed).toBeLessThan(2500);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      const customConfig = { maxRetries: 1, initialDelay: 500 };
      const customService = new RetryService(customConfig);

      const mockOperation = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(customService.executeWithRetry(mockOperation)).rejects.toThrow();
      expect(mockOperation).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });

    it('should update configuration', () => {
      const newConfig = { maxRetries: 5 };
      retryService.updateConfig(newConfig);

      const config = retryService.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(DEFAULT_RETRY_CONFIG.initialDelay); // Should keep other defaults
    });
  });
});