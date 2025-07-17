// Global type definitions for Jest and other globals

import '@testing-library/jest-dom';

declare global {
  // Jest globals
  const jest: {
    fn: <T = any>() => jest.Mock<T>;
    mock: (moduleName: string) => any;
    spyOn: <T, K extends keyof T>(object: T, method: K) => jest.Mock;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
    restoreAllMocks: () => void;
    useFakeTimers: () => void;
    useRealTimers: () => void;
    advanceTimersByTime: (msToRun: number) => void;
    runAllTimers: () => void;
  };

  namespace jest {
    interface Mock<T = any, Y extends any[] = any[]> {
      (...args: Y): T;
      mock: {
        calls: Y[][];
        instances: any[];
        contexts: any[];
        results: Array<{
          type: 'return' | 'throw';
          value: any;
        }>;
        lastCall: Y;
      };
      mockClear: () => Mock<T, Y>;
      mockReset: () => Mock<T, Y>;
      mockRestore: () => void;
      mockReturnValue: (value: T) => Mock<T, Y>;
      mockReturnValueOnce: (value: T) => Mock<T, Y>;
      mockResolvedValue: (value: T) => Mock<T, Y>;
      mockResolvedValueOnce: (value: T) => Mock<T, Y>;
      mockRejectedValue: (value: any) => Mock<T, Y>;
      mockRejectedValueOnce: (value: any) => Mock<T, Y>;
      mockImplementation: (fn: (...args: Y) => T) => Mock<T, Y>;
      mockImplementationOnce: (fn: (...args: Y) => T) => Mock<T, Y>;
      withImplementation: (fn: (...args: Y) => T, callback: () => void) => Mock<T, Y>;
      mockName: (name: string) => Mock<T, Y>;
    }

    type MockedFunction<T extends (...args: any[]) => any> = Mock<ReturnType<T>, Parameters<T>> & T;
  }

  // Jest test functions
  const describe: (name: string, fn: () => void) => void;
  const beforeEach: (fn: () => void) => void;
  const afterEach: (fn: () => void) => void;
  const beforeAll: (fn: () => void) => void;
  const afterAll: (fn: () => void) => void;
  const test: (name: string, fn: () => void | Promise<void>, timeout?: number) => void;
  const it: typeof test;
  const expect: any;

  // Global variables
  const global: typeof globalThis & {
    IntersectionObserver: any;
    AbortController: any;
  };

  // RequestIdleCallback types
  interface RequestIdleCallbackOptions {
    timeout: number;
  }

  interface RequestIdleCallbackDeadline {
    didTimeout: boolean;
    timeRemaining: () => number;
  }

  type RequestIdleCallbackHandle = number;

  interface Window {
    requestIdleCallback?: (
      callback: (deadline: RequestIdleCallbackDeadline) => void,
      opts?: RequestIdleCallbackOptions
    ) => RequestIdleCallbackHandle;
    cancelIdleCallback?: (handle: RequestIdleCallbackHandle) => void;
  }
}

export {};