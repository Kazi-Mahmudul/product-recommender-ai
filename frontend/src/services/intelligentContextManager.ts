/**
 * Intelligent Context Management System
 * 
 * This service provides advanced context management capabilities including:
 * - Automatic context relevance detection
 * - Topic shift detection
 * - Intelligent conversation flow management
 * - Context-aware query enhancement
 */

export interface ConversationContext {
  recent_topics: string[];
  mentioned_phones: PhoneReference[];
  user_preferences: UserPreferences;
  conversation_flow: ConversationFlow;
  session_metadata: SessionMetadata;
}

export interface PhoneReference {
  name: string;
  brand: string;
  mentioned_at: Date;
  context: string;
  relevance_score: number;
}

export interface UserPreferences {
  budget_range?: string;
  preferred_brands?: string[];
  important_features?: string[];
  usage_patterns?: string[];
}

export interface ConversationFlow {
  current_topic: string;
  topic_history: TopicTransition[];
  conversation_depth: number;
  last_interaction: Date;
}

export interface TopicTransition {
  from_topic: string;
  to_topic: string;
  transition_type: 'natural' | 'abrupt' | 'clarification' | 'drill_down';
  timestamp: Date;
  trigger_query: string;
}

export interface SessionMetadata {
  session_id: string;
  start_time: Date;
  total_queries: number;
  successful_responses: number;
  error_count: number;
}

export interface ContextRelevanceAnalysis {
  is_relevant: boolean;
  relevance_score: number;
  relevant_phones: PhoneReference[];
  relevant_topics: string[];
  context_type: 'phone_specific' | 'feature_comparison' | 'general_inquiry' | 'follow_up';
}

export interface TopicShiftDetection {
  shift_detected: boolean;
  shift_type: 'natural' | 'abrupt' | 'clarification' | 'drill_down';
  previous_topic: string;
  new_topic: string;
  confidence: number;
}

export class IntelligentContextManager {
  private static readonly CONTEXT_RELEVANCE_THRESHOLD = 0.6;
  private static readonly TOPIC_SHIFT_THRESHOLD = 0.7;
  private static readonly MAX_CONTEXT_AGE_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_PHONE_REFERENCES = 10;
  private static readonly MAX_TOPIC_HISTORY = 20;

  /**
   * Analyze whether context should be included in a query
   */
  static analyzeContextRelevance(
    query: string,
    context: ConversationContext
  ): ContextRelevanceAnalysis {
    const queryLower = query.toLowerCase();
    let relevanceScore = 0;
    const relevantPhones: PhoneReference[] = [];
    const relevantTopics: string[] = [];

    // Check for contextual indicators in the query
    const contextualIndicators = [
      'that', 'those', 'them', 'it', 'this', 'these',
      'also', 'too', 'as well', 'compare', 'versus', 'vs',
      'better', 'worse', 'similar', 'different', 'instead',
      'what about', 'how about', 'and', 'or'
    ];

    const hasContextualIndicators = contextualIndicators.some(
      indicator => queryLower.includes(indicator)
    );

    if (hasContextualIndicators) {
      relevanceScore += 0.4;
    }

    // Check for phone references in recent context
    const recentPhones = context.mentioned_phones.filter(
      phone => Date.now() - phone.mentioned_at.getTime() < this.MAX_CONTEXT_AGE_MS
    );

    for (const phone of recentPhones) {
      // Check if query might be referring to this phone
      if (this.queryMightReferToPhone(query, phone)) {
        relevantPhones.push(phone);
        relevanceScore += phone.relevance_score * 0.3;
      }
    }

    // Check for topic continuity
    const currentTopic = context.conversation_flow.current_topic;
    if (currentTopic && this.isTopicContinuation(query, currentTopic)) {
      relevantTopics.push(currentTopic);
      relevanceScore += 0.3;
    }

    // Determine context type
    let contextType: ContextRelevanceAnalysis['context_type'] = 'general_inquiry';
    
    if (relevantPhones.length > 1) {
      contextType = 'feature_comparison';
    } else if (relevantPhones.length === 1) {
      contextType = 'phone_specific';
    } else if (hasContextualIndicators) {
      contextType = 'follow_up';
    }

    return {
      is_relevant: relevanceScore >= this.CONTEXT_RELEVANCE_THRESHOLD,
      relevance_score: Math.min(relevanceScore, 1.0),
      relevant_phones: relevantPhones,
      relevant_topics: relevantTopics,
      context_type: contextType
    };
  }

  /**
   * Build a contextual query by enhancing the original with relevant context
   */
  static buildContextualQuery(
    originalQuery: string,
    context: ConversationContext,
    relevanceAnalysis: ContextRelevanceAnalysis
  ): string {
    if (!relevanceAnalysis.is_relevant) {
      return originalQuery;
    }

    let contextualQuery = originalQuery;
    const contextParts: string[] = [];

    // Add relevant phone context
    if (relevanceAnalysis.relevant_phones.length > 0) {
      const phoneNames = relevanceAnalysis.relevant_phones
        .map(phone => phone.name)
        .join(', ');
      
      contextParts.push(`Previously mentioned phones: ${phoneNames}`);
    }

    // Add relevant topic context
    if (relevanceAnalysis.relevant_topics.length > 0) {
      const topics = relevanceAnalysis.relevant_topics.join(', ');
      contextParts.push(`Current discussion topic: ${topics}`);
    }

    // Add user preferences if relevant
    if (this.shouldIncludePreferences(originalQuery, context.user_preferences)) {
      const prefContext = this.buildPreferenceContext(context.user_preferences);
      if (prefContext) {
        contextParts.push(prefContext);
      }
    }

    // Combine original query with context
    if (contextParts.length > 0) {
      contextualQuery = `${originalQuery}\n\nContext: ${contextParts.join('. ')}`;
    }

    return contextualQuery;
  }

  /**
   * Detect topic shifts in the conversation
   */
  static detectTopicShift(
    query: string,
    context: ConversationContext
  ): TopicShiftDetection {
    const currentTopic = context.conversation_flow.current_topic;
    const newTopic = this.extractTopicFromQuery(query);

    if (!currentTopic || !newTopic) {
      return {
        shift_detected: false,
        shift_type: 'natural',
        previous_topic: currentTopic || '',
        new_topic: newTopic || '',
        confidence: 0
      };
    }

    const similarity = this.calculateTopicSimilarity(currentTopic, newTopic);
    const shiftDetected = similarity < (1 - this.TOPIC_SHIFT_THRESHOLD);

    let shiftType: TopicShiftDetection['shift_type'] = 'natural';
    
    if (shiftDetected) {
      // Determine shift type based on query characteristics
      if (this.isAbruptShift(query, currentTopic, newTopic)) {
        shiftType = 'abrupt';
      } else if (this.isClarificationRequest(query)) {
        shiftType = 'clarification';
      } else if (this.isDrillDownRequest(query)) {
        shiftType = 'drill_down';
      }
    }

    return {
      shift_detected: shiftDetected,
      shift_type: shiftType,
      previous_topic: currentTopic,
      new_topic: newTopic,
      confidence: shiftDetected ? (1 - similarity) : similarity
    };
  }

  /**
   * Update conversation state with new message
   */
  static updateConversationState(
    context: ConversationContext,
    query: string,
    response: any,
    topicShift?: TopicShiftDetection
  ): ConversationContext {
    const updatedContext = { ...context };

    // Update session metadata
    updatedContext.session_metadata = {
      ...updatedContext.session_metadata,
      total_queries: updatedContext.session_metadata.total_queries + 1,
      successful_responses: updatedContext.session_metadata.successful_responses + 1
    };

    // Extract and update phone references
    const newPhoneRefs = this.extractPhoneReferences(query, response);
    updatedContext.mentioned_phones = [
      ...updatedContext.mentioned_phones,
      ...newPhoneRefs
    ]
      .sort((a, b) => b.mentioned_at.getTime() - a.mentioned_at.getTime())
      .slice(0, this.MAX_PHONE_REFERENCES);

    // Update conversation flow
    if (topicShift?.shift_detected) {
      const transition: TopicTransition = {
        from_topic: topicShift.previous_topic,
        to_topic: topicShift.new_topic,
        transition_type: topicShift.shift_type,
        timestamp: new Date(),
        trigger_query: query
      };

      updatedContext.conversation_flow = {
        current_topic: topicShift.new_topic,
        topic_history: [
          transition,
          ...updatedContext.conversation_flow.topic_history
        ].slice(0, this.MAX_TOPIC_HISTORY),
        conversation_depth: updatedContext.conversation_flow.conversation_depth + 1,
        last_interaction: new Date()
      };
    } else {
      updatedContext.conversation_flow.last_interaction = new Date();
    }

    // Update user preferences based on query patterns
    updatedContext.user_preferences = this.updateUserPreferences(
      updatedContext.user_preferences,
      query,
      response
    );

    // Update recent topics
    const queryTopic = this.extractTopicFromQuery(query);
    if (queryTopic && !updatedContext.recent_topics.includes(queryTopic)) {
      updatedContext.recent_topics = [
        queryTopic,
        ...updatedContext.recent_topics
      ].slice(0, 10);
    }

    return updatedContext;
  }

  /**
   * Check if query might refer to a specific phone
   */
  private static queryMightReferToPhone(query: string, phone: PhoneReference): boolean {
    const queryLower = query.toLowerCase();
    const phoneName = phone.name.toLowerCase();
    const brand = phone.brand.toLowerCase();

    // Direct name match
    if (queryLower.includes(phoneName) || queryLower.includes(brand)) {
      return true;
    }

    // Contextual references
    const contextualRefs = ['it', 'that phone', 'this phone', 'the phone'];
    return contextualRefs.some(ref => queryLower.includes(ref));
  }

  /**
   * Check if query continues the current topic
   */
  private static isTopicContinuation(query: string, currentTopic: string): boolean {
    const queryLower = query.toLowerCase();
    const topicLower = currentTopic.toLowerCase();

    // Topic keywords overlap
    const topicKeywords = topicLower.split(' ');
    const queryKeywords = queryLower.split(' ');

    const overlap = topicKeywords.filter(keyword => 
      queryKeywords.some(qKeyword => qKeyword.includes(keyword) || keyword.includes(qKeyword))
    );

    return overlap.length >= Math.min(2, topicKeywords.length * 0.5);
  }

  /**
   * Extract topic from query
   */
  private static extractTopicFromQuery(query: string): string {
    const queryLower = query.toLowerCase();

    // Topic patterns
    const topicPatterns = [
      { pattern: /camera|photo|picture|selfie/i, topic: 'camera' },
      { pattern: /battery|charge|power/i, topic: 'battery' },
      { pattern: /performance|speed|gaming|processor|ram/i, topic: 'performance' },
      { pattern: /display|screen|size/i, topic: 'display' },
      { pattern: /price|cost|budget|cheap|expensive/i, topic: 'price' },
      { pattern: /compare|comparison|vs|versus|better|difference/i, topic: 'comparison' },
      { pattern: /recommend|suggest|best|good/i, topic: 'recommendation' }
    ];

    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(query)) {
        return topic;
      }
    }

    return 'general';
  }

  /**
   * Calculate similarity between topics
   */
  private static calculateTopicSimilarity(topic1: string, topic2: string): number {
    if (topic1 === topic2) return 1.0;

    // Related topics have higher similarity
    const relatedTopics: Record<string, string[]> = {
      'camera': ['photo', 'picture', 'selfie'],
      'battery': ['power', 'charge'],
      'performance': ['speed', 'gaming', 'processor', 'ram'],
      'display': ['screen', 'size'],
      'price': ['cost', 'budget']
    };

    for (const [mainTopic, related] of Object.entries(relatedTopics)) {
      if ((topic1 === mainTopic && related.includes(topic2)) ||
          (topic2 === mainTopic && related.includes(topic1))) {
        return 0.7;
      }
    }

    return 0.0;
  }

  /**
   * Check if shift is abrupt (completely unrelated)
   */
  private static isAbruptShift(query: string, currentTopic: string, newTopic: string): boolean {
    const similarity = this.calculateTopicSimilarity(currentTopic, newTopic);
    return similarity === 0.0;
  }

  /**
   * Check if query is a clarification request
   */
  private static isClarificationRequest(query: string): boolean {
    const clarificationPatterns = [
      /what do you mean/i,
      /can you explain/i,
      /i don't understand/i,
      /clarify/i,
      /what about/i
    ];

    return clarificationPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Check if query is a drill-down request
   */
  private static isDrillDownRequest(query: string): boolean {
    const drillDownPatterns = [
      /tell me more/i,
      /more details/i,
      /specifically/i,
      /in detail/i,
      /elaborate/i
    ];

    return drillDownPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Extract phone references from query and response
   */
  private static extractPhoneReferences(query: string, response: any): PhoneReference[] {
    const phoneRefs: PhoneReference[] = [];
    const now = new Date();

    // Extract from query
    const queryPhones = this.extractPhoneNamesFromText(query);
    for (const phoneName of queryPhones) {
      phoneRefs.push({
        name: phoneName,
        brand: this.extractBrandFromPhoneName(phoneName),
        mentioned_at: now,
        context: 'user_query',
        relevance_score: 0.8
      });
    }

    // Extract from response
    if (response && typeof response === 'object') {
      if (response.phones && Array.isArray(response.phones)) {
        for (const phone of response.phones) {
          phoneRefs.push({
            name: phone.name || phone.model || 'Unknown',
            brand: phone.brand || 'Unknown',
            mentioned_at: now,
            context: 'ai_response',
            relevance_score: 0.9
          });
        }
      }
    }

    return phoneRefs;
  }

  /**
   * Extract phone names from text
   */
  private static extractPhoneNamesFromText(text: string): string[] {
    // This is a simplified version - in practice, you'd use the same logic
    // as the backend phone name extraction
    const phonePatterns = [
      /iPhone\s+\d+[^\s]*/gi,
      /Samsung\s+Galaxy\s+[^\s]+/gi,
      /Xiaomi\s+[^\s]+/gi,
      /OnePlus\s+[^\s]+/gi,
      /Google\s+Pixel\s+[^\s]+/gi
    ];

    const phones: string[] = [];
    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        phones.push(...matches);
      }
    }

    return phones;
  }

  /**
   * Extract brand from phone name
   */
  private static extractBrandFromPhoneName(phoneName: string): string {
    const brands = ['iPhone', 'Samsung', 'Xiaomi', 'OnePlus', 'Google', 'Huawei', 'Oppo', 'Vivo'];
    
    for (const brand of brands) {
      if (phoneName.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }

    return 'Unknown';
  }

  /**
   * Check if user preferences should be included
   */
  private static shouldIncludePreferences(query: string, preferences: UserPreferences): boolean {
    const queryLower = query.toLowerCase();
    
    // Include preferences for recommendation queries
    if (queryLower.includes('recommend') || queryLower.includes('suggest') || queryLower.includes('best')) {
      return true;
    }

    // Include for budget-related queries
    if (queryLower.includes('budget') || queryLower.includes('price') || queryLower.includes('cost')) {
      return Boolean(preferences.budget_range);
    }

    return false;
  }

  /**
   * Build preference context string
   */
  private static buildPreferenceContext(preferences: UserPreferences): string {
    const parts: string[] = [];

    if (preferences.budget_range) {
      parts.push(`Budget: ${preferences.budget_range}`);
    }

    if (preferences.preferred_brands && preferences.preferred_brands.length > 0) {
      parts.push(`Preferred brands: ${preferences.preferred_brands.join(', ')}`);
    }

    if (preferences.important_features && preferences.important_features.length > 0) {
      parts.push(`Important features: ${preferences.important_features.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Update user preferences based on query patterns
   */
  private static updateUserPreferences(
    currentPrefs: UserPreferences,
    query: string,
    response: any
  ): UserPreferences {
    const updatedPrefs = { ...currentPrefs };
    const queryLower = query.toLowerCase();

    // Extract budget preferences
    const budgetMatch = queryLower.match(/under\s+(\d+)k?|below\s+(\d+)k?|budget\s+(\d+)k?/);
    if (budgetMatch) {
      const budget = budgetMatch[1] || budgetMatch[2] || budgetMatch[3];
      updatedPrefs.budget_range = `Under ${budget}${budget.length <= 2 ? 'k' : ''}`;
    }

    // Extract feature preferences
    const featureKeywords = ['camera', 'battery', 'gaming', 'display', 'performance'];
    const mentionedFeatures = featureKeywords.filter(feature => queryLower.includes(feature));
    
    if (mentionedFeatures.length > 0) {
      updatedPrefs.important_features = [
        ...(updatedPrefs.important_features || []),
        ...mentionedFeatures
      ].filter((feature, index, arr) => arr.indexOf(feature) === index);
    }

    return updatedPrefs;
  }

  /**
   * Create initial context for new session
   */
  static createInitialContext(sessionId: string): ConversationContext {
    return {
      recent_topics: [],
      mentioned_phones: [],
      user_preferences: {},
      conversation_flow: {
        current_topic: '',
        topic_history: [],
        conversation_depth: 0,
        last_interaction: new Date()
      },
      session_metadata: {
        session_id: sessionId,
        start_time: new Date(),
        total_queries: 0,
        successful_responses: 0,
        error_count: 0
      }
    };
  }

  /**
   * Clean up old context data
   */
  static cleanupContext(context: ConversationContext): ConversationContext {
    const now = Date.now();
    const cleanedContext = { ...context };

    // Remove old phone references
    cleanedContext.mentioned_phones = cleanedContext.mentioned_phones.filter(
      phone => now - phone.mentioned_at.getTime() < this.MAX_CONTEXT_AGE_MS
    );

    // Limit topic history
    cleanedContext.conversation_flow.topic_history = 
      cleanedContext.conversation_flow.topic_history.slice(0, this.MAX_TOPIC_HISTORY);

    // Limit recent topics
    cleanedContext.recent_topics = cleanedContext.recent_topics.slice(0, 10);

    return cleanedContext;
  }
}