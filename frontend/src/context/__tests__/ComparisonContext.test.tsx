import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { ComparisonProvider, useComparison } from "../ComparisonContext";
import { Phone } from "../../api/phones";

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock generateComparisonUrl
jest.mock("../../utils/slugUtils", () => ({
  generateComparisonUrl: jest.fn(
    (phoneIds: number[]) => `/compare/${phoneIds.join("-")}`
  ),
}));

// Test phone data
const mockPhone1: Phone = {
  id: 1,
  name: "iPhone 15",
  brand: "Apple",
  price: "৳120,000",
  img_url: "/iphone15.jpg",
  model: "iPhone 15",
  url: "/phones/1",
  ram: "8GB",
  internal_storage: "128GB",
  main_camera: "48MP",
  front_camera: "12MP",
  display_type: "OLED",
  screen_size_numeric: 6.1,
};

const mockPhone2: Phone = {
  id: 2,
  name: "Galaxy S24",
  brand: "Samsung",
  price: "৳110,000",
  img_url: "/galaxy-s24.jpg",
  model: "Galaxy S24",
  url: "/phones/2",
  ram: "8GB",
  internal_storage: "256GB",
  main_camera: "50MP",
  front_camera: "12MP",
  display_type: "AMOLED",
  screen_size_numeric: 6.1,
};

const mockPhone3: Phone = {
  id: 3,
  name: "Pixel 8",
  brand: "Google",
  price: "৳90,000",
  img_url: "/pixel8.jpg",
  model: "Pixel 8",
  url: "/phones/3",
  ram: "8GB",
  internal_storage: "128GB",
  main_camera: "50MP",
  front_camera: "10.5MP",
  display_type: "OLED",
  screen_size_numeric: 6.1,
};

// Test component that uses the comparison context
const TestComponent: React.FC = () => {
  const {
    selectedPhones,
    error,
    addPhone,
    removePhone,
    clearComparison,
    isPhoneSelected,
    navigateToComparison,
    clearError,
  } = useComparison();

  return (
    <div>
      <div data-testid="selected-count">{selectedPhones.length}</div>
      <div data-testid="error">{error || "no-error"}</div>

      <button onClick={() => addPhone(mockPhone1)} data-testid="add-phone-1">
        Add Phone 1
      </button>
      <button onClick={() => addPhone(mockPhone2)} data-testid="add-phone-2">
        Add Phone 2
      </button>
      <button onClick={() => addPhone(mockPhone3)} data-testid="add-phone-3">
        Add Phone 3
      </button>

      <button onClick={() => removePhone(1)} data-testid="remove-phone-1">
        Remove Phone 1
      </button>

      <button onClick={clearComparison} data-testid="clear-comparison">
        Clear Comparison
      </button>

      <button
        onClick={navigateToComparison}
        data-testid="navigate-to-comparison"
      >
        Navigate to Comparison
      </button>

      <button onClick={clearError} data-testid="clear-error">
        Clear Error
      </button>

      <div data-testid="phone-1-selected">
        {isPhoneSelected(1) ? "selected" : "not-selected"}
      </div>

      {selectedPhones.map((phone) => (
        <div key={phone.id} data-testid={`selected-phone-${phone.id}`}>
          {phone.name}
        </div>
      ))}
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <BrowserRouter>
      <ComparisonProvider>
        <TestComponent />
      </ComparisonProvider>
    </BrowserRouter>
  );
};

describe("ComparisonContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe("Phone Management", () => {
    test("should add phone to comparison", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
      expect(screen.getByTestId("phone-1-selected")).toHaveTextContent(
        "not-selected"
      );

      await user.click(screen.getByTestId("add-phone-1"));

      expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
      expect(screen.getByTestId("phone-1-selected")).toHaveTextContent(
        "selected"
      );
      expect(screen.getByTestId("selected-phone-1")).toHaveTextContent(
        "iPhone 15"
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test("should remove phone from comparison", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Add phone first
      await user.click(screen.getByTestId("add-phone-1"));
      expect(screen.getByTestId("selected-count")).toHaveTextContent("1");

      // Remove phone
      await user.click(screen.getByTestId("remove-phone-1"));
      expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
      expect(screen.getByTestId("phone-1-selected")).toHaveTextContent(
        "not-selected"
      );
    });

    test("should clear all comparisons", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Add multiple phones
      await user.click(screen.getByTestId("add-phone-1"));
      await user.click(screen.getByTestId("add-phone-2"));
      expect(screen.getByTestId("selected-count")).toHaveTextContent("2");

      // Clear all
      await user.click(screen.getByTestId("clear-comparison"));
      expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "epick_comparison_selection"
      );
    });

    test("should check if phone is selected", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      expect(screen.getByTestId("phone-1-selected")).toHaveTextContent(
        "not-selected"
      );

      await user.click(screen.getByTestId("add-phone-1"));
      expect(screen.getByTestId("phone-1-selected")).toHaveTextContent(
        "selected"
      );
    });
  });

  describe("Error Handling", () => {
    test("should show error when adding duplicate phone", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Add phone first time
      await user.click(screen.getByTestId("add-phone-1"));
      expect(screen.getByTestId("error")).toHaveTextContent("no-error");

      // Try to add same phone again
      await user.click(screen.getByTestId("add-phone-1"));
      expect(screen.getByTestId("error")).toHaveTextContent(
        "This phone is already in your comparison list"
      );
    });

    test("should show error when maximum phones reached", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Add 5 phones (maximum)
      await user.click(screen.getByTestId("add-phone-1"));
      await user.click(screen.getByTestId("add-phone-2"));
      await user.click(screen.getByTestId("add-phone-3"));

      // Create additional phones for testing max limit
      const mockPhone4: Phone = { ...mockPhone1, id: 4, name: "Phone 4" };
      const mockPhone5: Phone = { ...mockPhone1, id: 5, name: "Phone 5" };

      // Mock addPhone calls for phones 4 and 5
      const { addPhone } = useComparison();
      act(() => {
        addPhone(mockPhone4);
        addPhone(mockPhone5);
      });

      expect(screen.getByTestId("selected-count")).toHaveTextContent("5");

      // Try to add 6th phone
      const mockPhone6: Phone = { ...mockPhone1, id: 6, name: "Phone 6" };
      act(() => {
        addPhone(mockPhone6);
      });

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Maximum 5 phones can be compared at once"
      );
      expect(screen.getByTestId("selected-count")).toHaveTextContent("5");
    });

    test("should clear error manually", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Create error by adding duplicate
      await user.click(screen.getByTestId("add-phone-1"));
      await user.click(screen.getByTestId("add-phone-1"));
      expect(screen.getByTestId("error")).not.toHaveTextContent("no-error");

      // Clear error
      await user.click(screen.getByTestId("clear-error"));
      expect(screen.getByTestId("error")).toHaveTextContent("no-error");
    });

    test("should auto-clear error after 5 seconds", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      renderWithProvider();

      // Create error
      await user.click(screen.getByTestId("add-phone-1"));
      await user.click(screen.getByTestId("add-phone-1"));
      expect(screen.getByTestId("error")).not.toHaveTextContent("no-error");

      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId("error")).toHaveTextContent("no-error");
      jest.useRealTimers();
    });
  });

  describe("Navigation", () => {
    test("should navigate to comparison page with 2+ phones", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Add 2 phones
      await user.click(screen.getByTestId("add-phone-1"));
      await user.click(screen.getByTestId("add-phone-2"));

      // Navigate to comparison
      await user.click(screen.getByTestId("navigate-to-comparison"));

      expect(mockNavigate).toHaveBeenCalledWith("/compare/1-2");
      // Should clear comparison after navigation
      await waitFor(() => {
        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
      });
    });

    test("should show error when trying to navigate with less than 2 phones", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Add only 1 phone
      await user.click(screen.getByTestId("add-phone-1"));

      // Try to navigate
      await user.click(screen.getByTestId("navigate-to-comparison"));

      expect(screen.getByTestId("error")).toHaveTextContent(
        "At least 2 phones are required for comparison"
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("localStorage Integration", () => {
    test("should load phones from localStorage on mount", () => {
      const storedData = {
        phones: [mockPhone1, mockPhone2],
        timestamp: Date.now(),
        version: "1.0",
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      renderWithProvider();

      expect(screen.getByTestId("selected-count")).toHaveTextContent("2");
      expect(screen.getByTestId("selected-phone-1")).toHaveTextContent(
        "iPhone 15"
      );
      expect(screen.getByTestId("selected-phone-2")).toHaveTextContent(
        "Galaxy S24"
      );
    });

    test("should handle corrupted localStorage data", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid json");

      renderWithProvider();

      expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "epick_comparison_selection"
      );
    });

    test("should handle version mismatch in localStorage", () => {
      const storedData = {
        phones: [mockPhone1],
        timestamp: Date.now(),
        version: "0.9", // Old version
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      renderWithProvider();

      expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "epick_comparison_selection"
      );
    });

    test("should filter out invalid phone data from localStorage", () => {
      const storedData = {
        phones: [
          mockPhone1,
          { id: "invalid", name: 123 }, // Invalid phone data
          mockPhone2,
        ],
        timestamp: Date.now(),
        version: "1.0",
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      renderWithProvider();

      // Should only load valid phones
      expect(screen.getByTestId("selected-count")).toHaveTextContent("2");
      expect(screen.getByTestId("selected-phone-1")).toHaveTextContent(
        "iPhone 15"
      );
      expect(screen.getByTestId("selected-phone-2")).toHaveTextContent(
        "Galaxy S24"
      );
    });
  });

  describe("Invalid Phone Data", () => {
    test("should reject phone with invalid data structure", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      const invalidPhone = { id: "not-number", name: 123 } as any;

      // We need to test this through the context directly since our test component
      // uses predefined valid phones
      const { addPhone } = useComparison();
      act(() => {
        addPhone(invalidPhone);
      });

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Invalid phone data provided"
      );
      expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
    });
  });
});
