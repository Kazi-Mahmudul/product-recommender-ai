import { useState, useEffect, useCallback } from 'react';
import { useWindowSize } from './useWindowSize';

/**
 * Hook for efficient resize handling
 * @param debounceTime Debounce time in milliseconds
 * @returns Object with resize state and handlers
 */
export const useResizeHandler = (debounceTime: number = 250) => {
  const windowSize = useWindowSize();
  const [isResizing, setIsResizing] = useState(false);
  const [debouncedWindowSize, setDebouncedWindowSize] = useState(windowSize);
  
  // Update debounced window size after resize completes
  useEffect(() => {
    setIsResizing(true);
    
    const timeoutId = setTimeout(() => {
      setDebouncedWindowSize(windowSize);
      setIsResizing(false);
    }, debounceTime);
    
    return () => clearTimeout(timeoutId);
  }, [windowSize, debounceTime]);
  
  // Get simplified dimensions during resize
  const getSimplifiedDimensions = useCallback(() => {
    // Round dimensions to nearest multiple of 50px during resize
    // to reduce number of re-renders
    const roundTo = 50;
    return {
      width: Math.floor(windowSize.width / roundTo) * roundTo,
      height: Math.floor(windowSize.height / roundTo) * roundTo,
    };
  }, [windowSize.width, windowSize.height]);
  
  return {
    isResizing,
    windowSize: isResizing ? getSimplifiedDimensions() : debouncedWindowSize,
    debouncedWindowSize,
    originalWindowSize: windowSize,
  };
};

export default useResizeHandler;