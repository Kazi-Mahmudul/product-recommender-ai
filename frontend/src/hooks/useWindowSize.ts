import { useState, useEffect } from 'react';
import { BREAKPOINTS, Breakpoint, getCurrentBreakpoint } from '../utils/responsiveUtils';

export type Orientation = 'portrait' | 'landscape';

interface WindowSize {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  orientation: Orientation;
}

/**
 * Hook to get window dimensions and current breakpoint
 * @returns Object containing window width, height, current breakpoint, and isMobile flag
 */
export const useWindowSize = (): WindowSize => {
  // Initialize with reasonable defaults for SSR
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    breakpoint: 'lg',
    isMobile: false,
    orientation: 'landscape',
  });

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getCurrentBreakpoint(width);
      const isMobile = width < BREAKPOINTS.md;
      const orientation: Orientation = width >= height ? 'landscape' : 'portrait';
      
      setWindowSize({
        width,
        height,
        breakpoint,
        isMobile,
        orientation,
      });
    };
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures effect runs only on mount and unmount

  return windowSize;
};

/**
 * Hook to get a debounced window size to prevent excessive re-renders
 * @param delay Debounce delay in milliseconds
 * @returns Debounced window size object
 */
export const useDebouncedWindowSize = (delay: number = 250): WindowSize => {
  const windowSize = useWindowSize();
  const [debouncedWindowSize, setDebouncedWindowSize] = useState<WindowSize>(windowSize);

  useEffect(() => {
    // Set up the timeout
    const timeoutId = setTimeout(() => {
      setDebouncedWindowSize(windowSize);
    }, delay);

    // Clean up the timeout
    return () => clearTimeout(timeoutId);
  }, [windowSize, delay]);

  return debouncedWindowSize;
};

export default useWindowSize;