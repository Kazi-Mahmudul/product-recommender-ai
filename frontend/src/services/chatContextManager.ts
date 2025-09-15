/**
 * Chat Context Manager - Manages conversation history and context in frontend session storage.
 *
 * This service handles session-based conversation history without persisting data
 * in the backend or database, as per the RAG pipeline requirements.
 */

// Enhanced chat message interface for RAG pipeline
export interface RAGChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string | object;
  timestamp: Date;
  metadata?: {
    response_type?: string;
    phone_slugs?: string[];
    query_type?: string;
    processing_time?: number;
    session_id?: string;
    error?: boolean;
    confidence_score?: number;
    data_sources?: string[];
  };
}

// Phone recommendation context interface
export interface PhoneRecommendationContext {
  phones: any[];
  originalQuery: string;
  timestamp: number;
  metadata?: {
    priceRange?: {
      min: number;
      max: number;
    };
    brands?: string[];
    features?: string[];
  };
  phoneId?: string;
  phoneName?: string;
  brand?: string;
  relevanceScore?: number;
  mentionedFeatures?: string[];
  queryContext?: string;
}

// Chat context interface
export interface ChatContext {
  sessionId: string;
  messages: RAGChatMessage[];
  phoneRecommendations: PhoneRecommendationContext[];
  userPreferences: Record<string, any>;
  conversationSummary: string;
  queryCount?: number;
}

// Session metadata interface
export interface SessionMetadata {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  totalProcessingTime: number;
}
type ConversationSummary = ReturnType<
  ChatContextManager["getConversationSummary"]
>;
export class ChatContextManager {
  private readonly STORAGE_KEY = "peyechi_chat_session";
  private readonly METADATA_KEY = "peyechi_chat_metadata";
  private readonly MAX_MESSAGES = 100; // Limit to prevent storage overflow
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private currentSessionId: string;
  private sessionMetadata: SessionMetadata;

  constructor() {
    this.currentSessionId = this.initializeSession();
    // Load metadata after session ID is set
    this.sessionMetadata = this.loadSessionMetadata();
    // Save the metadata to ensure consistency
    this.saveSessionMetadata();
    this.cleanupExpiredSessions();
  }

  /**
   * Initialize or restore session
   */
  private initializeSession(): string {
    const existingMetadata = this.loadSessionMetadata();

    // Check if existing session is still valid
    if (existingMetadata && existingMetadata.sessionId && this.isSessionValid(existingMetadata)) {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `📱 Restored existing chat session: ${existingMetadata.sessionId}`
        );
      }
      return existingMetadata.sessionId;
    }

    // Create new session
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`🆕 Created new chat session: ${newSessionId}`);
    }

    // Clear any old data
    this.clearStorageData();

    return newSessionId;
  }

  /**
   * Load session metadata from storage
   */
  private loadSessionMetadata(): SessionMetadata {
    try {
      const stored = sessionStorage.getItem(this.METADATA_KEY);
      if (stored) {
        const metadata = JSON.parse(stored);
        return {
          ...metadata,
          startTime: new Date(metadata.startTime),
          lastActivity: new Date(metadata.lastActivity),
        };
      }
    } catch (error) {
      console.warn("Failed to load session metadata:", error);
    }

    // Create new metadata
    const now = new Date();
    return {
      sessionId: this.currentSessionId,
      startTime: now,
      lastActivity: now,
      messageCount: 0,
      totalProcessingTime: 0,
    };
  }

  /**
   * Save session metadata to storage
   */
  private saveSessionMetadata(): void {
    try {
      sessionStorage.setItem(
        this.METADATA_KEY,
        JSON.stringify(this.sessionMetadata)
      );
    } catch (error) {
      console.error("Failed to save session metadata:", error);
    }
  }

  /**
   * Check if session is still valid
   */
  private isSessionValid(metadata: SessionMetadata): boolean {
    const now = Date.now();
    const lastActivity = new Date(metadata.lastActivity).getTime();
    return now - lastActivity < this.SESSION_TIMEOUT;
  }

  /**
   * Clean up expired sessions and old data
   */
  private cleanupExpiredSessions(): void {
    try {
      // Clean up any old storage keys that might exist
      const keysToRemove: string[] = [];

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          key.startsWith("peyechi_chat_") &&
          key !== this.STORAGE_KEY &&
          key !== this.METADATA_KEY
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => sessionStorage.removeItem(key));

      if (keysToRemove.length > 0) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `🧹 Cleaned up ${keysToRemove.length} old chat storage keys`
          );
        }
      }
    } catch (error) {
      console.warn("Failed to cleanup expired sessions:", error);
    }
  }

  /**
   * Clear all storage data
   */
  private clearStorageData(): void {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.METADATA_KEY);
    } catch (error) {
      console.error("Failed to clear storage data:", error);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.currentSessionId;
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(): SessionMetadata {
    return { ...this.sessionMetadata };
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(message: RAGChatMessage): void {
    try {
      const messages = this.getConversationHistory();

      // Ensure message has session ID
      const messageWithSession: RAGChatMessage = {
        ...message,
        metadata: {
          ...message.metadata,
          session_id: this.currentSessionId,
        },
      };

      messages.push(messageWithSession);

      // Limit message history to prevent storage overflow
      if (messages.length > this.MAX_MESSAGES) {
        messages.splice(0, messages.length - this.MAX_MESSAGES);
        console.log(
          `📝 Trimmed conversation history to ${this.MAX_MESSAGES} messages`
        );
      }

      // Save to session storage
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));

      // Update metadata
      this.sessionMetadata.lastActivity = new Date();
      this.sessionMetadata.messageCount = messages.length;

      if (message.metadata?.processing_time) {
        this.sessionMetadata.totalProcessingTime +=
          message.metadata.processing_time;
      }

      this.saveSessionMetadata();

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `💬 Added ${message.type} message to session (${messages.length} total)`
        );
      }
    } catch (error) {
      console.error("Failed to add message to conversation history:", error);

      // Try to recover by clearing corrupted data
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.warn("Storage quota exceeded, clearing old messages...");
        this.clearSession();
      }
    }
  }

  /**
   * Get conversation history from session storage
   */
  getConversationHistory(): RAGChatMessage[] {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const messages = JSON.parse(stored);

        // Convert timestamp strings back to Date objects
        return messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (error) {
      console.error("Failed to load conversation history:", error);

      // Clear corrupted data
      this.clearStorageData();
    }

    return [];
  }

  /**
   * Get recent conversation context (last N messages)
   */
  getRecentContext(messageCount: number = 10): RAGChatMessage[] {
    const allMessages = this.getConversationHistory();
    return allMessages.slice(-messageCount);
  }

  /**
   * Get conversation summary for context
   */
  getConversationSummary(): {
    messageCount: number;
    userQueries: string[];
    phonesMentioned: string[];
    queryTypes: string[];
    sessionDuration: number;
  } {
    const messages = this.getConversationHistory();
    const userMessages = messages.filter((msg) => msg.type === "user");
    const assistantMessages = messages.filter(
      (msg) => msg.type === "assistant"
    );

    const userQueries = userMessages
      .map((msg) => msg.content as string)
      .slice(-5); // Last 5 queries

    const phonesMentioned: string[] = [];
    const queryTypes: string[] = [];

    assistantMessages.forEach((msg) => {
      if (msg.metadata?.phone_slugs) {
        phonesMentioned.push(...msg.metadata.phone_slugs);
      }
      if (msg.metadata?.query_type) {
        queryTypes.push(msg.metadata.query_type);
      }
    });

    const sessionDuration =
      Date.now() - this.sessionMetadata.startTime.getTime();

    return {
      messageCount: messages.length,
      userQueries,
      phonesMentioned: Array.from(new Set(phonesMentioned)),
      queryTypes: Array.from(new Set(queryTypes)),
      sessionDuration,
    };
  }

  /**
   * Clear current session and start fresh
   */
  clearSession(): void {
    console.log(`🗑️ Clearing chat session: ${this.currentSessionId}`);

    // Clear storage
    this.clearStorageData();

    // Create new session
    this.currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Reset metadata
    const now = new Date();
    this.sessionMetadata = {
      sessionId: this.currentSessionId,
      startTime: now,
      lastActivity: now,
      messageCount: 0,
      totalProcessingTime: 0,
    };

    this.saveSessionMetadata();

    console.log(`🆕 Started new chat session: ${this.currentSessionId}`);
  }

  /**
   * Export conversation history for user reference
   */
  exportHistory(): {
    sessionId: string;
    exportTime: Date;
    metadata: SessionMetadata;
    messages: RAGChatMessage[];
    summary: ConversationSummary;
  } {
    return {
      sessionId: this.currentSessionId,
      exportTime: new Date(),
      metadata: this.getSessionMetadata(),
      messages: this.getConversationHistory(),
      summary: this.getConversationSummary(),
    };
  }

  /**
   * Initialize a fresh chat context
   */
  static initializeContext(): ChatContext {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    return {
      sessionId,
      messages: [],
      phoneRecommendations: [],
      userPreferences: {},
      conversationSummary: "",
    };
  }

  /**
   * Load context from storage
   */
  static loadContext(): ChatContext {
    try {
      const stored = sessionStorage.getItem("peyechi_chat_context");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load chat context:", error);
    }
    return this.initializeContext();
  }

  /**
   * Save context to storage
   */
  static saveContext(context: ChatContext): void {
    try {
      sessionStorage.setItem("peyechi_chat_context", JSON.stringify(context));
    } catch (error) {
      console.error("Failed to save chat context:", error);
    }
  }

  /**
   * Clear context from storage
   */
  static clearContext(): void {
    try {
      sessionStorage.removeItem("peyechi_chat_context");
    } catch (error) {
      console.error("Failed to clear chat context:", error);
    }
  }

  /**
   * Add phone recommendation to context
   */
  static addPhoneRecommendation(
    context: ChatContext,
    phones: any[],
    query: string
  ): ChatContext {
    // Extract metadata from phones
    const prices = phones
      .map((p) => p.price || p.price_original || 0)
      .filter((p) => p > 0);
    const brands = Array.from(
      new Set(phones.map((p) => p.brand).filter(Boolean))
    );
    const features = Array.from(
      new Set(
        phones.flatMap((p) => (p.key_specs ? Object.keys(p.key_specs) : []))
      )
    );

    const phoneRecommendation: PhoneRecommendationContext = {
      phones: phones,
      originalQuery: query,
      timestamp: Date.now(),
      metadata: {
        priceRange:
          prices.length > 0
            ? {
                min: Math.min(...prices),
                max: Math.max(...prices),
              }
            : undefined,
        brands: brands,
        features: features,
      },
    };

    return {
      ...context,
      phoneRecommendations: [
        ...context.phoneRecommendations,
        phoneRecommendation,
      ],
    };
  }

  /**
   * Get recent phone context within a time window
   */
  static getRecentPhoneContext(
    context: ChatContext,
    timeWindowMs: number = 600000 // 10 minutes default
  ): PhoneRecommendationContext[] {
    const now = Date.now();
    return context.phoneRecommendations.filter((rec) => {
      return now - rec.timestamp <= timeWindowMs;
    });
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): {
    used: number;
    available: number;
    messageCount: number;
    storageHealthy: boolean;
  } {
    try {
      const messages = this.getConversationHistory();
      const storageData = sessionStorage.getItem(this.STORAGE_KEY) || "";
      const metadataData = sessionStorage.getItem(this.METADATA_KEY) || "";

      const used = (storageData.length + metadataData.length) * 2; // Rough estimate in bytes
      const available = 5 * 1024 * 1024; // 5MB typical sessionStorage limit

      return {
        used,
        available,
        messageCount: messages.length,
        storageHealthy: used < available * 0.8, // Healthy if under 80% usage
      };
    } catch (error) {
      console.error("Failed to get storage info:", error);
      return {
        used: 0,
        available: 0,
        messageCount: 0,
        storageHealthy: false,
      };
    }
  }

  /**
   * Handle storage quota exceeded error
   */
  handleStorageQuotaExceeded(): void {
    console.warn("⚠️ Storage quota exceeded, implementing cleanup strategy...");

    const messages = this.getConversationHistory();

    if (messages.length > 20) {
      // Keep only the most recent 20 messages
      const recentMessages = messages.slice(-20);

      try {
        sessionStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(recentMessages)
        );

        this.sessionMetadata.messageCount = recentMessages.length;
        this.saveSessionMetadata();

        console.log(
          `✅ Cleaned up conversation history, kept ${recentMessages.length} recent messages`
        );
      } catch (error) {
        console.error("Failed to cleanup after quota exceeded:", error);
        this.clearSession();
      }
    } else {
      // If still too much data with few messages, clear everything
      this.clearSession();
    }
  }
}

// Create and export singleton instance
export const chatContextManager = new ChatContextManager();
