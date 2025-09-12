/**
 * API Configuration Service
 * Centralized configuration for all API endpoints and HTTP methods
 */

export interface APIEndpoints {
  chat: {
    query: string;
  };
  phones: {
    list: string;
    search: string;
  };
  naturalLanguage: {
    ragQuery: string;
  };
}

export interface APIConfig {
  baseURL: string;
  geminiServiceURL: string;
  endpoints: APIEndpoints;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

class APIConfigService {
  private config: APIConfig;

  constructor() {
    this.config = this.initializeConfig();
  }

  private initializeConfig(): APIConfig {
    // Get base URLs from environment variables
    const baseURL = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
    const geminiServiceURL = process.env.REACT_APP_GEMINI_API || 'http://localhost:8001';

    return {
      baseURL,
      geminiServiceURL,
      endpoints: {
        chat: {
          query: '/api/v1/chat/query', 
        },
        phones: {
          list: '/api/v1/phones/',
          search: '/api/v1/phones/search',
        },
        naturalLanguage: {
          ragQuery: '/api/v1/natural-language/rag-query',
        },
      },
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
    };
  }

  /**
   * Get the complete URL for a specific endpoint
   */
  getEndpointURL(service: 'main' | 'gemini', path: string): string {
    const baseURL = service === 'gemini' ? this.config.geminiServiceURL : this.config.baseURL;
    return `${baseURL}${path}`;
  }

  /**
   * Get chat query endpoint URL
   */
  getChatQueryURL(): string {
    return this.getEndpointURL('main', this.config.endpoints.chat.query);
  }

  /**
   * Get phones list endpoint URL
   */
  getPhonesListURL(): string {
    return this.getEndpointURL('main', this.config.endpoints.phones.list);
  }

  /**
   * Get phones search endpoint URL
   */
  getPhonesSearchURL(): string {
    return this.getEndpointURL('main', this.config.endpoints.phones.search);
  }

  /**
   * Get natural language RAG query endpoint URL
   */
  getNaturalLanguageRagURL(): string {
    return this.getEndpointURL('main', this.config.endpoints.naturalLanguage.ragQuery);
  }

  /**
   * Get Gemini service parse query endpoint URL
   */
  getGeminiParseQueryURL(): string {
    return this.getEndpointURL('gemini', '/parse-query');
  }

  /**
   * Get request timeout
   */
  getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): { attempts: number; delay: number } {
    return {
      attempts: this.config.retryAttempts,
      delay: this.config.retryDelay,
    };
  }

  /**
   * Get all configuration
   */
  getConfig(): APIConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (useful for testing or dynamic config changes)
   */
  updateConfig(updates: Partial<APIConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Validate environment configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.baseURL) {
      errors.push('REACT_APP_API_BASE environment variable is not set');
    }

    if (!this.config.geminiServiceURL) {
      errors.push('REACT_APP_GEMINI_API environment variable is not set');
    }

    // Validate URLs are properly formatted
    try {
      new URL(this.config.baseURL);
    } catch {
      errors.push('REACT_APP_API_BASE is not a valid URL');
    }

    try {
      new URL(this.config.geminiServiceURL);
    } catch {
      errors.push('REACT_APP_GEMINI_API is not a valid URL');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Create and export singleton instance
export const apiConfig = new APIConfigService();
export default apiConfig;