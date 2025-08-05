import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DrillDownOptions from '../DrillDownOptions';
import { DrillDownOption } from '../../types/suggestions';

const mockOptions: DrillDownOption[] = [
  {
    command: 'full_specs',
    label: 'Show full specs',
    icon: '📋'
  },
  {
    command: 'chart_view',
    label: 'Open chart view',
    icon: '📊'
  },
  {
    command: 'detail_focus',
    label: 'Tell me more about display',
    icon: '📱',
    target: 'display'
  }
];

describe('DrillDownOptions', () => {
  const mockOnOptionClick = jest.fn();

  beforeEach(() => {
    mockOnOptionClick.mockClear();
  });

  it('renders options correctly', () => {
    render(
      <DrillDownOptions
        options={mockOptions}
        onOptionClick={mockOnOptionClick}
        darkMode={false}
      />
    );

    expect(screen.getByText('🔧 Power user options:')).toBeInTheDocument();
    expect(screen.getByText('Show full specs')).toBeInTheDocument();
    expect(screen.getByText('Open chart view')).toBeInTheDocument();
    expect(screen.getByText('Tell me more about display')).toBeInTheDocument();
  });

  it('calls onOptionClick when option is clicked', () => {
    render(
      <DrillDownOptions
        options={mockOptions}
        onOptionClick={mockOnOptionClick}
        darkMode={false}
      />
    );

    fireEvent.click(screen.getByText('Show full specs'));
    expect(mockOnOptionClick).toHaveBeenCalledWith(mockOptions[0]);
  });

  it('renders nothing when no options provided', () => {
    const { container } = render(
      <DrillDownOptions
        options={[]}
        onOptionClick={mockOnOptionClick}
        darkMode={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('disables buttons when loading', () => {
    render(
      <DrillDownOptions
        options={mockOptions}
        onOptionClick={mockOnOptionClick}
        darkMode={false}
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('applies brand styling correctly', () => {
    render(
      <DrillDownOptions
        options={mockOptions}
        onOptionClick={mockOnOptionClick}
        darkMode={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('bg-brand');
    });
  });
});