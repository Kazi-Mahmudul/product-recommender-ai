import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWindowSize } from './useWindowSize';

/**
 * Hook for optimizing chart rendering performance
 * @param dataLength Length of the dataset
 * @param isVisible Whether the chart is currently visible in viewport
 * @returns Object with optimization settings
 */
export const useChartOptimization = (
  dataLength: number,
  isVisible: boolean = true
) => {
  // State for tracking if animations should be enabled
  const [enableAnimations, setEnableAnimations] = useState(true);
  
  // Get window size
  const { width: windowWidth, isMobile } = useWindowSize();
  
  // Determine if we should use simplified rendering
  const useSimplifiedRendering = useMemo(() => {
    // For large datasets on mobile, use simplified rendering
    if (isMobile && dataLength > 20) return true;
    
    // For very large datasets on any device, use simplified rendering
    if (dataLength > 50) return true;
    
    return false;
  }, [dataLength, isMobile]);
  
  // Determine optimal animation duration based on device and data size
  const animationDuration = useMemo(() => {
    if (!enableAnimations) return 0;
    
    if (isMobile) {
      // Shorter animations on mobile
      return Math.min(300, 500 - dataLength * 5);
    }
    
    // Standard animation duration, but reduce for larger datasets
    return Math.min(500, 800 - dataLength * 5);
  }, [enableAnimations, dataLength, isMobile]);
  
  // Determine if we should throttle updates during resize
  const shouldThrottleUpdates = useCallback((dataLength: number) => {
    return dataLength > 10;
  }, []);
  
  // Disable animations when not visible
  useEffect(() => {
    if (!isVisible) {
      setEnableAnimations(false);
    } else {
      // Re-enable animations after a short delay when becoming visible
      const timer = setTimeout(() => {
        setEnableAnimations(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);
  
  // Disable animations during window resize
  useEffect(() => {
    setEnableAnimations(false);
    
    // Re-enable animations after resize is complete
    const timer = setTimeout(() => {
      setEnableAnimations(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [windowWidth]);
  
  return {
    enableAnimations,
    animationDuration,
    useSimplifiedRendering,
    shouldThrottleUpdates,
  };
};

export default useChartOptimization;