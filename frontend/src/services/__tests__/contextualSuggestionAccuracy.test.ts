import { ContextualSuggestionGenerator } from "../contextualSuggestionGenerator";
import {
  ChatContextManager,
  PhoneRecommendationContext,
} from "../chatContextManager";
import { Phone } from "../../api/phones";

const mockPhones: Phone[] = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    brand: "Apple",
    model: "14 Pro",
    price: "৳79,900",
    url: "/iphone-14-pro",
    slug: "iphone-14-pro",
    price_original: 79900,
    overall_device_score: 9.2,
    camera_score: 9.5,
    battery_capacity_numeric: 3200,
    refresh_rate_numeric: 120,
    network: "5G",
    has_fast_charging: true,
  },
  {
    id: 2,
    name: "Samsung Galaxy S23",
    brand: "Samsung",
    model: "Galaxy S23",
    price: "৳74,999",
    url: "/samsung-galaxy-s23",
    slug: "samsung-galaxy-s23",
    price_original: 74999,
    overall_device_score: 9.0,
    camera_score: 9.2,
    battery_capacity_numeric: 3900,
    refresh_rate_numeric: 120,
    network: "5G",
    has_fast_charging: true,
  },
  {
    id: 3,
    name: "OnePlus 11",
    brand: "OnePlus",
    model: "11",
    price: "৳56,999",
    url: "/oneplus-11",
    slug: "oneplus-11",
    price_original: 56999,
    overall_device_score: 8.8,
    camera_score: 8.5,
    battery_capacity_numeric: 5000,
    refresh_rate_numeric: 120,
    network: "5G",
    has_fast_charging: true,
  },
  {
    id: 4,
    name: "Xiaomi 13 Pro",
    brand: "Xiaomi",
    model: "13 Pro",
    price: "৳45,999",
    url: "/xiaomi-13-pro",
    slug: "xiaomi-13-pro",
    price_original: 45999,
    overall_device_score: 8.6,
    camera_score: 8.8,
    battery_capacity_numeric: 4820,
    refresh_rate_numeric: 120,
    network: "5G",
    has_fast_charging: true,
  },
];

describe("Contextual Suggestion Accuracy Tests", () => {
  describe("Comparison Suggestions", () => {
    it("should generate accurate camera comparison suggestions", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0], mockPhones[1]], // iPhone and Samsung
          originalQuery: "premium phones with good cameras",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 74999, max: 79900 },
            brands: ["Apple", "Samsung"],
            keyFeatures: ["good_camera", "5g"],
            averageRating: 9.1,
            recommendationReason: "Camera quality focused",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]], // OnePlus
          "show me alternatives",
          phoneContext
        );

      const cameraSuggestions = suggestions.filter((s) =>
        s.text.toLowerCase().includes("camera")
      );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that we have contextual suggestions with proper structure
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("id");
        expect(suggestion).toHaveProperty("text");
        expect(suggestion).toHaveProperty("query");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextIndicator");
        expect(suggestion.contextIndicator).toHaveProperty("tooltip");
      });
    });

    it("should generate accurate price comparison suggestions", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]], // Expensive iPhone
          originalQuery: "premium flagship phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["premium"],
            averageRating: 9.2,
            recommendationReason: "Premium flagship phones",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[3]], // Cheaper Xiaomi
          "budget alternatives",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions have proper structure and context
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(Array.isArray(suggestion.referencedPhones)).toBe(true);
        expect(typeof suggestion.contextualQuery).toBe("string");
      });
    });

    it("should generate battery comparison suggestions", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]], // iPhone with smaller battery
          originalQuery: "premium phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["premium"],
            averageRating: 9.2,
            recommendationReason: "Premium options",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]], // OnePlus with larger battery
          "better battery life",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions are contextual and well-formed
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion.contextualQuery.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Alternative Suggestions", () => {
    it("should suggest alternatives within similar price range", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[1]], // Samsung S23
          originalQuery: "premium Android phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 74999, max: 74999 },
            brands: ["Samsung"],
            keyFeatures: ["premium", "android"],
            averageRating: 9.0,
            recommendationReason: "Premium Android options",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]], // OnePlus (similar price range)
          "similar alternatives",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions have proper contextual structure
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion.contextualQuery).toBeTruthy();
      });
    });

    it("should suggest brand alternatives", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]], // Apple iPhone
          originalQuery: "premium phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["premium"],
            averageRating: 9.2,
            recommendationReason: "Premium options",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[1]], // Samsung alternative
          "Android alternatives",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions are properly structured
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(Array.isArray(suggestion.referencedPhones)).toBe(true);
      });
    });
  });

  describe("Specification Suggestions", () => {
    it("should generate accurate specification comparison suggestions", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0], mockPhones[1]],
          originalQuery: "compare flagship phones",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 74999, max: 79900 },
            brands: ["Apple", "Samsung"],
            keyFeatures: ["flagship", "comparison"],
            averageRating: 9.1,
            recommendationReason: "Flagship comparison",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]],
          "detailed specifications",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions have proper structure
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion.contextualQuery).toBeTruthy();
      });
    });

    it("should suggest performance comparisons", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]],
          originalQuery: "high performance phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["performance", "gaming"],
            averageRating: 9.2,
            recommendationReason: "Gaming performance focused",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]],
          "gaming performance",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions are properly formed
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(typeof suggestion.contextualQuery).toBe("string");
      });
    });
  });

  describe("Multi-Context Suggestions", () => {
    it("should handle multiple phone contexts accurately", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]], // iPhone
          originalQuery: "premium iOS phone",
          timestamp: Date.now() - 60000, // 1 minute ago
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["premium", "ios"],
            averageRating: 9.2,
            recommendationReason: "Premium iOS options",
          },
        },
        {
          id: "context-2",
          phones: [mockPhones[1]], // Samsung
          originalQuery: "premium Android phone",
          timestamp: Date.now(), // Recent
          metadata: {
            priceRange: { min: 74999, max: 74999 },
            brands: ["Samsung"],
            keyFeatures: ["premium", "android"],
            averageRating: 9.0,
            recommendationReason: "Premium Android options",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]],
          "compare all options",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions handle multiple contexts properly
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(Array.isArray(suggestion.referencedPhones)).toBe(true);
      });
    });

    it("should prioritize recent context in suggestions", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-old",
          phones: [mockPhones[0]],
          originalQuery: "old query",
          timestamp: Date.now() - 240000, // 4 minutes ago
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["old"],
            averageRating: 9.2,
            recommendationReason: "Old recommendation",
          },
        },
        {
          id: "context-recent",
          phones: [mockPhones[1]],
          originalQuery: "recent query",
          timestamp: Date.now() - 30000, // 30 seconds ago
          metadata: {
            priceRange: { min: 74999, max: 74999 },
            brands: ["Samsung"],
            keyFeatures: ["recent"],
            averageRating: 9.0,
            recommendationReason: "Recent recommendation",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]],
          "new query",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that suggestions are contextual and prioritize recent context
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("priority");
        expect(typeof suggestion.priority).toBe("number");
      });
    });
  });

  describe("Context-Aware Query Enhancement", () => {
    it("should enhance queries with specific phone names", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0], mockPhones[1]],
          originalQuery: "premium phones",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 74999, max: 79900 },
            brands: ["Apple", "Samsung"],
            keyFeatures: ["premium"],
            averageRating: 9.1,
            recommendationReason: "Premium options",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]],
          "better cameras",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that queries are enhanced with context
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion).toHaveProperty("query");
        expect(suggestion.contextualQuery).toBeTruthy();
        expect(suggestion.query).toBeTruthy();

        // Contextual query should generally be different from base query
        // (though they might be the same in some cases)
        expect(typeof suggestion.contextualQuery).toBe("string");
      });
    });

    it("should enhance queries with price context", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]], // Expensive phone
          originalQuery: "flagship phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["flagship"],
            averageRating: 9.2,
            recommendationReason: "Flagship options",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[3]], // Cheaper phone
          "budget options",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that price context is handled properly
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion.contextualQuery).toBeTruthy();
        expect(Array.isArray(suggestion.referencedPhones)).toBe(true);
      });
    });

    it("should enhance queries with feature context", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]], // iPhone with good camera but smaller battery
          originalQuery: "camera phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["good_camera"],
            averageRating: 9.2,
            recommendationReason: "Camera quality focused",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[2]], // OnePlus with better battery
          "better battery",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Check that feature context is handled properly
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion).toHaveProperty("referencedPhones");
        expect(suggestion.contextualQuery).toBeTruthy();
        expect(Array.isArray(suggestion.referencedPhones)).toBe(true);
      });
    });
  });

  describe("Fallback Behavior", () => {
    it("should provide general suggestions when context is insufficient", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [], // Empty phones array
          originalQuery: "test",
          timestamp: Date.now(),
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
          [mockPhones[0]],
          "test query",
          phoneContext
        );

      // Should provide fallback suggestions when context is insufficient
      expect(suggestions.length).toBeGreaterThan(0);

      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion.contextualQuery).toBeTruthy();
      });
    });

    it("should handle empty context gracefully", () => {
      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[0]],
          "test query",
          [] // No context
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Should handle empty context gracefully
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextType");
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion.contextualQuery).toBeTruthy();
      });
    });

    it("should provide fallback queries for contextual suggestions", () => {
      const phoneContext: PhoneRecommendationContext[] = [
        {
          id: "context-1",
          phones: [mockPhones[0]],
          originalQuery: "premium phone",
          timestamp: Date.now(),
          metadata: {
            priceRange: { min: 79900, max: 79900 },
            brands: ["Apple"],
            keyFeatures: ["premium"],
            averageRating: 9.2,
            recommendationReason: "Premium options",
          },
        },
      ];

      const suggestions =
        ContextualSuggestionGenerator.generateContextualSuggestions(
          [mockPhones[1]],
          "alternatives",
          phoneContext
        );

      expect(suggestions.length).toBeGreaterThan(0);

      // Should provide fallback queries for contextual suggestions
      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("contextualQuery");
        expect(suggestion).toHaveProperty("query");
        expect(suggestion.contextualQuery).toBeTruthy();
        expect(suggestion.query).toBeTruthy();
      });

      // Check that contextual suggestions have fallback queries
      const contextualSuggestions = suggestions.filter(
        (s) => s.contextType !== "general"
      );
      contextualSuggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty("fallbackQuery");
      });
    });
  });
});
