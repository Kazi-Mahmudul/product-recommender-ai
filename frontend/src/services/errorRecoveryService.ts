/**
 * Error Recovery Service
 * 
 * Provides intelligent error handling and recovery mechanisms for the chat system.
 * Includes graceful degradation, retry strategies, and contextual error messages.
 */

import { ConversationContext } from './intelligentContextManager';

export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  retryAction?: () => Promise<void>;
  fallbackAction?: () => Promise<any>;
  userMessage: string;
  suggestions: string[];
  recoveryType: 'retry' | 'fallback' | 'manual';
}

export interface ErrorContext {
  errorType: string;
  originalQuery: string;
  conversationContext?: ConversationContext;
  attemptCount: number;
  timestamp: Date;
}

export class ErrorRecoveryService {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Progressive delays in ms

  /**
   * Analyze error and determine recovery strategy
   */
  static analyzeError(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    const errorMessage = error.message.toLowerCase();
    
    // Network/Connection errors
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, context);
    }
    
    // AI Service errors
    if (this.isAIServiceError(error)) {
      return this.handleAIServiceError(error, context);
    }
    
    // Rate limiting errors
    if (this.isRateLimitError(error)) {
      return this.handleRateLimitError(error, context);
    }
    
    // Parsing/Format errors
    if (this.isParsingError(error)) {
      return this.handleParsingError(error, context);
    }
    
    // Context errors
    if (this.isContextError(error)) {
      return this.handleContextError(error, context);
    }
    
    // Unknown errors
    return this.handleUnknownError(error, context);
  }

  /**
   * Check if error is network-related
   */
  private static isNetworkError(error: Error): boolean {
    const networkIndicators = [
      'network error',
      'connection failed',
      'timeout',
      'fetch failed',
      'network request failed',
      'connection refused'
    ];
    
    return networkIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator)
    );
  }

  /**
   * Check if error is from AI service
   */
  private static isAIServiceError(error: Error): boolean {
    const aiServiceIndicators = [
      'ai service',
      'parse-query',
      'service unavailable',
      'internal server error',
      'bad gateway'
    ];
    
    return aiServiceIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator)
    );
  }

  /**
   * Check if error is rate limiting
   */
  private static isRateLimitError(error: Error): boolean {
    return error.message.toLowerCase().includes('rate limit') ||
           error.message.includes('429') ||
           error.message.toLowerCase().includes('too many requests');
  }

  /**
   * Check if error is parsing-related
   */
  private static isParsingError(error: Error): boolean {
    const parsingIndicators = [
      'json parse',
      'invalid response',
      'malformed',
      'unexpected token',
      'syntax error'
    ];
    
    return parsingIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator)
    );
  }

  /**
   * Check if error is context-related
   */
  private static isContextError(error: Error): boolean {
    const contextIndicators = [
      'context',
      'session',
      'invalid state'
    ];
    
    return contextIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator)
    );
  }

  /**
   * Handle network errors with retry strategy
   */
  private static handleNetworkError(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    const canRetry = context.attemptCount < this.MAX_RETRY_ATTEMPTS;
    
    if (canRetry) {
      return {
        canRecover: true,
        recoveryType: 'retry',
        userMessage: "Connection issue detected. Retrying...",
        suggestions: [
          "Check your internet connection",
          "Try again in a moment",
          "Switch to a different network if available"
        ],
        retryAction: async () => {
          const delay = this.RETRY_DELAYS[context.attemptCount] || 4000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      };
    }
    
    return {
      canRecover: false,
      recoveryType: 'manual',
      userMessage: "I'm having trouble connecting to our servers. Please check your internet connection and try again.",
      suggestions: [
        "Check your internet connection",
        "Try refreshing the page",
        "Contact support if the issue persists"
      ]
    };
  }

  /**
   * Handle AI service errors with fallback
   */
  private static handleAIServiceError(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    const canRetry = context.attemptCount < 2; // Fewer retries for service errors
    
    if (canRetry) {
      return {
        canRecover: true,
        recoveryType: 'retry',
        userMessage: "Our AI service is temporarily busy. Retrying with a simpler approach...",
        suggestions: [
          "Try rephrasing your question",
          "Ask about specific phone models",
          "Use simpler terms"
        ],
        retryAction: async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      };
    }
    
    // Fallback to basic processing
    return {
      canRecover: true,
      recoveryType: 'fallback',
      userMessage: "I'm using a simplified mode right now. I can still help with basic phone information and comparisons.",
      suggestions: [
        "Ask about specific phone models",
        "Request phone comparisons",
        "Get basic specifications"
      ],
      fallbackAction: async () => {
        return this.generateBasicResponse(context.originalQuery, context.conversationContext);
      }
    };
  }

  /**
   * Handle rate limiting errors
   */
  private static handleRateLimitError(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    return {
      canRecover: true,
      recoveryType: 'retry',
      userMessage: "I'm processing a lot of requests right now. Please wait a moment...",
      suggestions: [
        "Wait a few seconds and try again",
        "Try asking a different question",
        "Be more specific in your query"
      ],
      retryAction: async () => {
        // Wait longer for rate limit errors
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    };
  }

  /**
   * Handle parsing errors
   */
  private static handleParsingError(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    return {
      canRecover: true,
      recoveryType: 'fallback',
      userMessage: "I received an unexpected response format. Let me try a different approach.",
      suggestions: [
        "Try rephrasing your question",
        "Ask about specific phone features",
        "Use more common phone names"
      ],
      fallbackAction: async () => {
        return this.generateBasicResponse(context.originalQuery, context.conversationContext);
      }
    };
  }

  /**
   * Handle context errors
   */
  private static handleContextError(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    return {
      canRecover: true,
      recoveryType: 'fallback',
      userMessage: "I had trouble understanding the context. Let me start fresh with your question.",
      suggestions: [
        "Try asking your question again",
        "Be more specific about what you're looking for",
        "Mention specific phone names if relevant"
      ],
      fallbackAction: async () => {
        return this.generateBasicResponse(context.originalQuery);
      }
    };
  }

  /**
   * Handle unknown errors
   */
  private static handleUnknownError(error: Error, context: ErrorContext): ErrorRecoveryStrategy {
    return {
      canRecover: false,
      recoveryType: 'manual',
      userMessage: "Something unexpected happened. Please try asking your question again.",
      suggestions: [
        "Try rephrasing your question",
        "Ask about specific phone models",
        "Refresh the page if issues persist"
      ]
    };
  }

  /**
   * Generate a basic response when AI service is unavailable
   */
  private static async generateBasicResponse(
    query: string, 
    context?: ConversationContext
  ): Promise<any> {
    const queryLower = query.toLowerCase();
    
    // Basic recommendation response
    if (queryLower.includes('recommend') || queryLower.includes('best') || queryLower.includes('suggest')) {
      return {
        response_type: 'text',
        content: {
          text: `I'd be happy to help you find a great phone! While my advanced AI is temporarily unavailable, I can still provide basic recommendations.

Here are some popular categories to consider:
• **Budget phones (Under ৳20,000)**: Great value options
• **Mid-range phones (৳20,000-৳50,000)**: Balanced performance
• **Premium phones (৳50,000+)**: Top-tier features

Could you tell me more about:
• Your budget range?
• What you'll mainly use the phone for?
• Any specific features you need?`,
          suggestions: [
            "Best phones under 30k",
            "Gaming phones",
            "Camera phones",
            "Long battery life phones"
          ]
        },
        formatting_hints: {
          text_style: 'conversational',
          show_suggestions: true
        }
      };
    }
    
    // Basic comparison response
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      return {
        response_type: 'text',
        content: {
          text: `I can help you compare phones! While my advanced comparison features are temporarily unavailable, I can still provide basic comparisons.

To give you the best comparison, please tell me:
• Which specific phone models you want to compare
• What aspects are most important to you (camera, battery, performance, price)

For example: "Compare iPhone 14 vs Samsung Galaxy S23" or "iPhone vs Android phones under 40k"`,
          suggestions: [
            "iPhone vs Samsung",
            "Compare camera quality",
            "Compare battery life",
            "Budget phone comparison"
          ]
        },
        formatting_hints: {
          text_style: 'conversational',
          show_suggestions: true
        }
      };
    }
    
    // Basic Q&A response
    return {
      response_type: 'text',
      content: {
        text: `I'm here to help with your smartphone questions! While my advanced AI features are temporarily limited, I can still assist you with:

• Phone recommendations based on budget
• Basic phone comparisons
• General smartphone advice
• Popular phone models in Bangladesh

What would you like to know about smartphones?`,
        suggestions: [
          "Recommend phones under 30k",
          "Best camera phones",
          "Compare two phones",
          "Latest phone prices"
        ]
      },
      formatting_hints: {
        text_style: 'conversational',
        show_suggestions: true
      }
    };
  }

  /**
   * Create contextual error message based on conversation history
   */
  static generateContextualErrorMessage(
    error: string,
    context?: ConversationContext
  ): { message: string; suggestions: string[] } {
    const baseMessage = "I'm having trouble processing your request right now.";
    
    if (!context) {
      return {
        message: baseMessage,
        suggestions: [
          "Try rephrasing your question",
          "Ask about specific phone models",
          "Check your internet connection"
        ]
      };
    }

    // Generate contextual suggestions based on conversation history
    const suggestions: string[] = [];
    
    // Add suggestions based on recent topics
    if (context.recent_topics.length > 0) {
      const lastTopic = context.recent_topics[0];
      switch (lastTopic) {
        case 'camera':
          suggestions.push("Ask about camera quality", "Compare camera features");
          break;
        case 'battery':
          suggestions.push("Ask about battery life", "Find long-lasting phones");
          break;
        case 'performance':
          suggestions.push("Ask about phone performance", "Find gaming phones");
          break;
        case 'price':
          suggestions.push("Ask about phone prices", "Find budget phones");
          break;
        default:
          suggestions.push(`Continue asking about ${lastTopic}`);
      }
    }
    
    // Add suggestions based on mentioned phones
    if (context.mentioned_phones.length > 0) {
      const recentPhone = context.mentioned_phones[0];
      suggestions.push(`Ask about ${recentPhone.name}`, `Compare ${recentPhone.name} with others`);
    }
    
    // Default suggestions if no context
    if (suggestions.length === 0) {
      suggestions.push(
        "Try asking about specific phone models",
        "Request phone recommendations",
        "Ask for phone comparisons"
      );
    }

    return {
      message: `${baseMessage} Based on our conversation, you might want to try:`,
      suggestions: suggestions.slice(0, 3) // Limit to 3 suggestions
    };
  }

  /**
   * Log error for monitoring and improvement
   */
  static logError(error: Error, context: ErrorContext, recovery: ErrorRecoveryStrategy): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        type: context.errorType
      },
      context: {
        query: context.originalQuery,
        attemptCount: context.attemptCount,
        hasConversationContext: Boolean(context.conversationContext)
      },
      recovery: {
        type: recovery.recoveryType,
        canRecover: recovery.canRecover
      }
    };

    // In production, this would be sent to a logging service
    console.error('Chat Error:', errorLog);
    
    // Store in localStorage for debugging (limit to last 10 errors)
    try {
      const storedErrors = JSON.parse(localStorage.getItem('chat_errors') || '[]');
      storedErrors.unshift(errorLog);
      localStorage.setItem('chat_errors', JSON.stringify(storedErrors.slice(0, 10)));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Check system health and suggest actions
   */
  static async checkSystemHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check network connectivity
    if (!navigator.onLine) {
      issues.push("No internet connection");
      suggestions.push("Check your internet connection");
    }

    // Check localStorage availability
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      issues.push("Browser storage unavailable");
      suggestions.push("Try refreshing the page");
    }

    // Check if we have recent errors
    try {
      const recentErrors = JSON.parse(localStorage.getItem('chat_errors') || '[]');
      const recentErrorCount = recentErrors.filter((error: any) => 
        Date.now() - new Date(error.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
      ).length;

      if (recentErrorCount > 3) {
        issues.push("Multiple recent errors detected");
        suggestions.push("Try refreshing the page", "Clear browser cache");
      }
    } catch (e) {
      // Ignore errors checking error log
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      suggestions
    };
  }
}