/**
 * Enhanced hook for contextual query processing with session management
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { contextualAPI, ContextualQueryResponse, UserPreferences } from '../api/contextual';
import { Phone } from '../api/phones';

export interface ContextualQueryState {
  isLoading: boolean;
  error: string | null;
  response: ContextualQueryResponse | null;
  sessionId: string;
  contextStrength: number;
  hasActiveContext: boolean;
}

export interface ContextualQueryOptions {
  includeContext?: boolean;
  userPreferences?: Partial<UserPreferences>;
  autoRetry?: boolean;
  maxRetries?: number;
  onContextUpdate?: (contextInfo: any) => void;
  onError?: (error: string, suggestions?: string[]) => void;
}

export interface ContextualQueryHook {
  state: ContextualQueryState;
  query: (query: string, options?: ContextualQueryOptions) => Promise<ContextualQueryResponse | null>;
  clearContext: () => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  getContextualSuggestions: () => Promise<string[]>;
  retryLastQuery: () => Promise<ContextualQueryResponse | null>;
  getSessionAnalytics: () => Promise<any>;
}

export const useContextualQuery = (): ContextualQueryHook => {
  const [state, setState] = useState<ContextualQueryState>({
    isLoading: false,
    error: null,
    response: null,
    sessionId: contextualAPI.getSessionId(),
    contextStrength: 0,
    hasActiveContext: false,
  });

  const lastQueryRef = useRef<{ query: string; options?: ContextualQueryOptions } | null>(null);
  const retryCountRef = useRef<number>(0);

  // Initialize session and check for existing context
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const context = await contextualAPI.getContext();
        setState(prev => ({
          ...prev,
          sessionId: context.session_id,
          contextStrength: context.context_metadata.context_strength,
          hasActiveContext: context.context_phones.length > 0 || context.conversation_history.length > 0,
        }));
      } catch (error) {
        // Context doesn't exist yet, which is fine for new sessions
        console.debug('No existing context found, starting fresh session');
      }
    };

    initializeSession();
  }, []);

  const query = useCallback(async (
    queryText: string,
    options: ContextualQueryOptions = {}
  ): Promise<ContextualQueryResponse | null> => {
    const {
      includeContext = true,
      userPreferences,
      autoRetry = true,
      maxRetries = 3,
      onContextUpdate,
      onError
    } = options;

    // Store query for potential retry
    lastQueryRef.current = { query: queryText, options };
    retryCountRef.current = 0;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await contextualAPI.enhancedQuery(queryText, {
        includeContext,
        userPreferences,
      });

      // Update state with response
      setState(prev => ({
        ...prev,
        isLoading: false,
        response,
        sessionId: response.metadata.session_id,
        contextStrength: response.metadata.context_used ? 0.8 : 0.2, // Estimate based on context usage
        hasActiveContext: response.metadata.context_used || response.phones.length > 0,
      }));

      // Notify about context updates
      if (onContextUpdate && response.metadata.context_used) {
        onContextUpdate({
          sessionId: response.metadata.session_id,
          contextTerms: response.metadata.contextual_terms,
          phonesDiscussed: response.phones.map(p => p.name),
          queryCount: (prev: number) => prev + 1,
        });
      }

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      // Handle specific error types
      if (errorMessage.includes('Rate limit')) {
        if (onError) {
          onError(errorMessage, ['Please wait a moment before trying again', 'Consider upgrading your plan']);
        }
      } else if (errorMessage.includes('Session expired')) {
        // Auto-retry with new session
        if (autoRetry && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          contextualAPI.clearSession();
          setState(prev => ({ ...prev, sessionId: contextualAPI.getSessionId() }));
          return query(queryText, options);
        }
      } else if (errorMessage.includes('Phone not found')) {
        if (onError) {
          onError(errorMessage, [
            'Check the spelling of phone names',
            'Try using full phone names',
            'Browse our phone catalog for available options'
          ]);
        }
      }

      if (onError && !autoRetry) {
        onError(errorMessage);
      }

      return null;
    }
  }, []);

  const clearContext = useCallback(() => {
    contextualAPI.clearSession();
    setState(prev => ({
      ...prev,
      sessionId: contextualAPI.getSessionId(),
      contextStrength: 0,
      hasActiveContext: false,
      response: null,
      error: null,
    }));
    lastQueryRef.current = null;
    retryCountRef.current = 0;
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    try {
      await contextualAPI.updateUserPreferences(preferences);
      // Update context strength as preferences help with context
      setState(prev => ({
        ...prev,
        contextStrength: Math.min(prev.contextStrength + 0.1, 1.0),
      }));
    } catch (error) {
      console.warn('Failed to update user preferences:', error);
    }
  }, []);

  const getContextualSuggestions = useCallback(async (): Promise<string[]> => {
    try {
      const suggestions = await contextualAPI.getContextualSuggestions();
      return suggestions.suggestions;
    } catch (error) {
      console.warn('Failed to get contextual suggestions:', error);
      return [];
    }
  }, []);

  const retryLastQuery = useCallback(async (): Promise<ContextualQueryResponse | null> => {
    if (!lastQueryRef.current) {
      return null;
    }

    const { query: queryText, options } = lastQueryRef.current;
    return query(queryText, options);
  }, [query]);

  const getSessionAnalytics = useCallback(async () => {
    try {
      return await contextualAPI.getSessionAnalytics();
    } catch (error) {
      console.warn('Failed to get session analytics:', error);
      return null;
    }
  }, []);

  return {
    state,
    query,
    clearContext,
    updatePreferences,
    getContextualSuggestions,
    retryLastQuery,
    getSessionAnalytics,
  };
};

// Additional utility hooks for specific use cases

export const useContextualSuggestions = (sessionId?: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await contextualAPI.getContextualSuggestions();
      setSuggestions(result.suggestions);
    } catch (error) {
      console.warn('Failed to load contextual suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions, sessionId]);

  return { suggestions, isLoading, refreshSuggestions };
};

export const useContextMetadata = () => {
  const [metadata, setMetadata] = useState<{
    sessionId: string;
    contextPhones: Phone[];
    conversationHistory: any[];
    contextStrength: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const refreshMetadata = useCallback(async () => {
    setIsLoading(true);
    try {
      const context = await contextualAPI.getContext();
      setMetadata({
        sessionId: context.session_id,
        contextPhones: context.context_phones,
        conversationHistory: context.conversation_history,
        contextStrength: context.context_metadata.context_strength,
      });
    } catch (error) {
      console.warn('Failed to load context metadata:', error);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMetadata();
  }, [refreshMetadata]);

  return { metadata, isLoading, refreshMetadata };
};

export const usePhoneResolution = () => {
  const [isResolving, setIsResolving] = useState(false);

  const resolvePhones = useCallback(async (phoneReferences: string[]) => {
    setIsResolving(true);
    try {
      const result = await contextualAPI.resolvePhoneReferences({
        phone_references: phoneReferences,
      });
      return result;
    } catch (error) {
      console.warn('Failed to resolve phone references:', error);
      return null;
    } finally {
      setIsResolving(false);
    }
  }, []);

  return { resolvePhones, isResolving };
};

export default useContextualQuery;