// Comprehensive error handling and fallback system

import { ChatContext, ChatContextManager } from './chatContextManager';
import { AIResponseEnhancer } from './aiResponseEnhancer';

export interface ErrorInfo {
  type: 'network' | 'api' | 'suggestion' | 'drill_down' | 'comparison' | 'context' | 'unknown';
  message: string;
  originalError?: Error;
  context?: any;
  timestamp: Date;
  recoverable: boolean;
  fallbackAction?: () => void;
}

export interface ErrorRecoveryOptions {
  showFallbackContent?: boolean;
  retryAction?: () => Promise<void>;
  fallbackMessage?: string;
  suggestions?: string[];
}

export class ErrorHandler {
  private static errorLog: ErrorInfo[] = [];
  private static readonly MAX_ERROR_LOG_SIZE = 50;

  /**
   * Handle and classify errors with appropriate fallback strategies
   */
  static handleError(
    error: Error | string,
    context: ChatContext,
    errorType?: ErrorInfo['type']
  ): ErrorRecoveryOptions {
    const errorInfo = this.classifyError(error, errorType);
    this.logError(errorInfo);

    // Generate contextual error response
    const enhancedResponse = AIResponseEnhancer.generateContextualErrorMessage(
      errorInfo.message,
      context
    );

    // Fallback if enhancedResponse is undefined
    const fallbackMessage = enhancedResponse?.message || 'An error occurred';
    const fallbackSuggestions = enhancedResponse?.suggestions || [];

    return {
      showFallbackContent: true,
      fallbackMessage,
      suggestions: fallbackSuggestions,
      retryAction: this.getRetryAction(errorInfo)
    };
  }

  /**
   * Handle suggestion generation failures
   */
  static handleSuggestionError(
    error: Error,
    phones: any[],
    context: ChatContext
  ): string[] {
    this.logError({
      type: 'suggestion',
      message: `Suggestion generation failed: ${error.message}`,
      originalError: error,
      context: { phoneCount: phones.length, queryCount: context.queryCount || 0 },
      timestamp: new Date(),
      recoverable: true
    });

    // Fallback to basic suggestions
    return this.getFallbackSuggestions(phones, context);
  }

  /**
   * Handle drill-down command recognition errors
   */
  static handleDrillDownError(
    error: Error,
    command: string,
    context: ChatContext
  ): { message: string; alternatives: string[] } {
    this.logError({
      type: 'drill_down',
      message: `Drill-down command failed: ${command}`,
      originalError: error,
      context: { command, queryCount: context.queryCount || 0 },
      timestamp: new Date(),
      recoverable: true
    });

    return {
      message: "I couldn't process that command, but here are some alternatives:",
      alternatives: [
        "Try asking 'show me detailed specs'",
        "Ask 'compare these phones in a chart'",
        "Request 'tell me more about the camera features'"
      ]
    };
  }

  /**
   * Handle comparison chart rendering issues
   */
  static handleComparisonError(
    error: Error,
    phones: any[],
    features: any[]
  ): { fallbackContent: any; message: string } {
    this.logError({
      type: 'comparison',
      message: `Comparison rendering failed: ${error.message}`,
      originalError: error,
      context: { phoneCount: phones.length, featureCount: features.length },
      timestamp: new Date(),
      recoverable: true
    });

    // Generate fallback table view
    const fallbackContent = this.generateFallbackComparison(phones, features);

    return {
      fallbackContent,
      message: "Chart view isn't available right now, but here's a detailed comparison table:"
    };
  }

  /**
   * Handle context recovery from local storage errors
   */
  static handleContextError(error: Error): ChatContext {
    this.logError({
      type: 'context',
      message: `Context recovery failed: ${error.message}`,
      originalError: error,
      timestamp: new Date(),
      recoverable: true
    });

    // Return fresh context as fallback
    return ChatContextManager.initializeContext();
  }

  /**
   * Handle network/API errors with retry logic
   */
  static handleNetworkError(
    error: Error,
    retryCount: number = 0
  ): ErrorRecoveryOptions {
    const maxRetries = 3;
    const isRetryable = retryCount < maxRetries && this.isRetryableError(error);

    this.logError({
      type: 'network',
      message: `Network error (attempt ${retryCount + 1}): ${error.message}`,
      originalError: error,
      context: { retryCount, maxRetries },
      timestamp: new Date(),
      recoverable: isRetryable
    });

    if (isRetryable) {
      return {
        showFallbackContent: false,
        fallbackMessage: `Connection issue detected. Retrying... (${retryCount + 1}/${maxRetries})`,
        retryAction: async () => {
          await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      };
    }

    return {
      showFallbackContent: true,
      fallbackMessage: "I'm having trouble connecting right now. Please check your internet connection and try again.",
      suggestions: [
        "Check your internet connection",
        "Try refreshing the page",
        "Ask a simpler question to test connectivity"
      ]
    };
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: ErrorInfo[];
    recoverableErrors: number;
  } {
    const errorsByType: Record<string, number> = {};
    let recoverableErrors = 0;

    this.errorLog.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      if (error.recoverable) recoverableErrors++;
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors: this.errorLog.slice(-10),
      recoverableErrors
    };
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Classify error type and generate error info
   */
  private static classifyError(
    error: Error | string,
    explicitType?: ErrorInfo['type']
  ): ErrorInfo {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    let type: ErrorInfo['type'] = explicitType || 'unknown';
    let recoverable = true;

    if (!explicitType) {
      if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout')) {
        type = 'network';
      } else if (lowerMessage.includes('api') || lowerMessage.includes('server') || lowerMessage.includes('500')) {
        type = 'api';
      } else if (lowerMessage.includes('suggestion') || lowerMessage.includes('recommend')) {
        type = 'suggestion';
      } else if (lowerMessage.includes('comparison') || lowerMessage.includes('chart')) {
        type = 'comparison';
      } else if (lowerMessage.includes('context') || lowerMessage.includes('storage')) {
        type = 'context';
      } else if (lowerMessage.includes('drill') || lowerMessage.includes('command')) {
        type = 'drill_down';
      }
    }

    // Determine if error is recoverable
    if (lowerMessage.includes('fatal') || lowerMessage.includes('critical')) {
      recoverable = false;
    }

    return {
      type,
      message,
      originalError: typeof error === 'object' ? error : undefined,
      timestamp: new Date(),
      recoverable
    };
  }

  /**
   * Log error with size management
   */
  private static logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);
    
    // Keep log size manageable
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERROR_LOG_SIZE);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorHandler] ${errorInfo.type}:`, errorInfo);
    }
  }

  /**
   * Get retry action based on error type
   */
  private static getRetryAction(errorInfo: ErrorInfo): (() => Promise<void>) | undefined {
    if (!errorInfo.recoverable) return undefined;

    switch (errorInfo.type) {
      case 'network':
      case 'api':
        return async () => {
          await this.delay(2000); // Wait 2 seconds before retry
        };
      case 'context':
        return async () => {
          // Try to recover context from backup
          try {
            ChatContextManager.loadContext();
          } catch {
            ChatContextManager.initializeContext();
          }
        };
      default:
        return async () => {
          await this.delay(1000); // Generic retry delay
        };
    }
  }

  /**
   * Generate fallback suggestions when suggestion generation fails
   */
  private static getFallbackSuggestions(phones: any[], context: ChatContext): string[] {
    const fallbackSuggestions = [
      "Show me more details about these phones",
      "Compare these phones side by side"
    ];

    // Add context-based fallbacks if available (prioritize these)
    if (context?.userPreferences?.preferredBrands?.length) {
      fallbackSuggestions.push(`Show more ${context.userPreferences.preferredBrands[0]} phones`);
    } else {
      fallbackSuggestions.push("Find similar phones in this price range");
    }

    if (phones.length > 0) {
      const avgPrice = phones.reduce((sum: number, p: any) => sum + (p.price_original || 0), 0) / phones.length;
      if (avgPrice > 0) {
        fallbackSuggestions.push(`Find phones under ৳${Math.round(avgPrice * 1.2).toLocaleString()}`);
      }
    }

    return fallbackSuggestions.slice(0, 3);
  }

  /**
   * Generate fallback comparison table
   */
  private static generateFallbackComparison(phones: any[], features: any[]): any {
    return {
      type: 'table',
      phones: phones.map(phone => ({
        name: phone.name || 'Unknown Phone',
        brand: phone.brand || 'Unknown Brand',
        price: phone.price || 'N/A'
      })),
      features: features.map(feature => ({
        label: feature.label || 'Unknown Feature',
        values: feature.raw || []
      }))
    };
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'timeout',
      'network',
      'fetch',
      'connection',
      'temporary',
      '502',
      '503',
      '504'
    ];

    const message = error.message.toLowerCase();
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}