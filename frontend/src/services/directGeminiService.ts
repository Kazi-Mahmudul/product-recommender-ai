/**
 * Direct Gemini AI Service
 * Connects frontend directly to the Gemini AI service without FastAPI middleware
 */

export interface GeminiResponse {
  type: 'recommendation' | 'qa' | 'comparison' | 'chat' | 'drill_down';
  data?: any;
  reasoning?: string;
  filters?: any;
  suggestions?: string[];
  command?: string;
  target?: string;
}

export interface FormattedResponse {
  response_type: string;
  content: {
    text?: string;
    phones?: any[];
    suggestions?: string[];
    filters_applied?: any;
    [key: string]: any;
  };
  formatting_hints?: {
    display_as?: string;
    text_style?: string;
    show_suggestions?: boolean;
    show_comparison?: boolean;
    highlight_specs?: boolean;
    show_drill_down?: boolean;
  };
  metadata?: {
    phone_count?: number;
    [key: string]: any;
  };
}

class DirectGeminiService {
  private readonly geminiServiceUrl = process.env.REACT_APP_GEMINI_API;

  /**
   * Send query directly to Gemini AI service
   */
  async sendQuery(query: string): Promise<FormattedResponse> {
    try {
      console.log(`🚀 Sending query to Gemini AI: "${query}"`);
      
      const response = await fetch(`${this.geminiServiceUrl}/parse-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Gemini service error: ${response.status}`);
      }

      const geminiResponse: GeminiResponse = await response.json();
      console.log(`✅ Gemini response received:`, geminiResponse);

      // Format the response for frontend consumption
      return this.formatGeminiResponse(geminiResponse);
      
    } catch (error) {
      console.error('❌ Error calling Gemini service:', error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Format Gemini response for frontend consumption
   */
  private formatGeminiResponse(geminiResponse: GeminiResponse): FormattedResponse {
    const { type, data, reasoning, filters, suggestions } = geminiResponse;

    switch (type) {
      case 'recommendation':
        return this.formatRecommendationResponse(geminiResponse);
      
      case 'qa':
        return this.formatQAResponse(geminiResponse);
      
      case 'comparison':
        return this.formatComparisonResponse(geminiResponse);
      
      case 'chat':
        return this.formatChatResponse(geminiResponse);
      
      case 'drill_down':
        return this.formatDrillDownResponse(geminiResponse);
      
      default:
        return this.formatChatResponse(geminiResponse);
    }
  }

  /**
   * Format recommendation responses
   */
  private formatRecommendationResponse(geminiResponse: GeminiResponse): FormattedResponse {
    const { reasoning, filters, suggestions } = geminiResponse;
    
    return {
      response_type: 'recommendations',
      content: {
        text: reasoning || 'Here are some great phone recommendations based on your requirements:',
        phones: [], // Will be populated by phone data from database via filters
        filters_applied: filters || {},
        suggestions: suggestions || []
      },
      formatting_hints: {
        display_as: 'cards',
        show_comparison: true,
        highlight_specs: true,
        show_suggestions: Boolean(suggestions?.length)
      },
      metadata: {
        gemini_filters: filters,
        requires_phone_data: true
      }
    };
  }

  /**
   * Format Q&A responses
   */
  private formatQAResponse(geminiResponse: GeminiResponse): FormattedResponse {
    const { reasoning, suggestions } = geminiResponse;
    
    // Handle different data formats
    let responseText = reasoning || '';
    if (typeof geminiResponse.data === 'string') {
      responseText = geminiResponse.data;
    } else if (geminiResponse.data && typeof geminiResponse.data === 'object' && geminiResponse.data.response) {
      responseText = geminiResponse.data.response;
    }

    return {
      response_type: 'text',
      content: {
        text: responseText || 'I\'m here to help with your smartphone questions!',
        suggestions: suggestions || []
      },
      formatting_hints: {
        text_style: 'conversational',
        show_suggestions: Boolean(suggestions?.length)
      }
    };
  }

  /**
   * Format comparison responses
   */
  private formatComparisonResponse(geminiResponse: GeminiResponse): FormattedResponse {
    const { data, reasoning, suggestions } = geminiResponse;
    
    return {
      response_type: 'comparison',
      content: {
        text: reasoning || 'Here\'s a detailed comparison of the phones you requested:',
        comparison_data: data,
        suggestions: suggestions || []
      },
      formatting_hints: {
        display_as: 'comparison_chart',
        show_comparison: true,
        show_suggestions: Boolean(suggestions?.length)
      },
      metadata: {
        comparison_type: 'detailed'
      }
    };
  }

  /**
   * Format chat responses
   */
  private formatChatResponse(geminiResponse: GeminiResponse): FormattedResponse {
    const { data, reasoning, suggestions } = geminiResponse;
    
    let responseText = reasoning || '';
    if (typeof data === 'string') {
      responseText = data;
    } else if (data && typeof data === 'object' && data.response) {
      responseText = data.response;
    }

    return {
      response_type: 'text',
      content: {
        text: responseText || 'I\'m here to help you with smartphone questions!',
        suggestions: suggestions || [
          'Ask me about phone recommendations',
          'Compare different smartphones',
          'Get phone specifications'
        ]
      },
      formatting_hints: {
        text_style: 'conversational',
        show_suggestions: true
      }
    };
  }

  /**
   * Format drill-down responses
   */
  private formatDrillDownResponse(geminiResponse: GeminiResponse): FormattedResponse {
    const { data, reasoning, suggestions, command, target } = geminiResponse;
    
    return {
      response_type: 'text',
      content: {
        text: data || reasoning || 'Here are the detailed specifications you requested:',
        suggestions: suggestions || [],
        drill_down_options: [
          {
            label: 'Full Specifications',
            command: 'full_specs',
            target: 'all_specs'
          },
          {
            label: 'Comparison Chart',
            command: 'chart_view',
            target: 'comparison'
          }
        ]
      },
      formatting_hints: {
        text_style: 'detailed',
        show_drill_down: true,
        show_suggestions: Boolean(suggestions?.length)
      },
      metadata: {
        drill_down_command: command,
        drill_down_target: target
      }
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(errorMessage: string): FormattedResponse {
    return {
      response_type: 'text',
      content: {
        text: `I'm having trouble processing your request right now. ${errorMessage}`,
        suggestions: [
          'Try rephrasing your question',
          'Ask about phone recommendations',
          'Request phone comparisons'
        ]
      },
      formatting_hints: {
        text_style: 'error',
        show_suggestions: true
      },
      metadata: {
        error: true,
        error_message: errorMessage
      }
    };
  }

  /**
   * Handle phone data fetching for recommendations using correct backend API
   */
  async fetchPhoneRecommendations(filters: any): Promise<any[]> {
    try {
      // Use environment variable for backend API base URL
      const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
      
      // Build query parameters for the correct /api/phones/ endpoint
      const queryParams = new URLSearchParams();
      
      // Add pagination
      queryParams.append('limit', '10');
      queryParams.append('skip', '0');
      
      // Map AI filters to backend API parameters
      if (filters.brand) queryParams.append('brand', filters.brand);
      if (filters.min_price) queryParams.append('min_price', filters.min_price.toString());
      if (filters.max_price) queryParams.append('max_price', filters.max_price.toString());
      if (filters.min_ram_gb) queryParams.append('min_ram_gb', filters.min_ram_gb.toString());
      if (filters.min_storage_gb) queryParams.append('min_storage_gb', filters.min_storage_gb.toString());
      if (filters.min_primary_camera_mp) queryParams.append('min_primary_camera_mp', filters.min_primary_camera_mp.toString());
      if (filters.min_battery_capacity) queryParams.append('min_battery_capacity', filters.min_battery_capacity.toString());
      if (filters.display_type) queryParams.append('display_type', filters.display_type);
      if (filters.min_refresh_rate) queryParams.append('min_refresh_rate', filters.min_refresh_rate.toString());
      if (filters.min_screen_size) queryParams.append('min_screen_size', filters.min_screen_size.toString());
      if (filters.max_screen_size) queryParams.append('max_screen_size', filters.max_screen_size.toString());
      if (filters.chipset) queryParams.append('chipset', filters.chipset);
      if (filters.os) queryParams.append('os', filters.os);
      if (filters.search) queryParams.append('search', filters.search);
      
      // Add sorting for better results
      queryParams.append('sort', 'overall_device_score');
      
      // Call the correct backend endpoint using GET with query parameters
      const response = await fetch(`${API_BASE_URL}/api/phones/?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // The backend returns { items: [...], total: number }
        return data.items || [];
      } else {
        console.warn('Failed to fetch phone data from /api/phones/, response status:', response.status);
        return [];
      }
    } catch (error) {
      console.warn('Error fetching phone data from /api/phones/:', error);
      return [];
    }
  }
}

// Create and export singleton instance
export const directGeminiService = new DirectGeminiService();
export default directGeminiService;