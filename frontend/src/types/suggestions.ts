// Types for interactive follow-up suggestions and context management

import { Phone } from '../api/phones';
import { ChatMessage } from './chat';

export interface FollowUpSuggestion {
  id: string;
  text: string;
  icon: string;
  query: string;
  category: 'filter' | 'comparison' | 'detail' | 'alternative';
  priority: number; // Higher number = higher priority
}

export interface SuggestionContext {
  phones: Phone[];
  commonFeatures: string[];
  priceRange: [number, number];
  brands: string[];
  missingFeatures: string[];
  userIntent: 'budget' | 'premium' | 'gaming' | 'camera' | 'battery' | 'general';
}

export interface ChatContext {
  currentRecommendations: Phone[];
  userPreferences: {
    priceRange?: [number, number];
    preferredBrands?: string[];
    importantFeatures?: string[];
  };
  conversationHistory: ChatMessage[];
  lastQuery: string;
  sessionId: string;
}

export interface DrillDownOption {
  command: 'full_specs' | 'chart_view' | 'detail_focus';
  label: string;
  icon: string;
  target?: string; // specific feature like 'display', 'camera'
}

export interface DrillDownRequest {
  command: 'full_specs' | 'chart_view' | 'detail_focus';
  target?: string;
  phones: Phone[];
  context: ChatContext;
}

export interface DrillDownResponse {
  type: 'detailed_specs' | 'chart_visualization' | 'feature_analysis';
  data: any;
  backToSimple?: boolean;
}

export interface EnhancedChatMessage {
  user: string;
  bot: string;
  phones?: Phone[];
  suggestions?: FollowUpSuggestion[];
  drillDownOptions?: DrillDownOption[];
  context?: ChatContext;
  timestamp: Date;
  messageId: string;
}