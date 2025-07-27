/**
 * Test to verify infinite loop fix
 */

import { render, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ComparePage from "../pages/ComparePage";

// Mock the dependencies
jest.mock("../api/phones", () => ({
  fetchPhonesByIds: jest.fn().mockResolvedValue([
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
  ]),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("../hooks/useAIVerdict", () => ({
  useAIVerdict: jest.fn(),
}));

describe("Infinite Loop Fix", () => {
  const {
    useParams,
    useNavigate,
    useSearchParams,
  } = require("react-router-dom");
  const { useAIVerdict } = require("../hooks/useAIVerdict");

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    useParams.mockReturnValue({ phoneIds: "1-2" });
    useNavigate.mockReturnValue(jest.fn());
    useSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);
    useAIVerdict.mockReturnValue([
      { verdict: null, isLoading: false, error: null },
      { generateVerdict: jest.fn(), clearVerdict: jest.fn(), retry: jest.fn() },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should not cause infinite loop when rendering with phone IDs", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      // Fast-forward timers to trigger any potential loops
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    }).not.toThrow();

    // Should not have any "Maximum update depth exceeded" errors
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Maximum update depth exceeded")
    );

    consoleSpy.mockRestore();
  });

  it("should handle URL changes without infinite loops", async () => {
    const { rerender } = render(
      <BrowserRouter>
        <ComparePage />
      </BrowserRouter>
    );

    // Change URL params
    useParams.mockReturnValue({ phoneIds: "3-4" });

    expect(() => {
      rerender(
        <BrowserRouter>
          <ComparePage />
        </BrowserRouter>
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }).not.toThrow();
  });
});
