/**
 * Smart Chat Service
 * Orchestrates the complete chat experience using direct Gemini integration
 */

import { directGeminiService, FormattedResponse } from './directGeminiService';

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'assistant';
  response?: FormattedResponse;
  loading?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  lastQuery: string;
  context: any[];
}

class SmartChatService {
  private chatState: ChatState = {
    messages: [],
    isLoading: false,
    lastQuery: '',
    context: []
  };

  private listeners: ((state: ChatState) => void)[] = [];

  /**
   * Send a query and get intelligent response
   */
  async sendQuery(query: string): Promise<FormattedResponse> {
    try {
      this.updateLoadingState(true);
      this.chatState.lastQuery = query;

      console.log(`🚀 Smart Chat: Processing query "${query}"`);

      // Add user message
      const userMessage: ChatMessage = {
        id: this.generateId(),
        text: query,
        timestamp: new Date(),
        sender: 'user'
      };
      this.addMessage(userMessage);

      // Add loading assistant message
      const loadingMessage: ChatMessage = {
        id: this.generateId(),
        text: 'Thinking...',
        timestamp: new Date(),
        sender: 'assistant',
        loading: true
      };
      this.addMessage(loadingMessage);

      // Get response from Gemini
      const response = await directGeminiService.sendQuery(query);
      console.log(`✅ Smart Chat: Received response`, response);

      // Handle phone recommendations
      if (response.response_type === 'recommendations' && response.metadata?.requires_phone_data) {
        const filters = response.metadata.gemini_filters;
        if (filters) {
          try {
            const phones = await directGeminiService.fetchPhoneRecommendations(filters);
            response.content.phones = phones;
            response.metadata.phone_count = phones.length;
          } catch (error) {
            console.warn('Failed to fetch phone data:', error);
          }
        }
      }

      // Update the loading message with the actual response
      this.updateMessage(loadingMessage.id, {
        text: this.extractDisplayText(response),
        loading: false,
        response: response
      });

      // Update context for future queries
      this.updateContext(query, response);
      
      this.updateLoadingState(false);
      return response;

    } catch (error) {
      console.error('❌ Smart Chat Error:', error);
      this.updateLoadingState(false);
      
      const errorResponse: FormattedResponse = {
        response_type: 'text',
        content: {
          text: 'Sorry, I encountered an error while processing your request. Please try again.',
          suggestions: ['Try rephrasing your question', 'Ask about phone recommendations']
        },
        formatting_hints: {
          text_style: 'error',
          show_suggestions: true
        }
      };

      // Update loading message with error
      const loadingMessage = this.chatState.messages.find(m => m.loading);
      if (loadingMessage) {
        this.updateMessage(loadingMessage.id, {
          text: errorResponse.content.text || 'Error occurred',
          loading: false,
          response: errorResponse
        });
      }

      return errorResponse;
    }
  }

  /**
   * Extract display text from response
   */
  private extractDisplayText(response: FormattedResponse): string {
    if (response.content.text) {
      return response.content.text;
    }
    
    if (response.response_type === 'recommendations') {
      const phoneCount = response.content.phones?.length || 0;
      return phoneCount > 0 
        ? `I found ${phoneCount} great phone recommendations for you!`
        : 'Here are some phone recommendations based on your requirements:';
    }
    
    if (response.response_type === 'comparison') {
      return 'Here\'s a detailed comparison of the phones you requested:';
    }
    
    return 'I\'m here to help with your smartphone questions!';
  }

  /**
   * Add message to chat
   */
  private addMessage(message: ChatMessage): void {
    this.chatState.messages.push(message);
    this.notifyListeners();
  }

  /**
   * Update existing message
   */
  private updateMessage(id: string, updates: Partial<ChatMessage>): void {
    const messageIndex = this.chatState.messages.findIndex(m => m.id === id);
    if (messageIndex !== -1) {
      this.chatState.messages[messageIndex] = {
        ...this.chatState.messages[messageIndex],
        ...updates
      };
      this.notifyListeners();
    }
  }

  /**
   * Update loading state
   */
  private updateLoadingState(isLoading: boolean): void {
    this.chatState.isLoading = isLoading;
    this.notifyListeners();
  }

  /**
   * Update context for future queries
   */
  private updateContext(query: string, response: FormattedResponse): void {
    this.chatState.context.push({
      query,
      response_type: response.response_type,
      timestamp: new Date()
    });

    // Keep only last 5 context items
    if (this.chatState.context.length > 5) {
      this.chatState.context = this.chatState.context.slice(-5);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current chat state
   */
  getChatState(): ChatState {
    return { ...this.chatState };
  }

  /**
   * Subscribe to chat state changes
   */
  subscribe(listener: (state: ChatState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.chatState));
  }

  /**
   * Clear chat history
   */
  clearChat(): void {
    this.chatState = {
      messages: [],
      isLoading: false,
      lastQuery: '',
      context: []
    };
    this.notifyListeners();
  }

  /**
   * Get suggestions based on context
   */
  getContextualSuggestions(): string[] {
    const recentTypes = this.chatState.context.slice(-3).map(c => c.response_type);
    
    if (recentTypes.includes('recommendations')) {
      return [
        'Compare these phones',
        'Show me alternatives',
        'What about camera quality?',
        'Battery life comparison'
      ];
    }
    
    if (recentTypes.includes('comparison')) {
      return [
        'Show me more options',
        'What about cheaper alternatives?',
        'Best value for money',
        'Latest models'
      ];
    }
    
    return [
      'Recommend phones under 30k',
      'Best camera phones',
      'Compare iPhone vs Samsung',
      'Gaming phones'
    ];
  }
}

// Create and export singleton instance
export const smartChatService = new SmartChatService();
export default smartChatService;