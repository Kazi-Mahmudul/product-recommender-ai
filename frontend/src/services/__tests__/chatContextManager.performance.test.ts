import { ChatContextManager } from '../chatContextManager';
import { Phone } from '../../api/phones';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  }
});

describe('ChatContextManager Performance Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    ChatContextManager.clearCache();
    ChatContextManager.resetPerformanceMetrics();
  });

  afterEach(() => {
    ChatContextManager.stopCleanupTimer();
  });

  it('should use cache for repeated context loads', () => {
    // First load - should miss cache
    const context1 = ChatContextManager.loadContext();
    
    // Second load - should hit cache
    const context2 = ChatContextManager.loadContext();
    
    const metrics = ChatContextManager.getPerformanceMetrics();
    
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.cacheMisses).toBe(1);
    expect(metrics.cacheHitRate).toBe(50);
    expect(context1.sessionId).toBe(context2.sessionId);
  });

  it('should optimize context for storage', () => {
    const context = ChatContextManager.initializeContext();
    
    // Add many phone recommendations
    const mockPhones: Phone[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Phone ${i}`,
      brand: 'TestBrand',
      model: `Model ${i}`,
      price: `৳${(50000 + i * 1000).toLocaleString()}`,
      url: `/phone-${i}`,
      price_original: 50000 + i * 1000,
      overall_device_score: 8.5,
      camera_score: 8.0,
      battery_capacity_numeric: 4000,
      refresh_rate_numeric: 90,
      network: '5G',
      has_fast_charging: true
    }));

    // Add multiple recommendations
    let updatedContext = context;
    for (let i = 0; i < 15; i++) {
      updatedContext = ChatContextManager.addPhoneRecommendation(
        updatedContext,
        mockPhones.slice(0, 3),
        `test query ${i}`
      );
    }

    // Save and reload
    ChatContextManager.saveContext(updatedContext);
    const reloadedContext = ChatContextManager.loadContext();

    // Should have limited phone recommendations due to optimization
    expect(reloadedContext.phoneRecommendations.length).toBeLessThanOrEqual(10);
  });

  it('should handle storage quota gracefully', () => {
    // Mock localStorage to throw quota exceeded error
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = jest.fn(() => {
      const error = new Error('QuotaExceededError');
      Object.defineProperty(error, 'name', { value: 'QuotaExceededError' });
      Object.defineProperty(error, 'code', { value: 22, writable: false });
      throw error;
    });

    const context = ChatContextManager.initializeContext();
    
    // Should not throw error even when storage fails
    expect(() => {
      ChatContextManager.saveContext(context);
    }).not.toThrow();

    // Restore original setItem
    localStorageMock.setItem = originalSetItem;
  });

  it('should provide accurate performance metrics', () => {
    // Reset metrics first
    ChatContextManager.resetPerformanceMetrics();
    
    // Perform some operations
    ChatContextManager.loadContext();
    const context = ChatContextManager.initializeContext();
    ChatContextManager.saveContext(context);
    ChatContextManager.loadContext(); // Should hit cache

    const metrics = ChatContextManager.getPerformanceMetrics();

    expect(metrics.loadOperations).toBeGreaterThanOrEqual(2);
    expect(metrics.saveOperations).toBeGreaterThanOrEqual(2);
    expect(metrics.cacheHits).toBeGreaterThanOrEqual(1);
    expect(metrics.cacheMisses).toBeGreaterThanOrEqual(1);
    expect(metrics.averageLoadTime).toBeGreaterThanOrEqual(0);
    expect(metrics.averageSaveTime).toBeGreaterThanOrEqual(0);
    expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
    expect(metrics.cacheHitRate).toBeLessThanOrEqual(100);
  });

  it('should provide storage information', () => {
    const context = ChatContextManager.initializeContext();
    ChatContextManager.saveContext(context);

    const storageInfo = ChatContextManager.getStorageInfo();

    expect(storageInfo.used).toBeGreaterThan(0);
    expect(storageInfo.contextSize).toBeGreaterThan(0);
    expect(storageInfo.percentage).toBeGreaterThanOrEqual(0);
    expect(storageInfo.percentage).toBeLessThanOrEqual(100);
  });

  it('should preload context asynchronously', async () => {
    const context = await ChatContextManager.preloadContext();
    
    expect(context).toBeDefined();
    expect(context.sessionId).toBeDefined();
    
    const metrics = ChatContextManager.getPerformanceMetrics();
    expect(metrics.loadOperations).toBe(1);
  });

  it('should batch context updates', (done) => {
    const context = ChatContextManager.initializeContext();
    
    // Make multiple batch updates
    ChatContextManager.batchUpdateContext(context, { queryCount: 1 });
    ChatContextManager.batchUpdateContext(context, { queryCount: 2 });
    ChatContextManager.batchUpdateContext(context, { lastQuery: 'test' });

    // Wait for batch to process
    setTimeout(() => {
      const metrics = ChatContextManager.getPerformanceMetrics();
      // Should have fewer save operations due to batching
      expect(metrics.saveOperations).toBeLessThan(4);
      done();
    }, 150);
  });
});