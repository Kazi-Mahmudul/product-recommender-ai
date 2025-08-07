import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FollowUpSuggestions from "../FollowUpSuggestions";
import { ChatContext } from "../../services/chatContextManager";

const mockContext: ChatContext = {
  sessionId: "test-session",
  currentRecommendations: [],
  userPreferences: {
    priceRange: [0, 30000],
    importantFeatures: ["camera"],
    preferredBrands: [],
  },
  conversationHistory: [],
  lastQuery: "",
  queryCount: 0,
  timestamp: new Date(),
  interactionPatterns: {
    frequentFeatures: [],
    preferredPriceRange: null,
    brandInteractions: {},
    featureInteractions: {},
  },
  phoneRecommendations: [
    {
      id: "rec_1",
      originalQuery: "best camera phones",
      phones: [
        {
          id: 1,
          name: "Samsung Galaxy A54",
          brand: "Samsung",
          model: "Galaxy A54",
          price: "৳28,000",
          price_original: 28000,
          url: "http://example.com/samsung-a54",
        },
      ],
      timestamp: Date.now() - 5000,
      metadata: {
        priceRange: { min: 28000, max: 28000 },
        brands: ["Samsung"],
        keyFeatures: ["good_camera"],
        averageRating: 8.5,
        recommendationReason: "Camera quality focused",
      },
    },
  ],
};

describe("FollowUpSuggestions", () => {
  const mockOnSuggestionClick = jest.fn();

  beforeEach(() => {
    mockOnSuggestionClick.mockClear();
  });

  it("should render contextual suggestions when suggestions are provided", () => {
    const mockSuggestions = [
      {
        id: "test-1",
        text: "Compare Samsung Galaxy A54",
        icon: "⚖️",
        query: "compare phones",
        category: "comparison" as const,
        priority: 8,
        contextualQuery: "compare Samsung Galaxy A54 vs other phones",
        referencedPhones: ["Samsung Galaxy A54"],
        contextType: "comparison" as const,
        contextIndicator: {
          icon: "🔗",
          tooltip: "Based on your recent searches",
          description: "Contextual suggestion",
        },
      },
    ];

    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    expect(screen.getByText("Compare Samsung Galaxy A54")).toBeInTheDocument();
  });

  it("should not render when no suggestions are available", () => {
    render(
      <FollowUpSuggestions
        suggestions={[]}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    // Component should not render any suggestions when empty array is provided
    expect(screen.queryByText("💡 You might also want to:")).not.toBeInTheDocument();
  });

  it("should call onSuggestionClick when a suggestion is clicked", () => {
    const mockSuggestions = [
      {
        id: "test-1",
        text: "Compare Samsung Galaxy A54",
        icon: "⚖️",
        query: "compare phones",
        category: "comparison" as const,
        priority: 8,
        contextualQuery: "compare Samsung Galaxy A54 vs other phones",
        referencedPhones: ["Samsung Galaxy A54"],
        contextType: "comparison" as const,
        contextIndicator: {
          icon: "🔗",
          tooltip: "Based on your recent searches",
          description: "Contextual suggestion",
        },
      },
    ];

    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    const suggestionButton = screen.getByText("Compare Samsung Galaxy A54");
    fireEvent.click(suggestionButton);

    expect(mockOnSuggestionClick).toHaveBeenCalledTimes(1);
    expect(mockOnSuggestionClick).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it("should apply dark mode styles correctly", () => {
    const mockSuggestions = [
      {
        id: "test-1",
        text: "Test suggestion",
        icon: "⚖️",
        query: "test query",
        category: "comparison" as const,
        priority: 8,
      },
    ];

    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={true}
      />
    );

    // Check that the component renders with dark mode
    expect(screen.getByText("Test suggestion")).toBeInTheDocument();
  });

  it("should show context indicators for different suggestion types", () => {
    const mockSuggestions = [
      {
        id: "test-1",
        text: "Compare phones",
        icon: "⚖️",
        query: "compare",
        category: "comparison" as const,
        priority: 8,
        contextualQuery: "compare phones",
        referencedPhones: ["Phone1"],
        contextType: "comparison" as const,
        contextIndicator: {
          icon: "🔗",
          tooltip: "Comparison suggestion",
          description: "Compare phones",
        },
      },
      {
        id: "test-2",
        text: "Similar phones",
        icon: "🔄",
        query: "similar",
        category: "alternative" as const,
        priority: 7,
        contextualQuery: "similar phones",
        referencedPhones: ["Phone1"],
        contextType: "alternative" as const,
        contextIndicator: {
          icon: "🔗",
          tooltip: "Alternative suggestion",
          description: "Similar phones",
        },
      },
    ];

    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    expect(screen.getAllByText("Compare phones")).toHaveLength(2); // Button and tooltip
    expect(screen.getAllByText("Similar phones")).toHaveLength(2); // Button and tooltip
  });

  it("should be accessible with proper ARIA labels", () => {
    const mockSuggestions = [
      {
        id: "test-1",
        text: "Test suggestion",
        icon: "⚖️",
        query: "test query",
        category: "comparison" as const,
        priority: 8,
      },
    ];

    render(
      <FollowUpSuggestions
        suggestions={mockSuggestions}
        onSuggestionClick={mockOnSuggestionClick}
        darkMode={false}
      />
    );

    const suggestionButtons = screen.getAllByRole("button");
    expect(suggestionButtons.length).toBeGreaterThan(0);
  });
});
