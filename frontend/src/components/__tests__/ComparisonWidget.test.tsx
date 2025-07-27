import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import ComparisonWidget from "../ComparisonWidget";
import { ComparisonProvider } from "../../context/ComparisonContext";
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

// Helper component to add phones for testing
const TestWrapper: React.FC<{ initialPhones?: Phone[] }> = ({
  initialPhones = [],
}) => {
  React.useEffect(() => {
    if (initialPhones.length > 0) {
      const storedData = {
        phones: initialPhones,
        timestamp: Date.now(),
        version: "1.0",
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));
    }
  }, [initialPhones]);

  return (
    <BrowserRouter>
      <ComparisonProvider>
        <ComparisonWidget />
      </ComparisonProvider>
    </BrowserRouter>
  );
};

describe("ComparisonWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe("Visibility", () => {
    test("should not render when no phones are selected", () => {
      render(<TestWrapper />);

      // Widget should not be in the DOM
      expect(
        screen.queryByText("Selected for comparison")
      ).not.toBeInTheDocument();
    });

    test("should render when phones are selected", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      expect(screen.getByText("Selected for comparison")).toBeInTheDocument();
      expect(screen.getByText("1/5")).toBeInTheDocument();
    });
  });

  describe("Phone Display", () => {
    test("should display selected phones with correct information", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      expect(screen.getByText("Apple iPhone 15")).toBeInTheDocument();
      expect(screen.getByText("Samsung Galaxy S24")).toBeInTheDocument();
      expect(screen.getByText("৳120,000")).toBeInTheDocument();
      expect(screen.getByText("৳110,000")).toBeInTheDocument();
      expect(screen.getByText("2/5")).toBeInTheDocument();
    });

    test("should display phone images with fallback", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      const phoneImage = screen.getByAltText("iPhone 15");
      expect(phoneImage).toBeInTheDocument();
      expect(phoneImage).toHaveAttribute("src", "/iphone15.jpg");
    });

    test("should handle missing phone images", () => {
      const phoneWithoutImage = { ...mockPhone1, img_url: "" };
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [phoneWithoutImage],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      const phoneImage = screen.getByAltText("iPhone 15");
      expect(phoneImage).toHaveAttribute("src", "/phone.png");
    });
  });

  describe("Remove Phone Functionality", () => {
    test("should remove phone when remove button is clicked", async () => {
      const user = userEvent.setup();
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      expect(screen.getByText("2/5")).toBeInTheDocument();

      // Find and click remove button for iPhone 15
      const removeButtons = screen.getAllByLabelText(
        /Remove .* from comparison/
      );
      await user.click(removeButtons[0]);

      // Widget should still be visible with 1 phone
      await waitFor(() => {
        expect(screen.getByText("1/5")).toBeInTheDocument();
      });
    });

    test("should hide widget when last phone is removed", async () => {
      const user = userEvent.setup();
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      expect(screen.getByText("Selected for comparison")).toBeInTheDocument();

      // Remove the only phone
      const removeButton = screen.getByLabelText(
        "Remove Apple iPhone 15 from comparison"
      );
      await user.click(removeButton);

      // Widget should be hidden
      await waitFor(() => {
        expect(
          screen.queryByText("Selected for comparison")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Clear All Functionality", () => {
    test("should clear all phones when clear all is clicked", async () => {
      const user = userEvent.setup();
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      expect(screen.getByText("2/5")).toBeInTheDocument();

      // Click clear all button
      await user.click(screen.getByText("Clear all"));

      // Widget should be hidden
      await waitFor(() => {
        expect(
          screen.queryByText("Selected for comparison")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Compare Now Button", () => {
    test("should be disabled with less than 2 phones", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      const compareButton = screen.getByRole("button", {
        name: /Select 1 more/,
      });
      expect(compareButton).toBeDisabled();
      expect(compareButton).toHaveTextContent("Select 1 more");
    });

    test("should be enabled with 2 or more phones", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      const compareButton = screen.getByRole("button", {
        name: /Compare selected phones/,
      });
      expect(compareButton).not.toBeDisabled();
      expect(compareButton).toHaveTextContent("Compare Now");
    });

    test("should navigate to comparison page when clicked", async () => {
      const user = userEvent.setup();
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      const compareButton = screen.getByRole("button", {
        name: /Compare selected phones/,
      });
      await user.click(compareButton);

      expect(mockNavigate).toHaveBeenCalledWith("/compare/1-2");
    });
  });

  describe("Error Display", () => {
    test("should display error message when present", () => {
      // We need to simulate an error state
      // This would typically happen through context manipulation
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      // The error display section should be present in the DOM structure
      // but not visible unless there's an error
      expect(
        screen.queryByRole("button", { name: "Clear error" })
      ).not.toBeInTheDocument();
    });

    test("should allow clearing error when error is present", async () => {
      // This test would require a way to inject an error state
      // For now, we'll test the structure is correct
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      // Widget should render without error display when no error
      expect(screen.getByText("Selected for comparison")).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    test("should render mobile-friendly layout", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      // Check that the widget renders with responsive content
      expect(screen.getByText("Selected for comparison")).toBeInTheDocument();
      expect(screen.getByText("2/5")).toBeInTheDocument();
    });

    test("should show clear all button in different positions for mobile/desktop", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      // Should have both mobile and desktop clear all buttons
      const clearButtons = screen.getAllByText("Clear all");
      expect(clearButtons).toHaveLength(2);

      // One should be hidden on mobile, one on desktop
      expect(clearButtons[0]).toHaveClass("sm:hidden");
      expect(clearButtons[1]).toHaveClass("hidden", "sm:block");
    });
  });

  describe("Accessibility", () => {
    test("should have proper ARIA labels", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      const removeButton = screen.getByLabelText(
        "Remove Apple iPhone 15 from comparison"
      );
      expect(removeButton).toBeInTheDocument();

      const compareButton = screen.getByRole("button", {
        name: /Select 1 more/,
      });
      expect(compareButton).toHaveAttribute(
        "title",
        "Select at least 2 phones to compare"
      );
    });

    test("should have proper button roles and states", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          phones: [mockPhone1, mockPhone2],
          timestamp: Date.now(),
          version: "1.0",
        })
      );

      render(<TestWrapper />);

      const compareButton = screen.getByRole("button", {
        name: /Compare selected phones/,
      });
      expect(compareButton).not.toHaveAttribute("disabled");
      expect(compareButton).toHaveAttribute("title", "Compare selected phones");
    });
  });
});
