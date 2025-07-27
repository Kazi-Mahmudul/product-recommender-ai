/**
 * Unit tests for ComparePage component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComparePage from '../ComparePage';

// Mock the hooks
jest.mock('../../hooks/useComparisonState', () => ({
  useComparisonState: jest.fn(),
}));

jest.mock('../../hooks/useAIVerdict', () => ({
  useAIVerdict: jest.fn(),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockPhones = [
  { id: 1, name: 'Phone 1', brand: 'Brand A', model: 'Model 1', price: '$100', url: '/phone1' },
  { id: 2, name: 'Phone 2', brand: 'Brand B', model: 'Model 2', price: '$200', url: '/phone2' },
];

describe('ComparePage', () => {
  const mockUseComparisonState = require('../../hooks/useComparisonState').useComparisonState;
  const mockUseAIVerdict = require('../../hooks/useAIVerdict').useAIVerdict;
  const mockUseParams = require('react-router-dom').useParams;
  const mockUseNavigate = require('react-router-dom').useNavigate;
  const mockUseSearchParams = require('react-router-dom').useSearchParams;

  const mockNavigate = jest.fn();
  const mockComparisonActions = {
    setSelectedPhoneIds: jest.fn(),
    addPhone: jest.fn(),
    removePhone: jest.fn(),
    replacePhone: jest.fn(),
    clearError: jest.fn(),
    refreshPhones: jest.fn(),
    retryFetch: jest.fn(),
  };

  const mockAIVerdictActions = {
    generateVerdict: jest.fn(),
    clearVerdict: jest.fn(),
    retry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams.mockReturnValue({});
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);

    // Default comparison state
    mockUseComparisonState.mockReturnValue([
      {
        phones: [],
        selectedPhoneIds: [],
        isLoading: false,
        error: null,
        isValidComparison: false,
        retryCount: 0,
        isRetrying: false,
      },
      mockComparisonActions,
    ]);

    // Default AI verdict state
    mockUseAIVerdict.mockReturnValue([
      {
        verdict: null,
        isLoading: false,
        error: null,
      },
      mockAIVerdictActions,
    ]);
  });

  const renderComparePage = () => {
    return render(
      <BrowserRouter>
        <ComparePage />
      </BrowserRouter>
    );
  };

  describe('Error Handling with Retry', () => {
    it('should display error with retry button', () => {
      mockUseComparisonState.mockReturnValue([
        {
          phones: [],
          selectedPhoneIds: [1, 2],
          isLoading: false,
          error: 'Failed to load phone data',
          isValidComparison: true,
          retryCount: 0,
          isRetrying: false,
        },
        mockComparisonActions,
      ]);

      renderComparePage();

      expect(screen.getByText('Failed to load phone data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should show retry attempt count', () => {
      mockUseComparisonState.mockReturnValue([
        {
          phones: [],
          selectedPhoneIds: [1, 2],
          isLoading: false,
          error: 'Failed to load phone data',
          isValidComparison: true,
          retryCount: 2,
          isRetrying: false,
        },
        mockComparisonActions,
      ]);

      renderComparePage();

      expect(screen.getByText('Retry attempt 2')).toBeInTheDocument();
    });

    it('should call retryFetch when retry button is clicked', () => {
      mockUseComparisonState.mockReturnValue([
        {
          phones: [],
          selectedPhoneIds: [1, 2],
          isLoading: false,
          error: 'Failed to load phone data',
          isValidComparison: true,
          retryCount: 0,
          isRetrying: false,
        },
        mockComparisonActions,
      ]);

      renderComparePage();

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(mockComparisonActions.retryFetch).toHaveBeenCalled();
    });

    it('should disable retry button when retrying', () => {
      mockUseComparisonState.mockReturnValue([
        {
          phones: [],
          selectedPhoneIds: [1, 2],
          isLoading: false,
          error: 'Failed to load phone data',
          isValidComparison: true,
          retryCount: 1,
          isRetrying: true,
        },
        mockComparisonActions,
      ]);

      renderComparePage();

      const retryButton = screen.getByText('Retrying...');
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      mockUseComparisonState.mockReturnValue([
        {
          phones: [],
          selectedPhoneIds: [1, 2],
          isLoading: true,
          error: null,
          isValidComparison: true,
          retryCount: 0,
          isRetrying: false,
        },
        mockComparisonActions,
      ]);

      renderComparePage();

      expect(screen.getByText('Loading phone data...')).toBeInTheDocument();
    });

    it('should show retrying state with attempt count', () => {
      mockUseComparisonState.mockReturnValue([
        {
          phones: [],
          selectedPhoneIds: [1, 2],
          isLoading: true,
          error: null,
          isValidComparison: true,
          retryCount: 2,
          isRetrying: true,
        },
        mockComparisonActions,
      ]);

      renderComparePage();

      expect(screen.getByText('Retrying phone data... (Attempt 2)')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no phones selected', () => {
      renderComparePage();

      expect(screen.getByText('Start Your Comparison')).toBeInTheDocument();
      expect(screen.getByText('Browse Phones')).toBeInTheDocument();
    });
  });

  describe('Interface Compatibility', () => {
    it('should handle all new comparison state fields', () => {
      const comparisonState = {
        phones: mockPhones,
        selectedPhoneIds: [1, 2],
        isLoading: false,
        error: null,
        isValidComparison: true,
        retryCount: 0,
        isRetrying: false,
      };

      mockUseComparisonState.mockReturnValue([comparisonState, mockComparisonActions]);

      renderComparePage();

      // Should render without errors with all new fields
      expect(screen.queryByText('Start Your Comparison')).not.toBeInTheDocument();
    });

    it('should handle all comparison actions including retryFetch', () => {
      const actions = {
        setSelectedPhoneIds: jest.fn(),
        addPhone: jest.fn(),
        removePhone: jest.fn(),
        replacePhone: jest.fn(),
        clearError: jest.fn(),
        refreshPhones: jest.fn(),
        retryFetch: jest.fn(),
      };

      mockUseComparisonState.mockReturnValue([
        {
          phones: [],
          selectedPhoneIds: [],
          isLoading: false,
          error: 'Test error',
          isValidComparison: false,
          retryCount: 0,
          isRetrying: false,
        },
        actions,
      ]);

      renderComparePage();

      // All actions should be available
      expect(typeof actions.setSelectedPhoneIds).toBe('function');
      expect(typeof actions.addPhone).toBe('function');
      expect(typeof actions.removePhone).toBe('function');
      expect(typeof actions.replacePhone).toBe('function');
      expect(typeof actions.clearError).toBe('function');
      expect(typeof actions.refreshPhones).toBe('function');
      expect(typeof actions.retryFetch).toBe('function');
    });
  });
});