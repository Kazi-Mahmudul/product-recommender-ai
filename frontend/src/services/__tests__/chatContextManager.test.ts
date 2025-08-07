import { ChatContextManager, ChatContext } from "../chatContextManager";

describe("ChatContextManager", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear in-memory cache as well
    ChatContextManager.clearCache();
  });

  describe("updateWithMessage", () => {
    it("should update context with phone recommendations", () => {
      const initialContext: ChatContext = {
        sessionId: "test-session",
        currentRecommendations: [],
        userPreferences: {
          preferredBrands: [],
          importantFeatures: [],
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
        phoneRecommendations: [],
      };

      const message = {
        user: "Best phones under 30000",
        bot: "Here are some recommendations:",
        phones: [
          {
            id: 1,
            name: "Test Phone 1",
            brand: "TestBrand",
            model: "Model1",
            price: "৳25,000",
            price_original: 25000,
            url: "http://example.com/phone1",
          },
        ],
      };

      const updatedContext = ChatContextManager.updateWithMessage(
        initialContext,
        message
      );

      expect(updatedContext.conversationHistory).toHaveLength(1);
      expect(updatedContext.lastQuery).toBe("Best phones under 30000");
      expect(updatedContext.queryCount).toBe(1);
    });

    it("should extract user preferences from queries", () => {
      const initialContext: ChatContext = {
        sessionId: "test-session",
        currentRecommendations: [],
        userPreferences: {
          preferredBrands: [],
          importantFeatures: [],
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
        phoneRecommendations: [],
      };

      const message = {
        user: "I need a phone with good camera under 40000 BDT",
        bot: "Here are some camera phones:",
        phones: [],
      };

      const updatedContext = ChatContextManager.updateWithMessage(
        initialContext,
        message
      );

      expect(updatedContext.userPreferences.priceRange).toEqual([0, 40000]);
      expect(updatedContext.userPreferences.importantFeatures).toContain(
        "camera"
      );
    });
  });

  describe("getRecentPhoneContext", () => {
    it("should return recent phone recommendations within time window", () => {
      const context: ChatContext = {
        sessionId: "test-session",
        currentRecommendations: [],
        userPreferences: {
          preferredBrands: [],
          importantFeatures: [],
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
            originalQuery: "test query",
            phones: [
              {
                id: 1,
                name: "Test Phone",
                brand: "TestBrand",
                model: "Model1",
                price: "৳25,000",
                price_original: 25000,
                url: "http://example.com/phone1",
              },
            ],
            timestamp: Date.now() - 5000, // 5 seconds ago
            metadata: {
              priceRange: { min: 25000, max: 25000 },
              brands: ["TestBrand"],
              keyFeatures: [],
              averageRating: 0,
              recommendationReason: "Test recommendation",
            },
          },
        ],
      };

      const recentContext = ChatContextManager.getRecentPhoneContext(
        context,
        10000
      ); // 10 second window

      expect(recentContext).toHaveLength(1);
      expect(recentContext[0].phones).toHaveLength(1);
    });

    it("should filter out old recommendations outside time window", () => {
      const context: ChatContext = {
        sessionId: "test-session",
        currentRecommendations: [],
        userPreferences: {
          preferredBrands: [],
          importantFeatures: [],
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
            originalQuery: "old query",
            phones: [
              {
                id: 1,
                name: "Old Phone",
                brand: "TestBrand",
                model: "Model1",
                price: "৳25,000",
                price_original: 25000,
                url: "http://example.com/phone1",
              },
            ],
            timestamp: Date.now() - 15000, // 15 seconds ago
            metadata: {
              priceRange: { min: 25000, max: 25000 },
              brands: ["TestBrand"],
              keyFeatures: [],
              averageRating: 0,
              recommendationReason: "Old recommendation",
            },
          },
        ],
      };

      const recentContext = ChatContextManager.getRecentPhoneContext(
        context,
        10000
      ); // 10 second window

      expect(recentContext).toHaveLength(0);
    });
  });

  describe("loadContext and saveContext", () => {
    it("should save and load context from localStorage", () => {
      const context: ChatContext = {
        sessionId: "test-session",
        currentRecommendations: [],
        userPreferences: {
          priceRange: [0, 30000],
          preferredBrands: [],
          importantFeatures: [],
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
        phoneRecommendations: [],
      };

      ChatContextManager.saveContext(context);
      const loadedContext = ChatContextManager.loadContext();

      expect(loadedContext.sessionId).toBe("test-session");
      expect(loadedContext.userPreferences.priceRange).toEqual([0, 30000]);
    });

    it("should return default context when localStorage is empty", () => {
      const context = ChatContextManager.loadContext();

      expect(context.sessionId).toBeDefined();
      expect(context.userPreferences).toEqual({
        preferredBrands: [],
        importantFeatures: [],
      });
      expect(context.phoneRecommendations).toEqual([]);
      expect(context.conversationHistory).toEqual([]);
    });
  });
});
