import { renderHook, act } from '@testing-library/react';
import { useRecommendations } from '../useRecommendations';
import { fetchRecommendations } from '../../api/recommendations';
import { getCacheItem, setCacheItem, getRecommendationsCacheKey } from '../../utils/cacheManager';

// Mock dependencies
jest.mock('../../api/recommendations');
jest.mock('../../utils/cacheManager');

const mockedFetchRecommendations = fetchRecommendations as jest.MockedFunction<typeof fetchRecommendations>;
const mockedGetCacheItem = getCacheItem as jest.MockedFunction<typeof getCacheItem>;
const mockedSetCacheItem = setCacheItem as jest.MockedFunction<typeof setCacheItem>;
const mockedGetRecommendationsCacheKey = getRecommendationsCacheKey as jest.MockedFunction<typeof getRecommendationsCacheKey>;

// Mock data
const mockPhoneId = 123;
const mockRecommendations = [
  {
    phone: {
      id: 456,
      brand: 'Samsung',
      name: 'Galaxy S21',
      price: '$799'
    },
    highlights: ['Better camera', 'Longer battery life'],
    badges: ['Popular', 'Best value'],
    similarityScore: 0.95,
    match_reasons: ['Similar price range']
  },
  {
    phone: {
      id: 789,
      brand: 'Apple',
      name: 'iPhone 13',
      price: '$899'
    },
    highlights: ['Better performance', 'Premium build'],
    badges: ['Premium'],
    similarityScore: 0.9,
    match_reasons: ['Similar performance profile']
  }
];

describe('useRecommendations Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockedGetRecommendationsCacheKey.mockReturnValue('test-cache-key');
    mockedGetCacheItem.mockReturnValue(null);
    mockedFetchRecommendations.mockResolvedValue(mockRecommendations);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should fetch recommendations on initial render', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.recommendations).toEqual([]);
    expect(result.current.error).toBeNull();
    
    // Wait for the fetch to complete
    await waitForNextUpdate();
    
    // Check final state
    expect(result.current.loading).toBe(false);
    expect(result.current.recommendations).toEqual(mockRecommendations);
    expect(result.current.error).toBeNull();
    expect(mockedFetchRecommendations).toHaveBeenCalledWith(mockPhoneId, undefined, expect.any(AbortSignal));
  });

  test('should use cached data when available', async () => {
    // Setup cache hit
    mockedGetCacheItem.mockReturnValue(mockRecommendations);
    
    const { result } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Should immediately have data from cache
    expect(result.current.loading).toBe(false);
    expect(result.current.recommendations).toEqual(mockRecommendations);
    expect(result.current.error).toBeNull();
    
    // Should not have called the fetch API
    expect(mockedFetchRecommendations).not.toHaveBeenCalled();
  });

  test('should handle fetch errors', async () => {
    // Setup fetch to fail
    const errorMessage = 'Network error';
    mockedFetchRecommendations.mockRejectedValue(new Error(errorMessage));
    
    const { result, waitForNextUpdate } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Initial state
    expect(result.current.loading).toBe(true);
    
    // Wait for the fetch to fail
    await waitForNextUpdate();
    
    // Check error state
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.recommendations).toEqual([]);
  });

  test('should retry on network errors with exponential backoff', async () => {
    // Setup fetch to fail with network error
    const networkError = new Error('Failed to fetch');
    mockedFetchRecommendations.mockRejectedValue(networkError);
    
    const { result, waitForNextUpdate } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Wait for the initial fetch to fail
    await waitForNextUpdate();
    
    // Check that we're in error state and retrying
    expect(result.current.error).toBe('Failed to fetch');
    expect(result.current.isNetworkError).toBe(true);
    expect(result.current.isRetrying).toBe(true);
    expect(result.current.retryCount).toBe(0);
    
    // Fast-forward timer to trigger first retry
    act(() => {
      jest.advanceTimersByTime(1000); // Initial retry delay
    });
    
    // Check that retry count increased
    expect(result.current.retryCount).toBe(1);
    
    // Wait for the retry to fail
    await waitForNextUpdate();
    
    // Check that we're still retrying with increased count
    expect(result.current.isRetrying).toBe(true);
    expect(result.current.retryCount).toBe(1);
    
    // Fast-forward timer to trigger second retry (with exponential backoff)
    act(() => {
      jest.advanceTimersByTime(2000); // 2x the initial delay
    });
    
    expect(result.current.retryCount).toBe(2);
    
    // Wait for the retry to fail
    await waitForNextUpdate();
    
    // Fast-forward timer to trigger third retry
    act(() => {
      jest.advanceTimersByTime(4000); // 4x the initial delay
    });
    
    expect(result.current.retryCount).toBe(3);
    
    // Wait for the retry to fail
    await waitForNextUpdate();
    
    // Should not retry anymore after 3 attempts
    expect(mockedFetchRecommendations).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  test('should manually retry on demand', async () => {
    // Setup fetch to succeed after initial failure
    mockedFetchRecommendations
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(mockRecommendations);
    
    const { result, waitForNextUpdate } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Wait for the initial fetch to fail
    await waitForNextUpdate();
    
    // Check error state
    expect(result.current.error).toBe('Failed to fetch');
    
    // Manually retry
    act(() => {
      result.current.retry();
    });
    
    // Should be loading again
    expect(result.current.loading).toBe(true);
    
    // Wait for the retry to succeed
    await waitForNextUpdate();
    
    // Check success state
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.recommendations).toEqual(mockRecommendations);
  });

  test('should reset error state', async () => {
    // Setup fetch to fail
    mockedFetchRecommendations.mockRejectedValue(new Error('Failed to fetch'));
    
    const { result, waitForNextUpdate } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Wait for the fetch to fail
    await waitForNextUpdate();
    
    // Check error state
    expect(result.current.error).toBe('Failed to fetch');
    
    // Reset error state
    act(() => {
      result.current.resetError();
    });
    
    // Check that error is cleared
    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  test('should abort in-flight requests when unmounted', async () => {
    // Mock abort function
    const mockAbort = jest.fn();
    const mockAbortController = { abort: mockAbort, signal: {} as AbortSignal };
    global.AbortController = jest.fn(() => mockAbortController) as any;
    
    const { unmount } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Unmount to trigger cleanup
    unmount();
    
    // Check that abort was called
    expect(mockAbort).toHaveBeenCalled();
  });

  test('should refetch with force refresh', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useRecommendations(mockPhoneId));
    
    // Wait for initial fetch
    await waitForNextUpdate();
    
    // Reset mocks to check new calls
    mockedFetchRecommendations.mockClear();
    
    // Call refetch with force refresh
    act(() => {
      result.current.refetch(true);
    });
    
    // Should be loading again
    expect(result.current.loading).toBe(true);
    
    // Wait for the refetch to complete
    await waitForNextUpdate();
    
    // Check that fetch was called again and cache was bypassed
    expect(mockedFetchRecommendations).toHaveBeenCalledTimes(1);
    expect(mockedGetCacheItem).not.toHaveBeenCalled();
  });
});