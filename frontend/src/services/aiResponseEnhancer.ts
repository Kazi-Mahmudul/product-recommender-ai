// AI response enhancement service for more natural, contextual responses

import { Phone } from '../api/phones';
import { ChatContext } from './chatContextManager';

export interface EnhancedResponse {
  message: string;
  reasoning?: string;
  suggestions?: string[];
  clarifyingQuestions?: string[];
}

export class AIResponseEnhancer {
  /**
   * Enhance recommendation responses with reasoning and context
   */
  static enhanceRecommendationResponse(
    phones: Phone[],
    originalQuery: string,
    context: ChatContext
  ): EnhancedResponse {
    const reasoning = this.generateRecommendationReasoning(phones, originalQuery, context);
    const suggestions = this.generateFollowUpSuggestions(phones, context);
    
    let message = "Here are some great phone recommendations for you:";
    
    // Add contextual greeting for returning users
    if (context?.queryCount && context.queryCount > 1) {
      message = "Welcome back! Based on your preferences, here are some excellent options:";
    }
    
    // Add reasoning if available
    if (reasoning) {
      message += `\n\n${reasoning}`;
    }
    
    return {
      message,
      reasoning,
      suggestions: suggestions.slice(0, 3)
    };
  }

  /**
   * Enhance QA responses with more natural language
   */
  static enhanceQAResponse(
    question: string,
    answer: string,
    context: ChatContext
  ): EnhancedResponse {
    const enhancedAnswer = this.makeResponseMoreConversational(answer, context);
    const clarifyingQuestions = this.generateClarifyingQuestions(question, context);
    
    return {
      message: enhancedAnswer,
      clarifyingQuestions: clarifyingQuestions.slice(0, 2)
    };
  }

  /**
   * Generate contextual error messages with helpful suggestions
   */
  static generateContextualErrorMessage(
    error: string,
    context: ChatContext
  ): EnhancedResponse {
    const errorType = this.classifyError(error);
    let message = "";
    let suggestions: string[] = [];
    
    switch (errorType) {
      case 'no_results':
        message = "I couldn't find any phones matching your exact criteria, but don't worry! Let me suggest some alternatives.";
        suggestions = [
          "Try expanding your budget range",
          "Consider similar phones from other brands",
          "Look at phones with slightly different specifications"
        ];
        break;
        
      case 'network_error':
        message = "Oops! I'm having trouble connecting right now. This usually resolves quickly.";
        suggestions = [
          "Please try your question again in a moment",
          "Check your internet connection",
          "Try a simpler query first"
        ];
        break;
        
      case 'unclear_query':
        message = "I want to help you find the perfect phone, but I need a bit more information.";
        suggestions = this.generateClarificationSuggestions(context);
        break;
        
      default:
        message = "Something unexpected happened, but I'm still here to help you find great phones!";
        suggestions = [
          "Try rephrasing your question",
          "Ask about a specific phone model",
          "Browse phones by price range"
        ];
    }
    
    // Add contextual suggestions based on user history
    if (context?.userPreferences?.preferredBrands?.length) {
      suggestions.push(`Try searching for ${context.userPreferences.preferredBrands[0]} phones`);
    }
    
    return {
      message,
      suggestions: suggestions.slice(0, 3)
    };
  }

  /**
   * Generate clarifying questions for ambiguous queries
   */
  static generateClarifyingQuestions(
    originalQuery: string,
    context: ChatContext
  ): string[] {
    const questions: string[] = [];
    const lowerQuery = originalQuery.toLowerCase();
    
    // Budget clarification
    if (!lowerQuery.match(/\d+/) && !context?.userPreferences?.priceRange) {
      questions.push("What's your budget range for the phone?");
    }
    
    // Use case clarification
    if (!context?.userPreferences?.primaryUseCase) {
      if (lowerQuery.includes('best') || lowerQuery.includes('good')) {
        questions.push("What will you primarily use the phone for? (gaming, photography, general use)");
      }
    }
    
    // Brand preference clarification
    if (!context?.userPreferences?.preferredBrands?.length && !lowerQuery.match(/(samsung|apple|iphone|xiaomi|poco|redmi|oneplus|oppo|vivo|realme)/)) {
      questions.push("Do you have any preferred brands?");
    }
    
    // Feature importance clarification
    if (!context?.userPreferences?.importantFeatures?.length) {
      questions.push("Which features are most important to you? (camera, battery, performance, display)");
    }
    
    return questions;
  }

  /**
   * Generate recommendation reasoning based on query and context
   */
  private static generateRecommendationReasoning(
    phones: Phone[],
    originalQuery: string,
    context: ChatContext
  ): string {
    const reasons: string[] = [];
    const lowerQuery = originalQuery.toLowerCase();
    
    // Budget-based reasoning
    if (lowerQuery.includes('under') || lowerQuery.includes('budget')) {
      const avgPrice = phones.reduce((sum, p) => sum + (p.price_original || 0), 0) / phones.length;
      reasons.push(`These phones offer excellent value within your budget, averaging ৳${Math.round(avgPrice).toLocaleString()}`);
    }
    
    // Feature-based reasoning
    if (lowerQuery.includes('camera')) {
      const avgCameraScore = phones.reduce((sum, p) => sum + (p.camera_score || 0), 0) / phones.length;
      if (avgCameraScore > 7) {
        reasons.push(`All these phones have strong camera performance (average score: ${avgCameraScore.toFixed(1)}/10)`);
      }
    }
    
    if (lowerQuery.includes('battery')) {
      const avgBattery = phones.reduce((sum, p) => sum + (p.battery_capacity_numeric || 0), 0) / phones.length;
      if (avgBattery > 4000) {
        reasons.push(`These phones feature large batteries averaging ${Math.round(avgBattery)}mAh for all-day usage`);
      }
    }
    
    if (lowerQuery.includes('gaming') || lowerQuery.includes('performance')) {
      const highRefreshPhones = phones.filter(p => p.refresh_rate_numeric && p.refresh_rate_numeric >= 90);
      if (highRefreshPhones.length > 0) {
        reasons.push(`${highRefreshPhones.length} of these phones have high refresh rate displays perfect for gaming`);
      }
    }
    
    // Brand preference reasoning
    if (context?.userPreferences?.preferredBrands?.length) {
      const matchingBrands = phones.filter(p => 
        context?.userPreferences?.preferredBrands?.includes(p.brand)
      );
      if (matchingBrands.length > 0) {
        reasons.push(`I included ${matchingBrands.length} phones from your preferred brands`);
      }
    }
    
    // Context-based reasoning
    if (context?.queryCount && context.queryCount > 3) {
      reasons.push("Based on your previous searches, I think these will be a great fit for your needs");
    }
    
    return reasons.join('. ') + (reasons.length > 0 ? '.' : '');
  }

  /**
   * Generate follow-up suggestions based on recommendations
   */
  private static generateFollowUpSuggestions(
    phones: Phone[],
    context: ChatContext
  ): string[] {
    const suggestions: string[] = [];
    
    // Price-based suggestions
    const prices = phones.map(p => p.price_original || 0).filter(p => p > 0);
    if (prices.length > 0) {
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      
      if (maxPrice > 60000) {
        suggestions.push("Would you like to see more budget-friendly alternatives?");
      }
      if (minPrice < 30000) {
        suggestions.push("Interested in seeing premium options with more features?");
      }
    }
    
    // Feature-based suggestions
    const brands = Array.from(new Set(phones.map(p => p.brand)));
    if (brands.length > 1) {
      suggestions.push(`Want to focus on just ${brands[0]} or ${brands[1]} phones?`);
    }
    
    // Use case suggestions
    if (!context?.userPreferences?.primaryUseCase) {
      suggestions.push("Would you like recommendations specifically for gaming or photography?");
    }
    
    return suggestions;
  }

  /**
   * Make responses more conversational and natural
   */
  private static makeResponseMoreConversational(
    response: string,
    context: ChatContext
  ): string {
    // Add conversational starters
    const starters = [
      "Great question! ",
      "I'd be happy to help with that! ",
      "That's a smart thing to check! ",
      "Good thinking! "
    ];
    
    // Add contextual elements for returning users
    if (context.queryCount && context.queryCount > 1) {
      const returningStarters = [
        "Welcome back! ",
        "Good to see you again! ",
        "I remember you were looking at phones earlier! "
      ];
      starters.push(...returningStarters);
    }
    
    const starter = starters[Math.floor(Math.random() * starters.length)];
    
    // Enhance the response
    let enhanced = starter + response;
    
    // Add encouraging endings
    const endings = [
      " Let me know if you need any other details!",
      " Feel free to ask if you want to know more!",
      " Hope this helps with your decision!",
      " Any other questions about this phone?"
    ];
    
    if (!enhanced.endsWith('!') && !enhanced.endsWith('?')) {
      enhanced += endings[Math.floor(Math.random() * endings.length)];
    }
    
    return enhanced;
  }

  /**
   * Classify error types for better error handling
   */
  private static classifyError(error: string): string {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('no') && (lowerError.includes('found') || lowerError.includes('result'))) {
      return 'no_results';
    }
    if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
      return 'network_error';
    }
    if (lowerError.includes('understand') || lowerError.includes('unclear') || lowerError.includes('ambiguous')) {
      return 'unclear_query';
    }
    
    return 'general_error';
  }

  /**
   * Generate clarification suggestions based on context
   */
  private static generateClarificationSuggestions(context: ChatContext): string[] {
    const suggestions: string[] = [];
    
    // Budget suggestions
    if (!context?.userPreferences?.priceRange) {
      suggestions.push("Tell me your budget range (e.g., 'under 30,000 BDT')");
    }
    
    // Brand suggestions
    if (!context?.userPreferences?.preferredBrands?.length) {
      suggestions.push("Mention a specific brand you're interested in");
    }
    
    // Use case suggestions
    if (!context?.userPreferences?.primaryUseCase) {
      suggestions.push("Let me know what you'll mainly use the phone for");
    }
    
    // Feature suggestions
    if (!context?.userPreferences?.importantFeatures?.length) {
      suggestions.push("Tell me which features matter most to you");
    }
    
    return suggestions;
  }
}