/**
 * Enhanced Contextual Query API Service
 * Handles contextual queries with session management and error handling
 */

import { Phone } from './phones';

// Types for contextual query system
export interface ContextualQueryRequest {
  query: string;
  session_id?: string;
  user_id?: string;
  context_metadata?: {
    previous_phones?: string[];
    user_preferences?: UserPreferences;
    conversation_history?: ConversationTurn[];
  };
}

export interface ContextualQueryResponse {
  intent: {
    type: 'comparison' | 'alternative' | 'specification' | 'contextual_recommendation' | 'recommendation' | 'qa';
    confidence: number;
    sub_intent?: string;
  };
  phones: Phone[];
  metadata: {
    session_id: string;
    query_id: string;
    processing_time: number;
    contextual_terms: string[];
    comparison_criteria: string[];
    filters: Record<string, any>;
    suggestions: string[];
    context_used: boolean;
    fallback_used?: boolean;
    error_handled?: boolean;
  };
  response_data?: {
    chart_data?: any;
    comparison_table?: any;
    contextual_explanation?: string;
  };
  error?: {
    type: string;
    message: string;
    suggestions: string[];
  };
}

export interface UserPreferences {
  price_range?: [number, number];
  preferred_brands?: string[];
  important_features?: string[];
  budget_category?: 'budget' | 'mid-range' | 'premium';
  primary_use_case?: 'general' | 'gaming' | 'photography' | 'business';
}

export interface ConversationTurn {
  query: string;
  response_type: string;
  phones_mentioned: string[];
  timestamp: string;
}

export interface PhoneResolutionRequest {
  phone_references: string[];
  available_phones?: Phone[];
  context_session_id?: string;
}

export interface PhoneResolutionResponse {
  resolved_phones: Array<{
    original_text: string;
    resolved_phone: Phone | null;
    confidence: number;
    match_type: 'exact' | 'partial' | 'fuzzy' | 'contextual';
  }>;
  unresolved_references: string[];
  suggestions: string[];
}

export interface IntentParseRequest {
  query: string;
  context_phones?: Phone[];
  session_id?: string;
}

export interface IntentParseResponse {
  intent_type: string;
  confidence: number;
  reasoning: string;
  sub_intent?: string;
  extracted_entities: {
    phone_references: string[];
    comparison_criteria: string[];
    price_range?: { min?: number; max?: number };
    specific_features: string[];
  };
}

export interface ContextRetrievalResponse {
  session_id: string;
  context_phones: Phone[];
  conversation_history: ConversationTurn[];
  user_preferences: UserPreferences;
  context_metadata: {
    session_age: number;
    total_queries: number;
    last_activity: string;
    context_strength: number;
  };
}

class ContextualAPIService {
  private baseURL: string;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor() {
    // Ensure we always use HTTPS in production
    let baseURL = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
    if (baseURL.startsWith('http://')) {
      baseURL = baseURL.replace('http://', 'https://');
    }
    this.baseURL = baseURL;
    this.initializeSession();
  }

  /**
   * Initialize or restore session
   */
  private initializeSession(): void {
    // Try to restore session from localStorage
    const storedSession = localStorage.getItem('contextual_session_id');
    const storedUser = localStorage.getItem('user_id');
    
    if (storedSession) {
      this.sessionId = storedSession;
    } else {
      this.sessionId = this.generateSessionId();
      localStorage.setItem('contextual_session_id', this.sessionId);
    }

    if (storedUser) {
      this.userId = storedUser;
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId || this.generateSessionId();
  }

  /**
   * Set user ID for personalization
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    localStorage.setItem('user_id', userId);
  }

  /**
   * Clear session and start fresh
   */
  public clearSession(): void {
    this.sessionId = this.generateSessionId();
    localStorage.setItem('contextual_session_id', this.sessionId);
    localStorage.removeItem('contextual_context_cache');
  }

  /**
   * Make authenticated request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Add authentication headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': this.getSessionId(),
      ...(this.userId && { 'X-User-ID': this.userId }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry
          if (retryCount < this.retryAttempts) {
            await this.delay(this.retryDelay * Math.pow(2, retryCount));
            return this.makeRequest<T>(endpoint, options, retryCount + 1);
          }
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        if (response.status === 401) {
          // Session expired - create new session and retry
          this.clearSession();
          if (retryCount < this.retryAttempts) {
            return this.makeRequest<T>(endpoint, options, retryCount + 1);
          }
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.retryAttempts && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest<T>(endpoint, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    return (
      error.name === 'TypeError' || // Network errors
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout')
    );
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process contextual query with enhanced error handling
   */
  public async processContextualQuery(
    request: ContextualQueryRequest
  ): Promise<ContextualQueryResponse> {
    // Add session ID if not provided
    if (!request.session_id) {
      request.session_id = this.getSessionId();
    }

    // Add user ID if available
    if (this.userId && !request.user_id) {
      request.user_id = this.userId;
    }

    // Deduplicate requests
    const requestKey = `contextual_${JSON.stringify(request)}`;
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey);
    }

    const requestPromise = this.makeRequest<ContextualQueryResponse>(
      '/api/v1/contextual-query',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    this.requestQueue.set(requestKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Update session ID if changed
      if (response.metadata.session_id !== this.sessionId) {
        this.sessionId = response.metadata.session_id;
        localStorage.setItem('contextual_session_id', this.sessionId);
      }

      return response;
    } finally {
      this.requestQueue.delete(requestKey);
    }
  }

  /**
   * Resolve phone references
   */
  public async resolvePhoneReferences(
    request: PhoneResolutionRequest
  ): Promise<PhoneResolutionResponse> {
    return this.makeRequest<PhoneResolutionResponse>(
      '/api/v1/resolve-phones',
      {
        method: 'POST',
        body: JSON.stringify({
          ...request,
          session_id: request.context_session_id || this.getSessionId(),
        }),
      }
    );
  }

  /**
   * Parse query intent
   */
  public async parseIntent(
    request: IntentParseRequest
  ): Promise<IntentParseResponse> {
    return this.makeRequest<IntentParseResponse>(
      '/api/v1/parse-intent',
      {
        method: 'POST',
        body: JSON.stringify({
          ...request,
          session_id: request.session_id || this.getSessionId(),
        }),
      }
    );
  }

  /**
   * Retrieve conversation context
   */
  public async getContext(sessionId?: string): Promise<ContextRetrievalResponse> {
    const targetSessionId = sessionId || this.getSessionId();
    return this.makeRequest<ContextRetrievalResponse>(
      `/api/v1/context/${targetSessionId}`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Update user preferences
   */
  public async updateUserPreferences(
    preferences: Partial<UserPreferences>
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(
      '/api/v1/user-preferences',
      {
        method: 'POST',
        body: JSON.stringify({
          session_id: this.getSessionId(),
          user_id: this.userId,
          preferences,
        }),
      }
    );
  }

  /**
   * Get contextual suggestions based on conversation history
   */
  public async getContextualSuggestions(): Promise<{
    suggestions: string[];
    context_strength: number;
    based_on: string[];
  }> {
    return this.makeRequest<{
      suggestions: string[];
      context_strength: number;
      based_on: string[];
    }>(`/api/v1/contextual-suggestions/${this.getSessionId()}`, {
      method: 'GET',
    });
  }

  /**
   * Enhanced query with automatic context integration
   */
  public async enhancedQuery(
    query: string,
    options: {
      includeContext?: boolean;
      userPreferences?: Partial<UserPreferences>;
      maxPhones?: number;
    } = {}
  ): Promise<ContextualQueryResponse> {
    const { includeContext = true, userPreferences } = options;

    let contextMetadata: ContextualQueryRequest['context_metadata'] = {};

    // Get conversation context if requested
    if (includeContext) {
      try {
        const context = await this.getContext();
        contextMetadata = {
          previous_phones: context.context_phones.map(p => p.name),
          user_preferences: { ...context.user_preferences, ...userPreferences },
          conversation_history: context.conversation_history.slice(-5), // Last 5 turns
        };
      } catch (error) {
        console.warn('Failed to retrieve context, proceeding without:', error);
      }
    }

    return this.processContextualQuery({
      query,
      session_id: this.getSessionId(),
      user_id: this.userId || undefined,
      context_metadata: contextMetadata,
    });
  }

  /**
   * Batch process multiple queries
   */
  public async batchProcessQueries(
    queries: string[]
  ): Promise<ContextualQueryResponse[]> {
    const promises = queries.map(query => 
      this.enhancedQuery(query, { includeContext: false })
    );

    return Promise.all(promises);
  }

  /**
   * Get analytics for current session
   */
  public async getSessionAnalytics(): Promise<{
    session_id: string;
    total_queries: number;
    query_types: Record<string, number>;
    phones_discussed: string[];
    user_preferences: UserPreferences;
    session_duration: number;
    context_strength: number;
  }> {
    return this.makeRequest<{
      session_id: string;
      total_queries: number;
      query_types: Record<string, number>;
      phones_discussed: string[];
      user_preferences: UserPreferences;
      session_duration: number;
      context_strength: number;
    }>(`/api/v1/session-analytics/${this.getSessionId()}`, {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const contextualAPI = new ContextualAPIService();

// Export types (removed duplicate exports to fix conflicts)

export default contextualAPI;