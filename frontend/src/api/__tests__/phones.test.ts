/**
 * Unit tests for phones API functions
 */

import { fetchPhonesByIds } from "../phones";

// Mock the retry service
jest.mock("../../services/retryService", () => ({
  retryService: {
    executeWithRetry: jest.fn(),
  },
}));

// Mock fetchPhoneById
jest.mock("../phones", () => ({
  ...jest.requireActual("../phones"),
  fetchPhoneById: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe("fetchPhonesByIds", () => {
  const mockPhones = [
    {
      id: 1,
      name: "Phone 1",
      brand: "Brand A",
      model: "Model 1",
      price: "$100",
      url: "/phone1",
    },
    {
      id: 2,
      name: "Phone 2",
      brand: "Brand B",
      model: "Model 2",
      price: "$200",
      url: "/phone2",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it("should return empty array for empty phone IDs", async () => {
    const result = await fetchPhonesByIds([]);
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should fetch phones successfully from bulk endpoint", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockImplementation(
      async (operation: () => Promise<any>) => {
        return await operation();
      }
    );

    // Mock the new bulk endpoint response format
    const bulkResponse = {
      phones: mockPhones,
      not_found: [],
      total_requested: 2,
      total_found: 2,
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => bulkResponse,
    });

    const result = await fetchPhonesByIds([1, 2]);

    expect(result).toEqual(mockPhones);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/phones/bulk?ids=1,2"),
      expect.objectContaining({ signal: undefined })
    );
  });

  it("should handle AbortSignal correctly", async () => {
    const controller = new AbortController();
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockImplementation(
      async (operation: () => Promise<any>, _signal?: AbortSignal) => {
        return await operation();
      }
    );

    // Mock the new bulk endpoint response format
    const bulkResponse = {
      phones: mockPhones,
      not_found: [],
      total_requested: 2,
      total_found: 2,
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => bulkResponse,
    });

    await fetchPhonesByIds([1, 2], controller.signal);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/phones/bulk?ids=1,2"),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it("should handle already aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockImplementation(
      async (operation: () => Promise<any>) => {
        return await operation();
      }
    );

    await expect(fetchPhonesByIds([1, 2], controller.signal)).rejects.toThrow(
      "Request aborted"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should fallback to individual fetches when bulk endpoint returns 404", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockImplementation(
      async (operation: () => Promise<any>) => {
        return await operation();
      }
    );

    // Mock bulk endpoint returning 404
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    // Mock individual phone fetches for fetchPhoneById
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhones[0],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhones[1],
      });

    const result = await fetchPhonesByIds([1, 2]);

    expect(result).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(3); // Bulk endpoint + 2 individual calls
  });

  it("should handle HTTP 429 with retry-after header", async () => {
    const { retryService } = require("../../services/retryService");

    let capturedError: any;
    retryService.executeWithRetry.mockRejectedValue(
      new Error("All retries failed")
    );

    const mockResponse = {
      ok: false,
      status: 429,
      headers: {
        get: jest.fn().mockReturnValue("60"),
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    // Mock individual phone fetches to also fail
    (fetch as jest.Mock).mockRejectedValue(
      new Error("Individual fetch failed")
    );

    await expect(fetchPhonesByIds([1, 2])).rejects.toThrow(
      "Failed to fetch phone data after all retry attempts"
    );
    expect(retryService.executeWithRetry).toHaveBeenCalled();
  });

  it("should handle network errors", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockRejectedValue(
      new Error("All retries failed")
    );

    const networkError = new TypeError("Failed to fetch");
    (fetch as jest.Mock).mockRejectedValueOnce(networkError);

    // Mock individual phone fetches to also fail
    (fetch as jest.Mock).mockRejectedValue(
      new Error("Individual fetch failed")
    );

    await expect(fetchPhonesByIds([1, 2])).rejects.toThrow(
      "Failed to fetch phone data after all retry attempts"
    );
    expect(retryService.executeWithRetry).toHaveBeenCalled();
  });

  it("should handle insufficient resources error", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockRejectedValue(
      new Error("All retries failed")
    );

    const resourceError = new Error("net::ERR_INSUFFICIENT_RESOURCES");
    (fetch as jest.Mock).mockRejectedValueOnce(resourceError);

    // Mock individual phone fetches to also fail
    (fetch as jest.Mock).mockRejectedValue(
      new Error("Individual fetch failed")
    );

    await expect(fetchPhonesByIds([1, 2])).rejects.toThrow(
      "Failed to fetch phone data after all retry attempts"
    );
    expect(retryService.executeWithRetry).toHaveBeenCalled();
  });

  it("should validate response format", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockRejectedValue(
      new Error("All retries failed")
    );

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: "format" }), // Missing phones array
    });

    // Mock individual phone fetches to also fail
    (fetch as jest.Mock).mockRejectedValue(
      new Error("Individual fetch failed")
    );

    await expect(fetchPhonesByIds([1, 2])).rejects.toThrow(
      "Failed to fetch phone data after all retry attempts"
    );
  });

  it("should use fallback for unknown errors", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockImplementation(
      async (operation: () => Promise<any>) => {
        return await operation();
      }
    );

    const unknownError = new Error("Unknown error");
    (fetch as jest.Mock).mockRejectedValueOnce(unknownError);

    // Mock individual phone fetches for fallback
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhones[0],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhones[1],
      });

    const result = await fetchPhonesByIds([1, 2]);
    expect(result).toHaveLength(2);
  });

  it("should handle retry service failure with fallback", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockRejectedValue(
      new Error("All retries failed")
    );

    // Mock individual phone fetches for fallback
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhones[0],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhones[1],
      });

    const result = await fetchPhonesByIds([1, 2]);
    expect(result).toHaveLength(2);
  });

  it("should throw error when all attempts fail", async () => {
    const { retryService } = require("../../services/retryService");

    retryService.executeWithRetry.mockRejectedValue(
      new Error("All retries failed")
    );

    // Mock individual phone fetches to also fail
    (fetch as jest.Mock).mockRejectedValue(
      new Error("Individual fetch failed")
    );

    await expect(fetchPhonesByIds([1, 2])).rejects.toThrow(
      "Failed to fetch phone data after all retry attempts"
    );
  });
});
