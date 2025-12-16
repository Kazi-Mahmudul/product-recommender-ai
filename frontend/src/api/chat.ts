/**
 * Chat API Service - Handles communication with the RAG pipeline backend
 * 
 * This service provides methods for sending queries to the RAG pipeline
 * and handling responses with proper error handling and retry logic.
 */

import axios, { AxiosResponse, AxiosError } from 'axios';

// API Configuration
import { apiConfig } from '../services/apiConfig';

// API Configuration
const config = apiConfig.getConfig();
const CHAT_ENDPOINT = `${config.baseURL}/api/v1/chat`;
const RAG_ENDPOINT = `${config.baseURL}/api/v1/natural-language/rag-query`;

// Request/Response interfaces
export interface ChatQueryRequest {
  query: string;
  conversation_history?: Array<{
    type: 'user' | 'assistant';
    content: string;
  }>;
  session_id?: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  response_type: 'text' | 'recommendations' | 'comparison' | 'specs';
  content: {
    text?: string;
    phones?: Array<{
      id: number;
      name: string;
      brand: string;
      price: number;
      image: string;
      key_specs: Record<string, string>;
      scores: Record<string, number>;
      relevance_score?: number;
      match_reasons?: string[];
    }>;
    comparison_data?: {
      phones: Array<{
        id: number;
        name: string;
        brand: string;
        image: string;
        price: number;
      }>;
      features: Array<{
        key: string;
        label: string;
        values: any[];
        unit?: string;
      }>;
      summary: string;
    };
    specifications?: {
      basic_info: {
        id: number;
        name: string;
        brand: string;
        price: number;
        image: string;
      };
      specifications: {
        display: Record<string, any>;
        performance: Record<string, any>;
        camera: Record<string, any>;
        battery: Record<string, any>;
        connectivity: Record<string, any>;
        design: Record<string, any>;
        scores: Record<string, any>;
      };
    };
    filters_applied?: Record<string, any>;
    total_found?: number;
  };
  suggestions?: string[];
  metadata?: {
    confidence_score?: number;
    data_sources?: string[];
    processing_time?: number;
    phone_count?: number;
    error?: boolean;
    request_id?: string;
  };
  session_id?: string;

  processing_time?: number;
}

export interface ChatSession {
  id: string;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: any;
  created_at: string;
  metadata?: any;
}

export interface ChatHistoryList {
  sessions: ChatSession[];
  total_count: number;
}

export interface ChatError {
  message: string;
  code?: string;
  details?: any;
  retry_after?: number;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

// Timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds

class ChatAPIService {
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
  }

  /**
   * Send a chat query to the RAG pipeline
   */
  async sendChatQuery(request: ChatQueryRequest): Promise<ChatResponse> {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Sending chat query to RAG pipeline:', request.query);
    }

    try {
      const response = await this.executeWithRetry(async () => {
        return await axios.post<ChatResponse>(`${CHAT_ENDPOINT}/query`, request, {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
            ...(request.session_id ? { 'X-Session-Id': request.session_id } : {}),
            ...(axios.defaults.headers.common['Authorization'] ? { 'Authorization': axios.defaults.headers.common['Authorization'] } : {})
          },
        });
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ RAG pipeline response received:', response.data);
      }
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ RAG pipeline request failed:', error);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Send query to RAG-enhanced natural language endpoint (fallback)
   */
  async sendRAGQuery(request: ChatQueryRequest): Promise<ChatResponse> {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Sending query to RAG-enhanced endpoint:', request.query);
    }

    try {
      const response = await this.executeWithRetry(async () => {
        return await axios.post<ChatResponse>(RAG_ENDPOINT, request, {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ RAG-enhanced response received:', response.data);
      }
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ RAG-enhanced request failed:', error);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Test RAG integration functionality
   */
  async testRAGIntegration(query: string): Promise<{
    status: 'success' | 'error';
    query: string;
    response?: ChatResponse;
    error?: string;
    rag_integration: 'working' | 'failed';
  }> {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Testing RAG integration with query:', query);
    }

    try {
      const response = await axios.post(`${RAG_ENDPOINT.replace('/rag-query', '/rag-test')}`,
        { query },
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ RAG integration test completed:', response.data);
      }
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ RAG integration test failed:', error);
      }
      return {
        status: 'error',
        query,
        error: this.handleError(error).message,
        rag_integration: 'failed'
      };
    }
  }

  /**
   * Check health of chat services
   */
  async checkHealth(): Promise<{
    chat_service: 'healthy' | 'unhealthy';
    rag_pipeline: 'healthy' | 'unhealthy';
    timestamp: number;
  }> {
    try {
      const [chatHealth, ragHealth] = await Promise.allSettled([
        axios.get(`${CHAT_ENDPOINT}/health`, { timeout: 5000 }),
        axios.get(`${RAG_ENDPOINT.replace('/rag-query', '/health')}`, { timeout: 5000 })
      ]);

      return {
        chat_service: chatHealth.status === 'fulfilled' && chatHealth.value.status === 200
          ? 'healthy' : 'unhealthy',
        rag_pipeline: ragHealth.status === 'fulfilled' && ragHealth.value.status === 200
          ? 'healthy' : 'unhealthy',
        timestamp: Date.now()
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Health check failed:', error);
      }
      return {
        chat_service: 'unhealthy',
        rag_pipeline: 'unhealthy',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get chat history for authenticated user
   */
  async getChatHistory(token: string, limit: number = 50, offset: number = 0): Promise<ChatHistoryList> {
    try {
      const response = await axios.get<ChatHistoryList>(`${CHAT_ENDPOINT}/history`, {
        params: { limit, offset },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to fetch chat history:', error);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get specific chat session details
   */
  async getChatSession(token: string, sessionId: string): Promise<ChatSession> {
    try {
      const response = await axios.get<ChatSession>(`${CHAT_ENDPOINT}/history/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to fetch chat session:', error);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Delete a chat session
   */
  async deleteChatSession(token: string, sessionId: string): Promise<void> {
    try {
      await axios.delete(`${CHAT_ENDPOINT}/history/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to delete chat session:', error);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>,
    attempt: number = 1
  ): Promise<AxiosResponse<T>> {
    try {
      return await operation();
    } catch (error) {
      const axiosError = error as AxiosError;

      // Check if we should retry
      if (attempt < this.retryConfig.maxRetries && this.shouldRetry(axiosError)) {
        const delay = this.calculateDelay(attempt);

        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Retrying request (attempt ${attempt + 1}/${this.retryConfig.maxRetries}) after ${delay}ms`);
        }

        await this.sleep(delay);
        return this.executeWithRetry(operation, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on server errors (5xx)
    if (error.response.status >= 500) {
      return true;
    }

    // Retry on rate limiting (429)
    if (error.response.status === 429) {
      return true;
    }

    // Retry on timeout (408)
    if (error.response.status === 408) {
      return true;
    }

    // Don't retry on client errors (4xx except 429 and 408)
    return false;
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any): ChatError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error
      if (!axiosError.response) {
        return {
          message: 'Network error. Please check your internet connection and try again.',
          code: 'NETWORK_ERROR',
          details: axiosError.message
        };
      }

      // Server responded with error
      const response = axiosError.response;
      const data = response.data as any;

      // Rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers['retry-after']
          ? parseInt(response.headers['retry-after']) * 1000
          : 60000; // Default to 1 minute

        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMITED',
          retry_after: retryAfter,
          details: data
        };
      }

      // Server error
      if (response.status >= 500) {
        return {
          message: 'Server error. Please try again in a moment.',
          code: 'SERVER_ERROR',
          details: data
        };
      }

      // Client error
      if (response.status >= 400) {
        return {
          message: data?.error || data?.message || 'Invalid request. Please check your input and try again.',
          code: 'CLIENT_ERROR',
          details: data
        };
      }

      // Other HTTP errors
      return {
        message: `HTTP error ${response.status}: ${response.statusText}`,
        code: 'HTTP_ERROR',
        details: data
      };
    }

    // Timeout error
    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT_ERROR',
        details: error.message
      };
    }

    // Generic error
    return {
      message: error.message || 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
      details: error
    };
  }

  /**
   * Create a fallback response for when all services fail
   */
  createFallbackResponse(query: string, errorMessage: string): ChatResponse {
    return {
      response_type: 'text',
      content: {
        text: `I'm having trouble processing your request right now. ${errorMessage}. Please try rephrasing your question or try again in a moment.`
      },
      suggestions: [
        'Try asking about a specific phone model',
        'Ask for phone recommendations with your budget',
        'Compare two phones directly',
        'Check phone specifications'
      ],
      metadata: {
        error: true,
        confidence_score: 0,
        data_sources: [],
        processing_time: 0
      }
    };
  }

  /**
   * Validate chat query request
   */
  validateRequest(request: ChatQueryRequest): { valid: boolean; error?: string } {
    if (!request.query || typeof request.query !== 'string') {
      return { valid: false, error: 'Query is required and must be a string' };
    }

    if (request.query.trim().length === 0) {
      return { valid: false, error: 'Query cannot be empty' };
    }

    if (request.query.length > 2000) {
      return { valid: false, error: 'Query is too long (maximum 2000 characters)' };
    }

    if (request.conversation_history && !Array.isArray(request.conversation_history)) {
      return { valid: false, error: 'Conversation history must be an array' };
    }

    return { valid: true };
  }
}

// Create and export singleton instance
export const chatAPIService = new ChatAPIService();