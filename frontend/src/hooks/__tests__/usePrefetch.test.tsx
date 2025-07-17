/// <reference path="../../types/global.d.ts" />

import { renderHook, act } from '@testing-library/react';
import { usePrefetch } from '../usePrefetch';
import { prefetchPhoneDetails } from '../../api/recommendations';
import { getCacheItem, getPhoneDetailsCacheKey } from '../../utils/cacheManager';

// Mock dependencies
jest.mock('../../api/recommendations');
jest.mock('../../utils/cacheManager');

const mockedPrefetchPhoneDetails = prefetchPhoneDetails as jest.MockedFunction<typeof prefetchPhoneDetails>;
const mockedGetCacheItem = getCacheItem as jest.MockedFunction<typeof getCacheItem>;
const mockedGetPhoneDetailsCacheKey = getPhoneDetailsCacheKey as jest.MockedFunction<typeof getPhoneDetailsCacheKey>;

describe('usePrefetch Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockedGetPhoneDetailsCacheKey.mockReturnValue('test-cache-key');
    mockedGetCacheItem.mockReturnValue(null);
    mockedPrefetchPhoneDetails.mockResolvedValue(Promise.resolve());
    
    // Mock requestIdleCallback
    window.requestIdleCallback = function(callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void) {
      callback({ timeRemaining: () => 100, didTimeout: false });
      return 123;
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    // Reset requestIdleCallback
    delete (window as any).requestIdleCallback;
  });

  test('should prefetch phone details when called', async () => {
    const { result } = renderHook(() => usePrefetch());
    const phoneId = 123;
    
    // Call prefetch
    act(() => {
      result.current.prefetchPhone(phoneId);
    });
    
    // Check that cache was checked
    expect(mockedGetPhoneDetailsCacheKey).toHaveBeenCalledWith(phoneId);
    expect(mockedGetCacheItem).toHaveBeenCalledWith('test-cache-key');
    
    // Check that prefetch was called
    // Can't directly check if requestIdleCallback was called since it's not a mock function
    // Instead, we check if the prefetch was called, which happens via requestIdleCallback
    expect(mockedPrefetchPhoneDetails).toHaveBeenCalledWith(phoneId);
  });

  test('should not prefetch if data is already in cache', () => {
    // Setup cache hit
    mockedGetCacheItem.mockReturnValue({ id: 123, name: 'Test Phone' });
    
    const { result } = renderHook(() => usePrefetch());
    const phoneId = 123;
    
    // Call prefetch
    act(() => {
      result.current.prefetchPhone(phoneId);
    });
    
    // Check that cache was checked
    expect(mockedGetCacheItem).toHaveBeenCalledWith('test-cache-key');
    
    // Check that prefetch was NOT called
    expect(mockedPrefetchPhoneDetails).not.toHaveBeenCalled();
  });

  test('should not prefetch the same phone twice', () => {
    const { result } = renderHook(() => usePrefetch());
    const phoneId = 123;
    
    // Call prefetch twice
    act(() => {
      result.current.prefetchPhone(phoneId);
    });
    
    // Reset mocks to check second call
    mockedGetCacheItem.mockClear();
    mockedPrefetchPhoneDetails.mockClear();
    
    // Call prefetch again with same ID
    act(() => {
      result.current.prefetchPhone(phoneId);
    });
    
    // Check that second prefetch was skipped
    expect(mockedGetCacheItem).not.toHaveBeenCalled();
    expect(mockedPrefetchPhoneDetails).not.toHaveBeenCalled();
  });

  test('should use setTimeout fallback when requestIdleCallback is not available', () => {
    // Remove requestIdleCallback
    delete (window as any).requestIdleCallback;
    
    // Mock setTimeout
    jest.spyOn(window, 'setTimeout');
    
    const { result } = renderHook(() => usePrefetch());
    const phoneId = 123;
    
    // Call prefetch
    act(() => {
      result.current.prefetchPhone(phoneId);
    });
    
    // Check that setTimeout was used as fallback
    expect(setTimeout).toHaveBeenCalled();
    
    // Fast-forward timers to trigger the setTimeout callback
    act(() => {
      jest.runAllTimers();
    });
    
    // Check that prefetch was called
    expect(mockedPrefetchPhoneDetails).toHaveBeenCalledWith(phoneId);
  });

  test('should handle prefetch errors gracefully', async () => {
    // Setup prefetch to fail
    mockedPrefetchPhoneDetails.mockRejectedValue(new Error('Prefetch failed'));
    
    // Spy on console.warn
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    const { result } = renderHook(() => usePrefetch());
    const phoneId = 123;
    
    // Call prefetch
    act(() => {
      result.current.prefetchPhone(phoneId);
    });
    
    // Wait for the prefetch to fail - need to use a more robust approach
    await act(async () => {
      // This creates a small delay to allow the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Check that error was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to prefetch phone 123');
    
    // Reset mocks
    consoleWarnSpy.mockClear();
    
    // Try prefetching again
    act(() => {
      result.current.prefetchPhone(phoneId);
    });
    
    // Check that prefetch was attempted again
    expect(mockedPrefetchPhoneDetails).toHaveBeenCalledTimes(2);
  });
});