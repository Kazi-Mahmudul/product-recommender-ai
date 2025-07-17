import { renderHook } from '@testing-library/react';
import { useIntersectionObserver, useIntersectionObserverOnce } from '../useIntersectionObserver';

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const mockIntersectionObserver = jest.fn(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
}));

describe('useIntersectionObserver Hooks', () => {
  const originalIntersectionObserver = global.IntersectionObserver;
  
  beforeEach(() => {
    // Setup mock IntersectionObserver
    global.IntersectionObserver = mockIntersectionObserver;
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    mockIntersectionObserver.mockClear();
  });
  
  afterEach(() => {
    // Restore original IntersectionObserver
    global.IntersectionObserver = originalIntersectionObserver;
  });
  
  describe('useIntersectionObserver', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useIntersectionObserver());
      
      expect(result.current.isIntersecting).toBe(false);
      expect(result.current.entry).toBeNull();
      expect(result.current.ref.current).toBeNull();
    });
    
    test('should create IntersectionObserver with default options', () => {
      renderHook(() => useIntersectionObserver());
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { root: null, rootMargin: '0px', threshold: 0 }
      );
    });
    
    test('should create IntersectionObserver with custom options', () => {
      const options = {
        root: document.createElement('div'),
        rootMargin: '10px',
        threshold: 0.5
      };
      
      renderHook(() => useIntersectionObserver(options));
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        options
      );
    });
    
    test('should observe the element when ref is set', () => {
      const { result } = renderHook(() => useIntersectionObserver());
      
      // Simulate setting the ref
      const element = document.createElement('div');
      result.current.ref.current = element;
      
      // Manually trigger the effect that would observe the element
      // This is a bit of a hack since we can't directly trigger effects
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);
      
      // Check that isIntersecting was updated
      expect(result.current.isIntersecting).toBe(true);
    });
    
    test('should disconnect observer on unmount', () => {
      const { unmount } = renderHook(() => useIntersectionObserver());
      
      unmount();
      
      expect(mockDisconnect).toHaveBeenCalled();
    });
    
    test('should update state when intersection changes', () => {
      const { result } = renderHook(() => useIntersectionObserver());
      
      // Get the callback passed to IntersectionObserver
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      
      // Simulate intersection event
      const mockEntry = { isIntersecting: true, target: document.createElement('div') };
      observerCallback([mockEntry]);
      
      // Check that state was updated
      expect(result.current.isIntersecting).toBe(true);
      expect(result.current.entry).toEqual(mockEntry);
    });
  });
  
  describe('useIntersectionObserverOnce', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useIntersectionObserverOnce());
      
      expect(result.current.isIntersecting).toBe(false);
      expect(result.current.entry).toBeNull();
      expect(result.current.ref.current).toBeNull();
    });
    
    test('should disconnect observer after first intersection when triggerOnce is true', () => {
      const { result } = renderHook(() => useIntersectionObserverOnce({}, true));
      
      // Get the callback passed to IntersectionObserver
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      
      // Simulate intersection event
      const mockEntry = { isIntersecting: true, target: document.createElement('div') };
      observerCallback([mockEntry]);
      
      // Check that state was updated and observer was disconnected
      expect(result.current.isIntersecting).toBe(true);
      expect(mockDisconnect).toHaveBeenCalled();
    });
    
    test('should not disconnect observer after intersection when triggerOnce is false', () => {
      const { result } = renderHook(() => useIntersectionObserverOnce({}, false));
      
      // Get the callback passed to IntersectionObserver
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      
      // Simulate intersection event
      const mockEntry = { isIntersecting: true, target: document.createElement('div') };
      observerCallback([mockEntry]);
      
      // Check that state was updated but observer was not disconnected
      expect(result.current.isIntersecting).toBe(true);
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });
});