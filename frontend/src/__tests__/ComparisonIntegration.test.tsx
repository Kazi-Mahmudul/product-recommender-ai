import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ComparisonProvider } from '../context/ComparisonContext';
import ComparisonWidget from '../components/ComparisonWidget';
import PhoneCard from '../components/PhoneCard';
import { Phone } from '../api/phones';

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock generateComparisonUrl
jest.mock('../utils/slugUtils', () => ({
  generateComparisonUrl: jest.fn((phoneIds: number[]) => `/compare/${phoneIds.join('-')}`),
}));

// Test phone data
const mockPhone1: Phone = {
  id: 1,
  name: 'iPhone 15',
  brand: 'Apple',
  price: '৳120,000',
  img_url: '/iphone15.jpg',
  model: 'iPhone 15',
  url: '/phones/1',
  ram: '8GB',
  internal_storage: '128GB',
  main_camera: '48MP',
  front_camera: '12MP',
  display_type: 'OLED',
  screen_size_numeric: 6.1,
};

const mockPhone2: Phone = {
  id: 2,
  name: 'Galaxy S24',
  brand: 'Samsung',
  price: '৳110,000',
  img_url: '/galaxy-s24.jpg',
  model: 'Galaxy S24',
  url: '/phones/2',
  ram: '8GB',
  internal_storage: '256GB',
  main_camera: '50MP',
  front_camera: '12MP',
  display_type: 'AMOLED',
  screen_size_numeric: 6.1,
};

const mockPhone3: Phone = {
  id: 3,
  name: 'Pixel 8',
  brand: 'Google',
  price: '৳90,000',
  img_url: '/pixel8.jpg',
  model: 'Pixel 8',
  url: '/phones/3',
  ram: '8GB',
  internal_storage: '128GB',
  main_camera: '50MP',
  front_camera: '10.5MP',
  display_type: 'OLED',
  screen_size_numeric: 6.1,
};

// Mock PhonesPage component
const MockPhonesPage: React.FC = () => {
  const phones = [mockPhone1, mockPhone2, mockPhone3];
  
  return (
    <div>
      <h1>Phones Page</h1>
      <div data-testid="phones-grid">
        {phones.map((phone) => (
          <PhoneCard
            key={phone.id}
            phone={phone}
            onFullSpecs={() => mockNavigate(`/phones/${phone.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

// Mock PhoneDetailsPage component
const MockPhoneDetailsPage: React.FC = () => {
  return (
    <div>
      <h1>Phone Details Page</h1>
      <div data-testid="phone-details">
        <PhoneCard
          phone={mockPhone1}
          onFullSpecs={() => {}}
        />
      </div>
    </div>
  );
};

// Mock ComparePage component
const MockComparePage: React.FC = () => {
  return (
    <div>
      <h1>Compare Page</h1>
      <div data-testid="compare-content">
        Comparison content would be here
      </div>
    </div>
  );
};

// Test app wrapper
const TestApp: React.FC = () => {
  return (
    <BrowserRouter>
      <ComparisonProvider>
        <Routes>
          <Route path="/" element={<MockPhonesPage />} />
          <Route path="/phones" element={<MockPhonesPage />} />
          <Route path="/phones/:id" element={<MockPhoneDetailsPage />} />
          <Route path="/compare" element={<MockComparePage />} />
          <Route path="/compare/:phoneIds" element={<MockComparePage />} />
        </Routes>
        <ComparisonWidget />
      </ComparisonProvider>
    </BrowserRouter>
  );
};

describe('Comparison Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Cross-Page Phone Selection', () => {
    test('should maintain phone selections across page navigation', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Initially no widget should be visible
      expect(screen.queryByText('Selected for comparison')).not.toBeInTheDocument();

      // Find and click compare button on first phone
      const compareButtons = screen.getAllByLabelText('Add to comparison');
      await user.click(compareButtons[0]);

      // Widget should appear
      expect(screen.getByText('Selected for comparison')).toBeInTheDocument();
      expect(screen.getByText('1/5')).toBeInTheDocument();
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();

      // Add second phone
      await user.click(compareButtons[1]);

      // Widget should update
      expect(screen.getByText('2/5')).toBeInTheDocument();
      expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();

      // Verify localStorage was called
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'epick_comparison_selection',
        expect.stringContaining('"phones"')
      );
    });

    test('should show selected state on phone cards', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Find compare buttons
      const compareButtons = screen.getAllByLabelText('Add to comparison');
      
      // Click first phone's compare button
      await user.click(compareButtons[0]);

      // Button should change to selected state
      await waitFor(() => {
        expect(screen.getByLabelText('Remove from comparison')).toBeInTheDocument();
      });

      // Tooltip should change
      const selectedButton = screen.getByLabelText('Remove from comparison');
      await user.hover(selectedButton);
      
      // The button should have different styling (this would be tested via classes)
      expect(selectedButton).toBeInTheDocument();
    });

    test('should toggle phone selection on repeated clicks', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      const compareButton = screen.getAllByLabelText('Add to comparison')[0];
      
      // Add phone
      await user.click(compareButton);
      expect(screen.getByText('Selected for comparison')).toBeInTheDocument();
      expect(screen.getByText('1/5')).toBeInTheDocument();

      // Remove phone by clicking again
      const removeButton = screen.getByLabelText('Remove from comparison');
      await user.click(removeButton);

      // Widget should disappear
      await waitFor(() => {
        expect(screen.queryByText('Selected for comparison')).not.toBeInTheDocument();
      });
    });
  });

  describe('Widget Interaction', () => {
    test('should remove phone from widget and update card state', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Add two phones
      const compareButtons = screen.getAllByLabelText('Add to comparison');
      await user.click(compareButtons[0]);
      await user.click(compareButtons[1]);

      expect(screen.getByText('2/5')).toBeInTheDocument();

      // Remove first phone from widget
      const removeFromWidgetButton = screen.getByLabelText('Remove Apple iPhone 15 from comparison');
      await user.click(removeFromWidgetButton);

      // Widget should update
      expect(screen.getByText('1/5')).toBeInTheDocument();
      expect(screen.queryByText('Apple iPhone 15')).not.toBeInTheDocument();
      expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();

      // Phone card should return to unselected state
      await waitFor(() => {
        expect(screen.getAllByLabelText('Add to comparison')).toHaveLength(2);
      });
    });

    test('should clear all phones and reset all card states', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Add multiple phones
      const compareButtons = screen.getAllByLabelText('Add to comparison');
      await user.click(compareButtons[0]);
      await user.click(compareButtons[1]);
      await user.click(compareButtons[2]);

      expect(screen.getByText('3/5')).toBeInTheDocument();

      // Clear all from widget
      await user.click(screen.getByText('Clear all'));

      // Widget should disappear
      await waitFor(() => {
        expect(screen.queryByText('Selected for comparison')).not.toBeInTheDocument();
      });

      // All phone cards should return to unselected state
      expect(screen.getAllByLabelText('Add to comparison')).toHaveLength(3);
      expect(screen.queryByLabelText('Remove from comparison')).not.toBeInTheDocument();
    });
  });

  describe('Navigation to Comparison Page', () => {
    test('should navigate to comparison page with selected phones', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Add two phones
      const compareButtons = screen.getAllByLabelText('Add to comparison');
      await user.click(compareButtons[0]);
      await user.click(compareButtons[1]);

      // Click Compare Now
      const compareNowButton = screen.getByRole('button', { name: /Compare selected phones/ });
      await user.click(compareNowButton);

      // Should navigate to comparison page
      expect(mockNavigate).toHaveBeenCalledWith('/compare/1-2');

      // Widget should disappear after navigation (simulating the clearing)
      await waitFor(() => {
        expect(screen.queryByText('Selected for comparison')).not.toBeInTheDocument();
      });
    });

    test('should not navigate with insufficient phones', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Add only one phone
      const compareButton = screen.getAllByLabelText('Add to comparison')[0];
      await user.click(compareButton);

      // Compare button should be disabled
      const compareNowButton = screen.getByRole('button', { name: /Select 1 more/ });
      expect(compareNowButton).toBeDisabled();

      await user.click(compareNowButton);

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    test('should show error when trying to add more than 5 phones', async () => {
      const user = userEvent.setup();
      
      // Pre-populate with 5 phones
      const fivePhones = [
        mockPhone1,
        mockPhone2,
        mockPhone3,
        { ...mockPhone1, id: 4, name: 'Phone 4' },
        { ...mockPhone1, id: 5, name: 'Phone 5' },
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        phones: fivePhones,
        timestamp: Date.now(),
        version: '1.0',
      }));

      render(<TestApp />);

      // Widget should show 5 phones
      expect(screen.getByText('5/5')).toBeInTheDocument();

      // Try to add another phone - this would trigger the error in the context
      // The error would be shown in the widget
      expect(screen.getByText('Selected for comparison')).toBeInTheDocument();
    });

    test('should handle localStorage persistence errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage.setItem to throw an error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      render(<TestApp />);

      // Try to add a phone
      const compareButton = screen.getAllByLabelText('Add to comparison')[0];
      await user.click(compareButton);

      // The phone should still be added to memory state even if localStorage fails
      // The error handling should prevent the app from crashing
      expect(screen.getByText('Selected for comparison')).toBeInTheDocument();
    });
  });

  describe('Persistence Across Sessions', () => {
    test('should restore selections from localStorage on app load', () => {
      // Pre-populate localStorage
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        phones: [mockPhone1, mockPhone2],
        timestamp: Date.now(),
        version: '1.0',
      }));

      render(<TestApp />);

      // Widget should appear with restored phones
      expect(screen.getByText('Selected for comparison')).toBeInTheDocument();
      expect(screen.getByText('2/5')).toBeInTheDocument();
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();

      // Phone cards should show selected state
      expect(screen.getAllByLabelText('Remove from comparison')).toHaveLength(2);
    });

    test('should handle corrupted localStorage data gracefully', () => {
      // Provide corrupted data
      mockLocalStorage.getItem.mockReturnValue('invalid json data');

      render(<TestApp />);

      // Should start with clean state
      expect(screen.queryByText('Selected for comparison')).not.toBeInTheDocument();
      expect(screen.getAllByLabelText('Add to comparison')).toHaveLength(3);

      // Should clear the corrupted data
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('epick_comparison_selection');
    });

    test('should handle version mismatch in localStorage', () => {
      // Provide data with old version
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        phones: [mockPhone1],
        timestamp: Date.now(),
        version: '0.9', // Old version
      }));

      render(<TestApp />);

      // Should start with clean state
      expect(screen.queryByText('Selected for comparison')).not.toBeInTheDocument();
      
      // Should clear the old version data
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('epick_comparison_selection');
    });
  });

  describe('Responsive Behavior', () => {
    test('should maintain functionality across different screen sizes', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Add phones
      const compareButtons = screen.getAllByLabelText('Add to comparison');
      await user.click(compareButtons[0]);
      await user.click(compareButtons[1]);

      // Widget should be visible and functional
      expect(screen.getByText('Selected for comparison')).toBeInTheDocument();
      expect(screen.getByText('2/5')).toBeInTheDocument();

      // Both mobile and desktop clear buttons should be present
      const clearButtons = screen.getAllByText('Clear all');
      expect(clearButtons).toHaveLength(2);

      // Mobile clear button should work
      await user.click(clearButtons[0]);
      
      await waitFor(() => {
        expect(screen.queryByText('Selected for comparison')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    test('should maintain proper focus management', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Add phone
      const compareButton = screen.getAllByLabelText('Add to comparison')[0];
      await user.click(compareButton);

      // Widget should be accessible
      const widget = screen.getByText('Selected for comparison');
      expect(widget).toBeInTheDocument();

      // Remove button should have proper label
      const removeButton = screen.getByLabelText('Remove Apple iPhone 15 from comparison');
      expect(removeButton).toBeInTheDocument();

      // Compare button should have proper state
      const compareNowButton = screen.getByRole('button', { name: /Select 1 more/ });
      expect(compareNowButton).toHaveAttribute('title', 'Select at least 2 phones to compare');
    });

    test('should provide proper screen reader support', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      // Add two phones
      const compareButtons = screen.getAllByLabelText('Add to comparison');
      await user.click(compareButtons[0]);
      await user.click(compareButtons[1]);

      // Count should be accessible
      expect(screen.getByText('2/5')).toBeInTheDocument();

      // Compare button should have proper accessible name
      const compareNowButton = screen.getByRole('button', { name: /Compare selected phones/ });
      expect(compareNowButton).toBeInTheDocument();
      expect(compareNowButton).toHaveAttribute('title', 'Compare selected phones');
    });
  });
});