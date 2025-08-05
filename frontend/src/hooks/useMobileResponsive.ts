// Custom hook for mobile responsive behavior

import { useState, useEffect, useCallback } from 'react';
import { MobileUtils } from '../utils/mobileUtils';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  windowWidth: number;
  windowHeight: number;
}

export const useMobileResponsive = () => {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(() => ({
    isMobile: MobileUtils.isMobile(),
    isTablet: MobileUtils.isTablet(),
    isDesktop: window.innerWidth >= 1024,
    isTouchDevice: MobileUtils.isTouchDevice(),
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  }));

  const updateResponsiveState = useCallback(() => {
    setResponsiveState({
      isMobile: MobileUtils.isMobile(),
      isTablet: MobileUtils.isTablet(),
      isDesktop: window.innerWidth >= 1024,
      isTouchDevice: MobileUtils.isTouchDevice(),
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    });
  }, []);

  useEffect(() => {
    const debouncedUpdate = MobileUtils.debounce(updateResponsiveState, 150);
    
    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', debouncedUpdate);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', debouncedUpdate);
    };
  }, [updateResponsiveState]);

  return responsiveState;
};

export const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) => {
  const [touchStart, setTouchStart] = useState<React.Touch | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0]);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const gesture = MobileUtils.handleTouchGesture(
      touchStart,
      e.changedTouches[0],
      (gesture) => {
        switch (gesture.direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
      }
    );

    setTouchStart(null);
  }, [touchStart, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
};

export const useIntersectionObserver = (
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
) => {
  const [elementRef, setElementRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!elementRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        callback(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(elementRef);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, callback, options]);

  return setElementRef;
};