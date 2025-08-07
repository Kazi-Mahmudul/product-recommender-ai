import { ContextualSuggestionGenerator } from "../contextualSuggestionGenerator";
import { ChatContext } from "../chatContextManager";

describe("ContextualSuggestionGenerator", () => {
  const mockContext: ChatContext = {
    sessionId: "test-session",
    currentRecommendations: [],
    userPreferences: {
      priceRange: [0, 30000],
      importantFeatures: ["camera", "battery"],
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
          {
            id: 2,
            name: "Xiaomi Redmi Note 12",
            brand: "Xiaomi",
            model: "Redmi Note 12",
            price: "৳25,000",
            price_original: 25000,
            url: "http://example.com/xiaomi-note12",
          },
        ],
        timestamp: Date.now() - 5000,
        metadata: {
          priceRange: { min: 25000, max: 28000 },
          brands: ["Samsung", "Xiaomi"],
          keyFeatures: ["good_camera"],
          averageRating: 8.5,
          recommendationReason: "Camera quality focused",
        },
      },
    ],
  };

  describe("generateContextualSuggestions", () => {
    it("should generate contextual suggestions based on recent phone recommendations", () => {
      const phones = mockContext.phoneRecommendations[0].phones;
      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          phones,
          "test query",
          mockContext.phoneRecommendations
        );

      expect(suggestions.length).toBeGreaterThan(0);

      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("id");
        expect(suggestion).toHaveProperty("text");
        expect(suggestion).toHaveProperty("query");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextIndicator");
      });
    });

    it("should return suggestions when no phone context available", () => {
      const phones = mockContext.phoneRecommendations[0].phones;
      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          phones,
          "test query",
          []
        );

      expect(suggestions.length).toBeGreaterThan(0);

      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("contextualQuery");
      });
    });
  });

  describe("enhanceQueryWithContext", () => {
    it("should enhance query with phone context", () => {
      const baseQuery = "better cameras";
      const enhancedQuery =
        ContextualSuggestionGenerator.enhanceQueryWithContext(
          baseQuery,
          mockContext.phoneRecommendations
        );

      expect(enhancedQuery).toBeTruthy();
      expect(typeof enhancedQuery).toBe("string");
      expect(enhancedQuery.length).toBeGreaterThan(baseQuery.length);
    });

    it("should return original query when no context available", () => {
      const baseQuery = "test query";
      const enhancedQuery =
        ContextualSuggestionGenerator.enhanceQueryWithContext(baseQuery, []);

      expect(enhancedQuery).toBe(baseQuery);
    });
  });

  describe("edge cases", () => {
    it("should handle empty phones array", () => {
      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [],
          "test query",
          mockContext.phoneRecommendations
        );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle invalid query", () => {
      const phones = mockContext.phoneRecommendations[0].phones;
      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          phones,
          "",
          mockContext.phoneRecommendations
        );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should handle invalid phone context", () => {
      const phones = mockContext.phoneRecommendations[0].phones;
      const invalidContext = [
        {
          id: "invalid",
          phones: [],
          originalQuery: "",
          timestamp: 0,
          metadata: {
            priceRange: { min: 0, max: 0 },
            brands: [],
            keyFeatures: [],
            averageRating: 0,
            recommendationReason: "",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          phones,
          "test query",
          invalidContext
        );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
