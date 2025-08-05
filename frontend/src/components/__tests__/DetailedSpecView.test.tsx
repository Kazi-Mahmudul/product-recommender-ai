import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DetailedSpecView from '../DetailedSpecView';
import { Phone } from '../../api/phones';

const mockPhone: Phone = {
  id: 1,
  name: 'Samsung Galaxy A55',
  brand: 'Samsung',
  model: 'Galaxy A55',
  price: '45,000',
  price_original: 45000,
  url: '/samsung-galaxy-a55',
  display_type: 'Super AMOLED',
  screen_size_numeric: 6.6,
  refresh_rate_numeric: 120,
  ram_gb: 8,
  storage_gb: 128,
  primary_camera_mp: 50,
  battery_capacity_numeric: 5000,
  overall_device_score: 8.2,
  display_score: 8.0,
  camera_score: 8.5,
  performance_score: 7.8,
  battery_score: 8.3
};

const mockPhones: Phone[] = [
  mockPhone,
  {
    ...mockPhone,
    id: 2,
    name: 'iPhone 15',
    brand: 'Apple',
    model: 'iPhone 15'
  }
];

describe('DetailedSpecView', () => {
  const mockOnBackToSimple = jest.fn();

  beforeEach(() => {
    mockOnBackToSimple.mockClear();
  });

  it('renders detailed specifications correctly', () => {
    render(
      <DetailedSpecView
        phones={[mockPhone]}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    expect(screen.getByText('📋 Detailed Specifications')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('shows phone selector when multiple phones provided', () => {
    render(
      <DetailedSpecView
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    expect(screen.getByText('Samsung Galaxy A55')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15')).toBeInTheDocument();
  });

  it('toggles sections when clicked', () => {
    render(
      <DetailedSpecView
        phones={[mockPhone]}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    const displaySection = screen.getByText('Display');
    fireEvent.click(displaySection);

    // Should show display specifications
    expect(screen.getByText('Display Type:')).toBeInTheDocument();
    expect(screen.getByText('Super AMOLED')).toBeInTheDocument();
  });

  it('calls onBackToSimple when back button is clicked', () => {
    render(
      <DetailedSpecView
        phones={[mockPhone]}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    const backButtons = screen.getAllByText('Back to Simple View');
    fireEvent.click(backButtons[0]);

    expect(mockOnBackToSimple).toHaveBeenCalledTimes(1);
  });

  it('switches between phones correctly', () => {
    render(
      <DetailedSpecView
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    // Click on iPhone 15
    fireEvent.click(screen.getByText('iPhone 15'));

    // Footer should show iPhone 15
    expect(screen.getByText('Showing detailed specifications for iPhone 15')).toBeInTheDocument();
  });

  it('applies dark mode styles correctly', () => {
    render(
      <DetailedSpecView
        phones={[mockPhone]}
        darkMode={true}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    const container = screen.getByText('📋 Detailed Specifications');
    expect(container).toBeInTheDocument();
  });

  it('formats values correctly', () => {
    render(
      <DetailedSpecView
        phones={[mockPhone]}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    // Expand basic information section
    fireEvent.click(screen.getByText('Basic Information'));

    // Check formatted values
    expect(screen.getByText('8.2')).toBeInTheDocument(); // Overall score formatted to 1 decimal
    expect(screen.getByText('45,000 BDT')).toBeInTheDocument(); // Price with unit
  });

  it('hides sections with no data', () => {
    const phoneWithLimitedData: Phone = {
      id: 1,
      name: 'Basic Phone',
      brand: 'Generic',
      model: 'Basic',
      price: '10,000',
      url: '/basic-phone'
    };

    render(
      <DetailedSpecView
        phones={[phoneWithLimitedData]}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    // Should not show sections without data
    expect(screen.queryByText('Camera')).not.toBeInTheDocument();
    expect(screen.queryByText('Performance')).not.toBeInTheDocument();
  });
});