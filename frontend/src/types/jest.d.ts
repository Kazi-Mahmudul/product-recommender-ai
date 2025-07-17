// Type definitions for Jest global functions and variables
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any[]> {
      (...args: Y): T;
      mock: {
        calls: Y[];
        instances: any[];
        contexts: any[];
        results: Array<{
          type: 'return' | 'throw';
          value: any;
        }>;
        lastCall: Y;
      };
      mockClear(): this;
      mockReset(): this;
      mockRestore(): void;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValue(value: T): this;
      mockResolvedValueOnce(value: T): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
      mockImplementation(fn: (...args: Y) => T): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
      withImplementation(fn: (...args: Y) => T, callback: () => void): this;
      mockName(name: string): this;
    }
    
    type MockedFunction<T extends (...args: any[]) => any> = Mock<ReturnType<T>, Parameters<T>> & T;
    
    function fn<T = any>(): Mock<T>;
    function fn<T, Y extends any[]>(implementation?: (...args: Y) => T): Mock<T, Y>;
    
    function clearAllMocks(): void;
    function resetAllMocks(): void;
    function restoreAllMocks(): void;
    function spyOn<T, K extends keyof T>(object: T, method: K): Mock;
    function useFakeTimers(): void;
    function useRealTimers(): void;
    function advanceTimersByTime(msToRun: number): void;
    function runAllTimers(): void;
    function mock(moduleName: string): any;
  }
  
  const jest: typeof jest;
  const describe: (name: string, fn: () => void) => void;
  const beforeEach: (fn: () => void) => void;
  const afterEach: (fn: () => void) => void;
  const test: (name: string, fn: () => void | Promise<void>) => void;
  const expect: any;
  const global: any;
  
  // Add aliases for Jest functions
  const it: typeof test;
  
  // Add RequestIdleCallback types
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

// This exports an empty object to make TypeScript treat this as a module
export {};