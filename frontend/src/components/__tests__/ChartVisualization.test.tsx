import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChartVisualization from '../ChartVisualization';
import { Phone } from '../../api/phones';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Radar: () => <div data-testid="radar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
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
    url: '/samsung-galaxy-a55',
    overall_device_score: 8.2,
    camera_score: 8.5,
    battery_score: 8.0,
    performance_score: 7.8,
    display_score: 8.1,
    ram_gb: 8,
    storage_gb: 128,
    primary_camera_mp: 50,
    battery_capacity_numeric: 5000,
    refresh_rate_numeric: 120
  },
  {
    id: 2,
    name: 'iPhone 15',
    brand: 'Apple',
    model: 'iPhone 15',
    price: '95,000',
    price_original: 95000,
    url: '/iphone-15',
    overall_device_score: 9.0,
    camera_score: 9.2,
    battery_score: 7.5,
    performance_score: 9.5,
    display_score: 9.0,
    ram_gb: 6,
    storage_gb: 128,
    primary_camera_mp: 48,
    battery_capacity_numeric: 3349,
    refresh_rate_numeric: 60
  }
];

describe('ChartVisualization', () => {
  const mockOnBackToSimple = jest.fn();

  beforeEach(() => {
    mockOnBackToSimple.mockClear();
  });

  it('renders chart visualization correctly', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    expect(screen.getByText('Interactive Chart View')).toBeInTheDocument();
    expect(screen.getByText('Chart Type')).toBeInTheDocument();
    expect(screen.getByText('Metrics to Display')).toBeInTheDocument();
  });

  it('displays chart type selector buttons', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('Line')).toBeInTheDocument();
    expect(screen.getByText('Radar')).toBeInTheDocument();
  });

  it('switches chart types when buttons are clicked', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    // Initially should show bar chart
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

    // Click line chart button
    fireEvent.click(screen.getByText('Line'));
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Click radar chart button
    fireEvent.click(screen.getByText('Radar'));
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('displays metric selector buttons', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    expect(screen.getByText('Overall Score')).toBeInTheDocument();
    expect(screen.getByText('Camera Score')).toBeInTheDocument();
    expect(screen.getByText('Battery Score')).toBeInTheDocument();
    expect(screen.getByText('Performance Score')).toBeInTheDocument();
  });

  it('toggles metrics when metric buttons are clicked', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    const overallScoreButton = screen.getByText('Overall Score');
    
    // Initially selected (should have brand background)
    expect(overallScoreButton).toHaveClass('bg-brand');

    // Click to deselect
    fireEvent.click(overallScoreButton);
    expect(overallScoreButton).not.toHaveClass('bg-brand');

    // Click to select again
    fireEvent.click(overallScoreButton);
    expect(overallScoreButton).toHaveClass('bg-brand');
  });

  it('displays phone legend with phone information', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    expect(screen.getByText('Samsung Galaxy A55')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15')).toBeInTheDocument();
    expect(screen.getByText('Samsung • ৳45,000')).toBeInTheDocument();
    expect(screen.getByText('Apple • ৳95,000')).toBeInTheDocument();
  });

  it('calls onBackToSimple when back button is clicked', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    const backButtons = screen.getAllByText('Back to Simple View');
    fireEvent.click(backButtons[0]);

    expect(mockOnBackToSimple).toHaveBeenCalledTimes(1);
  });

  it('shows message when no metrics are selected', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    // Deselect all metrics
    fireEvent.click(screen.getByText('Overall Score'));
    fireEvent.click(screen.getByText('Camera Score'));
    fireEvent.click(screen.getByText('Battery Score'));
    fireEvent.click(screen.getByText('Performance Score'));

    expect(screen.getByText('Select at least one metric to display the chart')).toBeInTheDocument();
  });

  it('applies dark mode styles correctly', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={true}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    const container = screen.getByText('Interactive Chart View');
    expect(container).toBeInTheDocument();
  });

  it('displays correct footer information', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
        onBackToSimple={mockOnBackToSimple}
      />
    );

    expect(screen.getByText(/Interactive chart comparison of 2 phone\(s\) across 4 metric\(s\)/)).toBeInTheDocument();
  });

  it('renders without onBackToSimple callback', () => {
    render(
      <ChartVisualization
        phones={mockPhones}
        darkMode={false}
      />
    );

    expect(screen.getByText('Interactive Chart View')).toBeInTheDocument();
    expect(screen.queryByLabelText('Back to simple view')).not.toBeInTheDocument();
  });
});