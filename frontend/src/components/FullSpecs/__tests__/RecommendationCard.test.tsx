import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecommendationCard from '../RecommendationCard';

// Mock phone data for testing
const mockPhone = {
  id: 123,
  brand: 'Samsung',
  name: 'Galaxy S21',
  price: '$799',
  img_url: '/test-image.jpg',
  primary_camera_mp: 64,
  battery_capacity_numeric: 4000,
  ram_gb: 8,
  storage_gb: 128,
  screen_size_inches: 6.2
};

const mockHighlights = ['Better camera', 'Longer battery life'];
const mockBadges = ['Popular', 'Best value'];

describe('RecommendationCard Component', () => {
  // Mock functions for event handlers
  const mockOnClick = jest.fn();
  const mockOnMouseEnter = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockOnClick.mockReset();
    mockOnMouseEnter.mockReset();
  });

  test('renders card with correct phone information', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Check that basic phone information is displayed
    expect(screen.getByText('Samsung')).toBeInTheDocument();
    expect(screen.getByText('Galaxy S21')).toBeInTheDocument();
    expect(screen.getByText('$799')).toBeInTheDocument();
    
    // Check that specs are displayed
    expect(screen.getByText('64MP')).toBeInTheDocument();
    expect(screen.getByText('4000mAh')).toBeInTheDocument();
    expect(screen.getByText('8GB')).toBeInTheDocument();
    expect(screen.getByText('128GB')).toBeInTheDocument();
    expect(screen.getByText('6.2"')).toBeInTheDocument();
    
    // Check that highlights are displayed
    expect(screen.getByText('Better camera')).toBeInTheDocument();
    expect(screen.getByText('Longer battery life')).toBeInTheDocument();
    
    // Check that badges are displayed
    expect(screen.getByText('Popular')).toBeInTheDocument();
    expect(screen.getByText('Best value')).toBeInTheDocument();
  });

  test('calls onClick handler when clicked', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Find the card and click it
    const card = screen.getByRole('button', { name: /view details for samsung galaxy s21/i });
    fireEvent.click(card);
    
    // Check that onClick was called with the correct phone ID
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledWith(123);
  });

  test('calls onMouseEnter handler when hovered', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Find the card and trigger mouseEnter
    const card = screen.getByRole('button', { name: /view details for samsung galaxy s21/i });
    fireEvent.mouseEnter(card);
    
    // Check that onMouseEnter was called with the correct phone ID
    expect(mockOnMouseEnter).toHaveBeenCalledTimes(1);
    expect(mockOnMouseEnter).toHaveBeenCalledWith(123);
  });

  test('handles keyboard navigation with Enter key', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Find the card and trigger Enter key
    const card = screen.getByRole('button', { name: /view details for samsung galaxy s21/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    
    // Check that onClick was called
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledWith(123);
  });

  test('handles keyboard navigation with Space key', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Find the card and trigger Space key
    const card = screen.getByRole('button', { name: /view details for samsung galaxy s21/i });
    fireEvent.keyDown(card, { key: ' ' });
    
    // Check that onClick was called
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledWith(123);
  });

  test('renders fallback image when img_url is not provided', () => {
    const phoneWithoutImage = { ...mockPhone, img_url: undefined };
    
    render(
      <RecommendationCard
        phone={phoneWithoutImage}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Check that the fallback image is used
    const image = screen.getByAltText('Galaxy S21');
    expect(image).toHaveAttribute('src', '/phone.png');
  });

  test('creates accessible description for screen readers', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Check that the screen reader description contains all relevant information
    const description = screen.getByText(/Samsung Galaxy S21\. Price: \$799\. 64 megapixel camera, 4000 mAh battery, 8 gigabytes of RAM, 128 gigabytes of storage, 6\.2 inch screen\. Better camera, Longer battery life/i);
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('sr-only');
  });

  test('renders with correct order index for keyboard navigation', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        index={3}
      />
    );

    // Check that the order style is applied
    const card = screen.getByRole('button', { name: /view details for samsung galaxy s21/i });
    expect(card).toHaveStyle('order: 3');
  });

  test('renders without highlights when none are provided', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={[]}
        badges={mockBadges}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Check that no highlights section is rendered
    const highlightsContainer = screen.queryByText('Better camera');
    expect(highlightsContainer).not.toBeInTheDocument();
  });

  test('renders without badges when none are provided', () => {
    render(
      <RecommendationCard
        phone={mockPhone}
        highlights={mockHighlights}
        badges={[]}
        similarityScore={0.95}
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
      />
    );

    // Check that no badges are rendered
    const badgesContainer = screen.queryByText('Popular');
    expect(badgesContainer).not.toBeInTheDocument();
  });
});