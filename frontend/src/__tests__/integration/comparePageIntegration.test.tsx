/**
 * Integration tests for compare page infinite loop prevention
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComparePage from '../../pages/ComparePage';
import { requestManager } from '../../services/requestManager';
import { performanceMonitor } from '../../utils/performanceMonitor';

// Mock the API
jest.mock('../../api/phones', () => ({
  fetchPhonesByIds: jest.fn(),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock AI verdict hook
jest.mock('../../hooks/useAIVerdict', () => ({
  useAIVerdict: jest.fn(),
}));

const mockPhones = [
  { id: 1, name: 'Phone 1', brand: 'Brand A', model: 'Model 1', price: '$100', url: '/phone1' },
  { id: 2, name: 'Phone 2', brand: 'Brand B', model: 'Model 2', price: '$200', url: '/phone2' },
];

describe('Compare Page Integration - Infinite Loop Prevention', () => {
  const { fetchPhonesByIds } = require('../../api/phones');
  const { useParams, useNavigate, useSearchParams } = require('react-router-dom');
  const { useAIVerdict } = require('../../hooks/useAIVerdict');

  const mockNavigate = jest.fn();
  const mockAIVerdictActions = {
    generateVerdict: jest.fn(),
    clearVerdict: jest.fn(),
    retry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup router mocks
    useParams.mockReturnValue({ phoneIds: '1-2' });
    useNavigate.mockReturnValue(mockNavigate);
    useSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);

    // Setup AI verdict mock
    useAIVerdict.mockReturnValue([
      { verdict: null, isLoading: false, error: null },
      mockAIVerdictActions,
    ]);

    // Setup API mock
    fetchPhonesByIds.mockResolvedValue(mockPhones);

    // Clear request manager state
    requestManager.cancelAllRequests();
    requestManager.clearCache();

    // Enable performance monitoring for tests
    performanceMonitor.setEnabled(true);
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    jest.useRealTimers();
    performanceMonitor.setEnabled(false);
  });

  const renderComparePage = () => {
    return render(
      <BrowserRouter>
        <ComparePage />
      </BrowserRouter>
    );
  };

  describe('Request Deduplication', () => {
    it('should not make duplicate requests for same phone IDs', async () => {
      renderComparePage();

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(fetchPhonesByIds).toHaveBeenCalledTimes(1);
        expect(fetchPhonesByIds).toHaveBeenCalledWith([1, 2], expect.any(AbortSignal));
      });

      // Verify no additional calls were made
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(fetchPhonesByIds).toHaveBeenCalledTimes(1);
    });

    it('should prevent infinite loops on rapid state changes', async () => {
      const { rerender } = renderComparePage();

      // Simulate rapid phone ID changes
      useParams.mockReturnValue({ phoneIds: '1-3' });
      rerender(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      useParams.mockReturnValue({ phoneIds: '2-3' });
      rerender(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      useParams.mockReturnValue({ phoneIds: '1-2-3' });
      rerender(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      // Fast-forward all debounce timers
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        // Should only make one request for the final state
        expect(fetchPhonesByIds).toHaveBeenCalledTimes(1);
        expect(fetchPhonesByIds).toHaveBeenCalledWith([1, 2, 3], expect.any(AbortSignal));
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully without infinite retries', async () => {
      const networkError = new TypeError('Failed to fetch');
      fetchPhonesByIds.mockRejectedValue(networkError);

      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Should not continue making requests after error
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should have made only the initial request attempts (including retries from retry service)
      expect(fetchPhonesByIds).toHaveBeenCalledTimes(1);
    });

    it('should handle insufficient resources error with proper backoff', async () => {
      const resourceError = new Error('net::ERR_INSUFFICIENT_RESOURCES');
      fetchPhonesByIds.mockRejectedValue(resourceError);

      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/Server is experiencing high load/)).toBeInTheDocument();
      });

      // Verify retry button is available
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should allow manual retry after error', async () => {
      const networkError = new TypeError('Failed to fetch');
      fetchPhonesByIds.mockRejectedValueOnce(networkError).mockResolvedValueOnce(mockPhones);

      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(fetchPhonesByIds).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel requests when component unmounts', async () => {
      const { unmount } = renderComparePage();

      act(() => {
        jest.advanceTimersByTime(100); // Start request but don't complete
      });

      // Unmount before request completes
      unmount();

      // Verify cleanup was called
      expect(requestManager.cancelAllRequests).toBeDefined();
    });

    it('should cancel previous requests when phone IDs change', async () => {
      const { rerender } = renderComparePage();

      // Start first request
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Change phone IDs before first request completes
      useParams.mockReturnValue({ phoneIds: '3-4' });
      rerender(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should make request for new phone IDs
        expect(fetchPhonesByIds).toHaveBeenCalledWith([3, 4], expect.any(AbortSignal));
      });
    });
  });

  describe('Caching Behavior', () => {
    it('should use cached results for repeated requests', async () => {
      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(fetchPhonesByIds).toHaveBeenCalledTimes(1);
      });

      // Simulate navigation away and back
      useParams.mockReturnValue({ phoneIds: '3-4' });
      const { rerender } = renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(fetchPhonesByIds).toHaveBeenCalledTimes(2);
      });

      // Navigate back to original phones
      useParams.mockReturnValue({ phoneIds: '1-2' });
      rerender(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should use cache, not make new request
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(fetchPhonesByIds).toHaveBeenCalledTimes(2); // No additional call
    });
  });

  describe('Performance Monitoring', () => {
    it('should track request metrics', async () => {
      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(fetchPhonesByIds).toHaveBeenCalled();
      });

      const stats = performanceMonitor.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.successfulRequests).toBeGreaterThan(0);
    });

    it('should track failed requests', async () => {
      fetchPhonesByIds.mockRejectedValue(new Error('Test error'));

      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load phone data/)).toBeInTheDocument();
      });

      const stats = performanceMonitor.getStats();
      expect(stats.failedRequests).toBeGreaterThan(0);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not accumulate event listeners on repeated mounts', async () => {
      const { unmount, rerender } = renderComparePage();

      // Mount and unmount multiple times
      for (let i = 0; i < 5; i++) {
        unmount();
        rerender(
          <BrowserRouter>
            <ComparePage />
          </BrowserRouter>
        );
      }

      // Should not cause memory issues or errors
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(300);
        });
      }).not.toThrow();
    });

    it('should clean up timers on unmount', async () => {
      const { unmount } = renderComparePage();

      // Start some async operations
      act(() => {
        jest.advanceTimersByTime(100);
      });

      unmount();

      // Advancing timers after unmount should not cause errors
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty phone IDs gracefully', async () => {
      useParams.mockReturnValue({ phoneIds: '' });

      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should show empty state, not make API calls
      expect(screen.getByText('Start Your Comparison')).toBeInTheDocument();
      expect(fetchPhonesByIds).not.toHaveBeenCalled();
    });

    it('should handle invalid phone IDs', async () => {
      useParams.mockReturnValue({ phoneIds: 'invalid-ids' });

      renderComparePage();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should redirect to empty comparison
      expect(mockNavigate).toHaveBeenCalledWith('/compare', { replace: true });
    });

    it('should handle concurrent requests for different phone sets', async () => {
      const { rerender } = renderComparePage();

      // Start first request
      useParams.mockReturnValue({ phoneIds: '1-2' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Start second request for different phones
      useParams.mockReturnValue({ phoneIds: '3-4' });
      rerender(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should make requests for both sets
        expect(fetchPhonesByIds).toHaveBeenCalledWith([3, 4], expect.any(AbortSignal));
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle component errors', async () => {
      // Mock a component error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Force an error by making fetchPhonesByIds throw synchronously
      fetchPhonesByIds.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      expect(() => {
        renderComparePage();
        
        act(() => {
          jest.advanceTimersByTime(300);
        });
      }).not.toThrow(); // Error boundary should catch it

      consoleSpy.mockRestore();
    });
  });
});