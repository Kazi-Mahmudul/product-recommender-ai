/// <reference path="../../types/global.d.ts" />

import { renderHook } from "@testing-library/react";
import {
  useIntersectionObserver,
  useIntersectionObserverOnce,
} from "../useIntersectionObserver";

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

// Create a proper mock implementation that stores the callback and options
const mockIntersectionObserver = jest
  .fn()
  .mockImplementation((callback, options) => {
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
      // Store these for test access
      callback,
      options,
    };
  });

describe("useIntersectionObserver Hooks", () => {
  const originalIntersectionObserver = global.IntersectionObserver;

  beforeEach(() => {
    // Setup mock IntersectionObserver
    global.IntersectionObserver = mockIntersectionObserver as any;
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    mockDisconnect.mockClear();
    mockIntersectionObserver.mockClear();

    // Create a mock instance that can be accessed in tests
    mockIntersectionObserver.mockImplementation((callback, options) => {
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
        callback,
        options,
      };
    });
  });

  afterEach(() => {
    // Restore original IntersectionObserver
    global.IntersectionObserver = originalIntersectionObserver;
  });

  describe("useIntersectionObserver", () => {
    test("should initialize with default values", () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(result.current.isIntersecting).toBe(false);
      expect(result.current.entry).toBeNull();
      expect(result.current.ref.current).toBeNull();
    });

    test("should create IntersectionObserver with default options", () => {
      const { result } = renderHook(() => useIntersectionObserver());

      // Simulate setting the ref to trigger the effect
      const element = document.createElement("div");
      Object.defineProperty(result.current.ref, "current", {
        value: element,
        writable: true,
      });

      // Manually trigger the effect by calling observe
      mockObserve(element);

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { root: null, rootMargin: "0px", threshold: 0 }
      );
    });

    test("should create IntersectionObserver with custom options", () => {
      const options = {
        root: document.createElement("div"),
        rootMargin: "10px",
        threshold: 0.5,
      };

      const { result } = renderHook(() => useIntersectionObserver(options));

      // Simulate setting the ref to trigger the effect
      const element = document.createElement("div");
      Object.defineProperty(result.current.ref, "current", {
        value: element,
        writable: true,
      });

      // Manually trigger the effect by calling observe
      mockObserve(element);

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        options
      );
    });

    test("should observe the element when ref is set", () => {
      const { result } = renderHook(() => useIntersectionObserver());

      // Simulate setting the ref
      const element = document.createElement("div");
      result.current.ref.current = element;

      // Verify observe was called
      expect(mockObserve).toHaveBeenCalled();

      // Get the callback that was passed to IntersectionObserver
      const callback = mockIntersectionObserver.mock
        .calls[0][0] as unknown as IntersectionObserverCallback;

      // Manually trigger the callback with a mock entry
      callback(
        [
          {
            isIntersecting: true,
            target: element,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRatio: 1,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: 0,
          },
        ],
        {} as IntersectionObserver
      );

      // Check that isIntersecting was updated
      expect(result.current.isIntersecting).toBe(true);
    });

    test("should disconnect observer on unmount", () => {
      const { result, unmount } = renderHook(() => useIntersectionObserver());

      // Simulate setting the ref to trigger the effect
      const element = document.createElement("div");
      Object.defineProperty(result.current.ref, "current", {
        value: element,
        writable: true,
      });

      // Manually trigger the effect by calling observe
      mockObserve(element);

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    test("should update state when intersection changes", () => {
      const { result } = renderHook(() => useIntersectionObserver());

      // Simulate setting the ref to trigger the effect
      const element = document.createElement("div");
      Object.defineProperty(result.current.ref, "current", {
        value: element,
        writable: true,
      });

      // Manually trigger the effect by calling observe
      mockObserve(element);

      // Get the callback that was passed to IntersectionObserver
      const callback = mockIntersectionObserver.mock
        .calls[0][0] as unknown as IntersectionObserverCallback;

      // Simulate intersection event
      const mockEntry = {
        isIntersecting: true,
        target: element,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      };
      callback([mockEntry], {} as IntersectionObserver);

      // Check that state was updated
      expect(result.current.isIntersecting).toBe(true);
      expect(result.current.entry).toEqual(mockEntry);
    });
  });

  describe("useIntersectionObserverOnce", () => {
    test("should initialize with default values", () => {
      const { result } = renderHook(() => useIntersectionObserverOnce());

      expect(result.current.isIntersecting).toBe(false);
      expect(result.current.entry).toBeNull();
      expect(result.current.ref.current).toBeNull();
    });

    test("should disconnect observer after first intersection when triggerOnce is true", () => {
      const { result } = renderHook(() =>
        useIntersectionObserverOnce({}, true)
      );

      // Simulate setting the ref to trigger the effect
      const element = document.createElement("div");
      Object.defineProperty(result.current.ref, "current", {
        value: element,
        writable: true,
      });

      // Manually trigger the effect by calling observe
      mockObserve(element);

      // Get the callback that was passed to IntersectionObserver
      const callback = mockIntersectionObserver.mock
        .calls[0][0] as unknown as IntersectionObserverCallback;

      // Simulate intersection event
      const mockEntry = {
        isIntersecting: true,
        target: element,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      };
      callback([mockEntry], {} as IntersectionObserver);

      // Check that state was updated and observer was disconnected
      expect(result.current.isIntersecting).toBe(true);
      expect(mockDisconnect).toHaveBeenCalled();
    });

    test("should not disconnect observer after intersection when triggerOnce is false", () => {
      const { result } = renderHook(() =>
        useIntersectionObserverOnce({}, false)
      );

      // Simulate setting the ref to trigger the effect
      const element = document.createElement("div");
      Object.defineProperty(result.current.ref, "current", {
        value: element,
        writable: true,
      });

      // Manually trigger the effect by calling observe
      mockObserve(element);

      // Get the callback that was passed to IntersectionObserver
      const callback = mockIntersectionObserver.mock
        .calls[0][0] as unknown as IntersectionObserverCallback;

      // Simulate intersection event
      const mockEntry = {
        isIntersecting: true,
        target: element,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: 1,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: 0,
      };
      callback([mockEntry], {} as IntersectionObserver);

      // Check that state was updated but observer was not disconnected
      expect(result.current.isIntersecting).toBe(true);
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });
});
