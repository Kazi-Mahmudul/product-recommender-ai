/**
 * Integration tests for Smart Chat Integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ChatPage from '../../pages/ChatPage';
import { ResponseCacheService } from '../../services/responseCacheService';
import { PerformanceOptimizer } from '../../services/performanceOptimizer';

// Mock fetch
global.fetch = jest.fn();

// Mock services
jest.mock('../../services/responseCacheService');
jest.mock('../../services/performanceOptimizer');
jest.mock('../../services/errorRecoveryService');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock environment variables
process.env.REACT_APP_API_BASE = 'https://test-api.com';

const renderChatPage = (props = {}) => {
  const defaultProps = {
    darkMode: false,
    setDarkMode: jest.fn(),
    ...props
  };

  return render(
    <BrowserRouter>
      <ChatPage {...defaultProps} />
    </BrowserRouter>
  );
};

describe('Smart Chat Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Mock service methods
    (ResponseCacheService.initialize as jest.Mock).mockImplementation(() => {});
    (ResponseCacheService.getCachedResponse as jest.Mock).mockResolvedValue(null);
    (ResponseCacheService.cacheResponse as jest.Mock).mockResolvedValue(undefined);
    (ResponseCacheService.getCacheStats as jest.Mock).mockReturnValue({
      totalEntries: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      averageResponseTime: 0,
      cacheSize: 0
    });

    (PerformanceOptimizer.initialize as jest.Mock).mockImplementation(() => {});
    (PerformanceOptimizer.optimizeQueryProcessing as jest.Mock).mockImplementation(
      async (query, context, apiCall) => {
        const response = await apiCall();
        return {
          response,
          contextAnalysis: { processingTime: 10 },
          processingTime: 100
        };
      }
    );
    (PerformanceOptimizer.getMetrics as jest.Mock).mockReturnValue({
      averageResponseTime: 100,
      totalRequests: 0
    });
    (PerformanceOptimizer.preloadCriticalResources as jest.Mock).mockResolvedValue(undefined);
    (PerformanceOptimizer.cleanup as jest.Mock).mockImplementation(() => {});
  });

  describe('initialization', () => {
    it('should initialize all services on mount', async () => {
      renderChatPage();

      await waitFor(() => {
        expect(PerformanceOptimizer.initialize).toHaveBeenCalledWith({
          enableParallelProcessing: true,
          enableRequestDebouncing: true,
          debounceDelay: 300,
          maxConcurrentRequests: 2,
          enableMemoryCleanup: true,
          enablePerformanceMonitoring: true
        });

        expect(ResponseCacheService.initialize).toHaveBeenCalledWith({
          maxEntries: 50,
          maxAge: 20 * 60 * 1000,
          similarityThreshold: 0.8,
          enableContextAwareness: true
        });

        expect(PerformanceOptimizer.preloadCriticalResources).toHaveBeenCalled();
      });
    });

    it('should show welcome message on initial load', () => {
      renderChatPage();

      expect(screen.getByText(/Welcome to Peyechi AI/)).toBeInTheDocument();
      expect(screen.getByText(/How can I help you today/)).toBeInTheDocument();
    });

    it('should display suggested queries', () => {
      renderChatPage();

      expect(screen.getByText('Best phone under 30k?')).toBeInTheDocument();
      expect(screen.getByText('Compare iPhone vs Samsung')).toBeInTheDocument();
      expect(screen.getByText('Long battery life phones?')).toBeInTheDocument();
    });
  });

  describe('query processing flow', () => {
    it('should process a simple query end-to-end', async () => {
      const mockResponse = {
        response_type: 'text',
        content: {
          text: 'Here are some great phone recommendations!',
          suggestions: ['Try another query']
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      const sendButton = screen.getByLabelText('Send');

      fireEvent.change(input, { target: { value: 'Best phones under 30k' } });
      fireEvent.click(sendButton);

      // Should show user message
      await waitFor(() => {
        expect(screen.getByText('Best phones under 30k')).toBeInTheDocument();
      });

      // Should show AI response
      await waitFor(() => {
        expect(screen.getByText('Here are some great phone recommendations!')).toBeInTheDocument();
      });

      // Should show suggestions
      expect(screen.getByText('Try another query')).toBeInTheDocument();
    });

    it('should use cached response when available', async () => {
      const cachedResponse = {
        response_type: 'text',
        content: { text: 'Cached response' }
      };

      (ResponseCacheService.getCachedResponse as jest.Mock).mockResolvedValueOnce(cachedResponse);

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      const sendButton = screen.getByLabelText('Send');

      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Cached response')).toBeInTheDocument();
      });

      // Should not make API call
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle recommendation responses', async () => {
      const recommendationResponse = {
        response_type: 'recommendations',
        content: {
          text: 'Here are some recommendations:',
          phones: [
            {
              id: '1',
              name: 'iPhone 14',
              price: 120000,
              key_specs: { ram: '6GB', storage: '128GB' },
              scores: { overall: 8.5 }
            }
          ]
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => recommendationResponse
      });

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Recommend phones' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText('iPhone 14')).toBeInTheDocument();
        expect(screen.getByText('৳120,000')).toBeInTheDocument();
        expect(screen.getByText('RAM: 6GB')).toBeInTheDocument();
      });
    });

    it('should handle comparison responses', async () => {
      const comparisonResponse = {
        response_type: 'comparison',
        content: {
          summary: 'Here\'s the comparison:',
          phones: [
            { name: 'iPhone 14', color: '#007AFF' },
            { name: 'Samsung Galaxy S23', color: '#1976D2' }
          ],
          features: [
            {
              label: 'Price',
              raw: [120000, 110000],
              percent: [52, 48]
            }
          ]
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => comparisonResponse
      });

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Compare iPhone vs Samsung' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Here\'s the comparison:')).toBeInTheDocument();
        expect(screen.getByText('iPhone 14')).toBeInTheDocument();
        expect(screen.getByText('Samsung Galaxy S23')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText(/trouble processing/)).toBeInTheDocument();
      });
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'API Error' })
      });

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText(/API Error/)).toBeInTheDocument();
      });
    });

    it('should show fallback response for service errors', async () => {
      // Mock performance optimizer to throw error
      (PerformanceOptimizer.optimizeQueryProcessing as jest.Mock).mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText(/trouble processing/)).toBeInTheDocument();
      });
    });
  });

  describe('user interactions', () => {
    it('should handle suggestion clicks', async () => {
      renderChatPage();

      const suggestionButton = screen.getByText('Best phone under 30k?');
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response_type: 'text',
          content: { text: 'Processing suggestion...' }
        })
      });

      fireEvent.click(suggestionButton);

      await waitFor(() => {
        expect(screen.getByText('Best phone under 30k?')).toBeInTheDocument();
        expect(screen.getByText('Processing suggestion...')).toBeInTheDocument();
      });
    });

    it('should handle Enter key for sending messages', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response_type: 'text',
          content: { text: 'Response to enter key' }
        })
      });

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Response to enter key')).toBeInTheDocument();
      });
    });

    it('should disable input during loading', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ response_type: 'text', content: { text: 'Done' } })
        }), 100))
      );

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      const sendButton = screen.getByLabelText('Send');

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      // Should be disabled during loading
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();

      // Should be enabled after response
      await waitFor(() => {
        expect(input).not.toBeDisabled();
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('context management', () => {
    it('should maintain conversation context across queries', async () => {
      const responses = [
        {
          response_type: 'recommendations',
          content: {
            phones: [{ name: 'iPhone 14', brand: 'Apple' }]
          }
        },
        {
          response_type: 'text',
          content: { text: 'The iPhone 14 has great camera quality' }
        }
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => responses[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => responses[1] });

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');

      // First query
      fireEvent.change(input, { target: { value: 'Recommend iPhone' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText('iPhone 14')).toBeInTheDocument();
      });

      // Second query with context
      fireEvent.change(input, { target: { value: 'How is the camera?' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText('The iPhone 14 has great camera quality')).toBeInTheDocument();
      });

      // Should have sent context in second request
      expect(fetch).toHaveBeenCalledTimes(2);
      const secondCall = (fetch as jest.Mock).mock.calls[1];
      const requestBody = JSON.parse(secondCall[1].body);
      expect(requestBody.context).toBeDefined();
    });
  });

  describe('performance features', () => {
    it('should show processing status during query', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ response_type: 'text', content: { text: 'Done' } })
        }), 100))
      );

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(screen.getByLabelText('Send'));

      // Should show processing status
      await waitFor(() => {
        expect(screen.getByText(/Checking for cached response/)).toBeInTheDocument();
      });
    });

    it('should cache responses after successful queries', async () => {
      const response = {
        response_type: 'text',
        content: { text: 'Test response' }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => response
      });

      renderChatPage();

      const input = screen.getByPlaceholderText('Ask me anything about smartphones...');
      fireEvent.change(input, { target: { value: 'Test query' } });
      fireEvent.click(screen.getByLabelText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });

      // Should have attempted to cache the response
      expect(ResponseCacheService.cacheResponse).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup services on unmount', () => {
      const { unmount } = renderChatPage();
      
      unmount();

      expect(PerformanceOptimizer.cleanup).toHaveBeenCalled();
    });
  });
});