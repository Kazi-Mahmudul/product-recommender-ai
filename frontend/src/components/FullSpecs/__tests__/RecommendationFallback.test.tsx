import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecommendationFallback from '../RecommendationFallback';

describe('RecommendationFallback', () => {
  test('renders network error UI when isNetworkError is true', () => {
    render(
      <RecommendationFallback 
        error="Network error" 
        isNetworkError={true} 
      />
    );
    
    expect(screen.getByText('Network connection issue')).toBeInTheDocument();
    expect(screen.getByText('Please check your internet connection and try again.')).toBeInTheDocument();
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();
  });

  test('renders no recommendations UI when noRecommendations is true', () => {
    render(
      <RecommendationFallback 
        error={null} 
        noRecommendations={true} 
      />
    );
    
    expect(screen.getByText('No recommendations available')).toBeInTheDocument();
    expect(screen.getByText(/We couldn't find any similar phones/)).toBeInTheDocument();
  });

  test('renders generic error UI for other errors', () => {
    const errorMessage = 'Something went wrong with the API';
    render(
      <RecommendationFallback 
        error={errorMessage}
      />
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('calls retry function when retry button is clicked', () => {
    const mockRetry = jest.fn();
    render(
      <RecommendationFallback 
        error="Error message" 
        retry={mockRetry}
      />
    );
    
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  test('calls resetError function when retry button is clicked and resetError is provided', () => {
    const mockResetError = jest.fn();
    const mockRetry = jest.fn();
    
    render(
      <RecommendationFallback 
        error="Error message" 
        resetError={mockResetError}
        retry={mockRetry}
      />
    );
    
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockResetError).toHaveBeenCalledTimes(1);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  test('handles Error objects correctly', () => {
    const error = new Error('API error occurred');
    render(
      <RecommendationFallback 
        error={error}
      />
    );
    
    expect(screen.getByText('API error occurred')).toBeInTheDocument();
  });
});