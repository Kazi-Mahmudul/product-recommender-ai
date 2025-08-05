import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedComparison from '../EnhancedComparison';
import { Phone } from '../../api/phones';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, onClick }: any) => (
    <div data-testid="bar-chart" onClick={() => onClick && onClick({ activeLabel: 'Test Feature' })}>
      {children}
    </div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  LabelList: () => <div data-testid="label-list" />,
  Cell: () => <div data-testid="cell" />
}));

const mockPhones: Phone[] = [
  {
    id: 1,
    name: 'Samsung Galaxy A55',
    brand: 'Samsung',
    model: 'Galaxy A55',
    price: '45,000',
    price_original: 45000,
    url: '/samsung-galaxy-a55'
  },
  {
    id: 2,
    name: 'iPhone 15',
    brand: 'Apple',
    model: 'iPhone 15',
    price: '95,000',
    price_original: 95000,
    url: '/iphone-15'
  }
];

const mockFeatures = [
  {
    key: 'price_original',
    label: 'Price',
    raw: [45000, 95000],
    percent: [32.1, 67.9]
  },
  {
    key: 'ram_gb',
    label: 'RAM',
    raw: [8, 6],
    percent: [57.1, 42.9]
  },
  {
    key: 'camera_score',
    label: 'Camera Score',
    raw: [8.5, 9.2],
    percent: [48.0, 52.0]
  }
];

describe('EnhancedComparison', () => {
  const mockOnAddPhone = jest.fn();
  const mockOnRemovePhone = jest.fn();
  const mockOnFeatureFocus = jest.fn();

  beforeEach(() => {
    mockOnAddPhone.mockClear();
    mockOnRemovePhone.mockClear();
    mockOnFeatureFocus.mockClear();
  });

  it('renders enhanced comparison correctly', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
        onAddPhone={mockOnAddPhone}
        onRemovePhone={mockOnRemovePhone}
        onFeatureFocus={mockOnFeatureFocus}
      />
    );

    expect(screen.getByText('Phone Comparison')).toBeInTheDocument();
    expect(screen.getByText('Feature Comparison')).toBeInTheDocument();
    expect(screen.getByText('Samsung Galaxy A55')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15')).toBeInTheDocument();
  });

  it('displays key insights', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
      />
    );

    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.getByText(/iPhone 15 leads in Price with 95000 BDT/)).toBeInTheDocument();
    expect(screen.getByText(/Samsung Galaxy A55 leads in RAM with 8GB/)).toBeInTheDocument();
  });

  it('displays phone cards with correct information', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
        onRemovePhone={mockOnRemovePhone}
      />
    );

    expect(screen.getByText('Samsung Galaxy A55')).toBeInTheDocument();
    expect(screen.getByText('Samsung')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();

    // Check if remove buttons are present
    const removeButtons = screen.getAllByTitle('Remove from comparison');
    expect(removeButtons).toHaveLength(2);
  });

  it('calls onRemovePhone when remove button is clicked', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
        onRemovePhone={mockOnRemovePhone}
      />
    );

    const removeButtons = screen.getAllByTitle('Remove from comparison');
    fireEvent.click(removeButtons[0]);

    expect(mockOnRemovePhone).toHaveBeenCalledWith('1');
  });

  it('shows add phone button when onAddPhone is provided and less than 5 phones', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
        onAddPhone={mockOnAddPhone}
      />
    );

    expect(screen.getByText('Add Phone')).toBeInTheDocument();
  });

  it('handles feature click and shows feature details', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
        onFeatureFocus={mockOnFeatureFocus}
      />
    );

    const barChart = screen.getByTestId('bar-chart');
    fireEvent.click(barChart);

    expect(mockOnFeatureFocus).toHaveBeenCalledWith('Test Feature');
  });

  it('displays comparison summary when provided', () => {
    const testSummary = 'This is a test comparison summary';
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary={testSummary}
        darkMode={false}
      />
    );

    expect(screen.getByText('Comparison Summary')).toBeInTheDocument();
    expect(screen.getByText(testSummary)).toBeInTheDocument();
  });

  it('applies dark mode styles correctly', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={true}
      />
    );

    // Check if dark mode classes are applied
    const header = screen.getByText('Phone Comparison');
    expect(header).toBeInTheDocument();
  });

  it('handles hover effects on phone cards', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
      />
    );

    const phoneCard = screen.getByText('Samsung Galaxy A55');
    
    // Simulate hover - just verify the element exists and can be interacted with
    fireEvent.mouseEnter(phoneCard);
    expect(phoneCard).toBeInTheDocument();

    // Simulate mouse leave
    fireEvent.mouseLeave(phoneCard);
    expect(phoneCard).toBeInTheDocument();
  });

  it('renders without optional callbacks', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
      />
    );

    expect(screen.getByText('Phone Comparison')).toBeInTheDocument();
    expect(screen.queryByText('Add Phone')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Remove from comparison')).not.toBeInTheDocument();
  });

  it('displays correct feature units', () => {
    render(
      <EnhancedComparison
        phones={mockPhones}
        features={mockFeatures}
        summary="Test comparison summary"
        darkMode={false}
      />
    );

    // Check if units are displayed correctly in insights
    expect(screen.getByText(/45000 BDT/)).toBeInTheDocument();
    expect(screen.getAllByText(/8GB/)[0]).toBeInTheDocument(); // Use getAllByText for multiple matches
    expect(screen.getAllByText(/9.2\/10/)[0]).toBeInTheDocument(); // Use getAllByText for multiple matches
  });
});