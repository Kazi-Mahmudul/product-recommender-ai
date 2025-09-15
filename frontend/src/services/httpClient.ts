/**
 * Enhanced HTTP Client Service
 * Provides standardized HTTP requests with error handling, retry logic, and timeouts
 */

import { apiConfig } from './apiConfig';

export interface HTTPClientOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface APIError {
  message: string;
  code: string;
  status?: number;
  suggestions: string[];
  retryable: boolean;
  timestamp: Date;
  originalError?: any;
}

class HTTPClient {
  private defaultOptions: HTTPClientOptions;

  constructor() {
    const retryConfig = apiConfig.getRetryConfig();
    this.defaultOptions = {
      timeout: apiConfig.getTimeout(),
      retryAttempts: retryConfig.attempts,
      retryDelay: retryConfig.delay,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Make a GET request with retry logic
   */
  async get<T>(url: string, options?: HTTPClientOptions): Promise<T> {
    return this.request<T>(url, 'GET', undefined, options);
  }

  /**
   * Make a POST request with retry logic
   */
  async post<T>(url: string, data?: any, options?: HTTPClientOptions): Promise<T> {
    return this.request<T>(url, 'POST', data, options);
  }

  /**
   * Make a PUT request with retry logic
   */
  async put<T>(url: string, data?: any, options?: HTTPClientOptions): Promise<T> {
    return this.request<T>(url, 'PUT', data, options);
  }

  /**
   * Make a DELETE request with retry logic
   */
  async delete<T>(url: string, options?: HTTPClientOptions): Promise<T> {
    return this.request<T>(url, 'DELETE', undefined, options);
  }

  /**
   * Core request method with retry logic and error handling
   */
  private async request<T>(
    url: string,
    method: string,
    data?: any,
    options?: HTTPClientOptions
  ): Promise<T> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const { retryAttempts = 3, retryDelay = 1000 } = mergedOptions;

    let lastError: any;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await this.makeRequest<T>(url, method, data, mergedOptions);
        return response;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except for specific cases
        if (error && typeof error === 'object' && error.status && error.status >= 400 && error.status < 500) {
          if (error.status !== 408 && error.status !== 429) { // Don't retry except for timeout and rate limit
            throw error;
          }
        }

        // Don't retry on the last attempt
        if (attempt === retryAttempts) {
          break;
        }

        // Wait before retrying
        await this.delay(retryDelay * attempt);
        console.log(`🔄 Retrying request (attempt ${attempt + 1}/${retryAttempts}): ${method} ${url}`);
      }
    }

    throw lastError;
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest<T>(
    url: string,
    method: string,
    data?: any,
    options?: HTTPClientOptions
  ): Promise<T> {
    const { timeout = 30000, headers = {} } = options || {};

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestOptions: RequestInit = {
        method,
        headers: { ...this.defaultOptions.headers, ...headers },
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 Making ${method} request to: ${url}`);
      }
      
      const response = await fetch(url, requestOptions);
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.createAPIError(response);
      }

      const result = await response.json();
      
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Request successful: ${method} ${url}`);
      }
      
      return result;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error && error.name === 'AbortError') {
        throw this.createTimeoutError(url, timeout);
      }
      
      if (error && typeof error === 'object' && error.message) {
        throw this.createNetworkError(error, url);
      }
      
      throw this.createNetworkError(error, url);
    }
  }

  /**
   * Create an API error from HTTP response
   */
  private async createAPIError(response: Response): Promise<APIError> {
    let errorData: any = {};
    
    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, use status text
      errorData = { message: response.statusText };
    }

    const status = response.status;
    let message = errorData.message || errorData.detail || response.statusText || 'Unknown error';
    let suggestions: string[] = [];

    // Provide specific error messages and suggestions based on status code
    switch (status) {
      case 400:
        message = 'Invalid request. Please check your input and try again.';
        suggestions = ['Check your query format', 'Try a simpler question', 'Refresh the page'];
        break;
      case 401:
        message = 'Authentication required. Please log in and try again.';
        suggestions = ['Log in to your account', 'Refresh the page', 'Clear browser cache'];
        break;
      case 403:
        message = 'Access denied. You don\'t have permission to perform this action.';
        suggestions = ['Check your account permissions', 'Contact support'];
        break;
      case 404:
        message = 'Service not found. The requested feature may be temporarily unavailable.';
        suggestions = ['Try again later', 'Use a different feature', 'Contact support'];
        break;
      case 405:
        message = 'Method not allowed. This appears to be a technical issue.';
        suggestions = ['Refresh the page', 'Try again', 'Contact support if the issue persists'];
        break;
      case 408:
        message = 'Request timeout. The server took too long to respond.';
        suggestions = ['Try again', 'Check your internet connection', 'Use a simpler query'];
        break;
      case 429:
        message = 'Too many requests. Please wait a moment before trying again.';
        suggestions = ['Wait a few seconds', 'Try again later', 'Use fewer requests'];
        break;
      case 500:
        message = 'Server error. Our services are experiencing issues.';
        suggestions = ['Try again in a few minutes', 'Use basic features', 'Contact support'];
        break;
      case 502:
      case 503:
      case 504:
        message = 'Service temporarily unavailable. Please try again shortly.';
        suggestions = ['Try again in a few minutes', 'Check service status', 'Use offline features'];
        break;
      default:
        suggestions = ['Try again', 'Refresh the page', 'Contact support if the issue persists'];
    }

    return {
      message,
      code: `HTTP_${status}`,
      status,
      suggestions,
      retryable: status >= 500 || status === 408 || status === 429,
      timestamp: new Date(),
      originalError: errorData,
    };
  }

  /**
   * Create a timeout error
   */
  private createTimeoutError(url: string, timeout: number): APIError {
    return {
      message: `Request timed out after ${timeout / 1000} seconds. The server may be busy.`,
      code: 'TIMEOUT',
      suggestions: [
        'Check your internet connection',
        'Try again with a simpler query',
        'Wait a moment and retry',
      ],
      retryable: true,
      timestamp: new Date(),
      originalError: { url, timeout },
    };
  }

  /**
   * Create a network error
   */
  private createNetworkError(error: any, url: string): APIError {
    let message = 'Network error. Please check your internet connection.';
    let suggestions = [
      'Check your internet connection',
      'Try refreshing the page',
      'Try again in a few moments',
    ];

    if (error.message?.includes('Failed to fetch')) {
      message = 'Unable to connect to our services. Please check your internet connection.';
    } else if (error.message?.includes('NetworkError')) {
      message = 'Network connection failed. Please try again.';
    }

    return {
      message,
      code: 'NETWORK_ERROR',
      suggestions,
      retryable: true,
      timestamp: new Date(),
      originalError: { error: error.message, url },
    };
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error: APIError): boolean {
    return error.retryable;
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: APIError): string {
    return error.message;
  }

  /**
   * Get error recovery suggestions
   */
  getErrorSuggestions(error: APIError): string[] {
    return error.suggestions;
  }
}

// Create and export singleton instance
export const httpClient = new HTTPClient();
export default httpClient;