import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUpSuggestions from '../FollowUpSuggestions';
import { FollowUpSuggestion } from '../../types/suggestions';

const mockSuggestions: FollowUpSuggestion[] = [
  {
    id: 'test-1',
    text: 'Show budget phones',
    icon: '💰',
    query: 'budget phones under 25000',
    category: 'filter',
    priority: 8
  },
  {
    id: 'test-2',
    text: 'Compare these phones',
    icon: '⚖️',
    query: 'compare phones in detail',
    category: 'comparison',
    priority: 7
  }
];

describe('FollowUpSuggestions', () => {
  const mockOnSuggestionClick = jest.fn();

  beforeEach(() => {
    mockOnSuggestionClick.mockClear();
  });

  it('renders suggestions correctly', () => {
    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    expect(screen.getByText('💡 You might also want to:')).toBeInTheDocument();
    expect(screen.getByText('Show budget phones')).toBeInTheDocument();
    expect(screen.getByText('Compare these phones')).toBeInTheDocument();
  });

  it('calls onSuggestionClick when suggestion is clicked', () => {
    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    fireEvent.click(screen.getByText('Show budget phones'));
    expect(mockOnSuggestionClick).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('renders nothing when no suggestions provided', () => {
    const { container } = render(
      <FollowUpSuggestions
        suggestions={[]}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('disables buttons when loading', () => {
    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('applies dark mode styles correctly', () => {
    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('bg-gray-700');
    });
  });
});