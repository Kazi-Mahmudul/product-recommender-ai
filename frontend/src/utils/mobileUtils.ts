// Mobile utility functions for responsive design and touch interactions

import React from 'react';

export interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  direction: 'left' | 'right' | 'up' | 'down' | 'none';
  distance: number;
}

export class MobileUtils {
  /**
   * Check if the current device is mobile
   */
  static isMobile(): boolean {
    return window.innerWidth < 768;
  }

  /**
   * Check if the current device is tablet
   */
  static isTablet(): boolean {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  /**
   * Check if the current device supports touch
   */
  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get optimal touch target size based on device
   */
  static getTouchTargetSize(): number {
    if (this.isMobile()) {
      return 44; // iOS recommended minimum
    }
    return 40; // Desktop/tablet
  }

  /**
   * Get optimal spacing for mobile elements
   */
  static getMobileSpacing(): {
    small: string;
    medium: string;
    large: string;
  } {
    if (this.isMobile()) {
      return {
        small: '0.5rem',
        medium: '1rem',
        large: '1.5rem'
      };
    }
    return {
      small: '0.75rem',
      medium: '1.5rem',
      large: '2rem'
    };
  }

  /**
   * Handle touch gestures for swipe navigation
   */
  static handleTouchGesture(
    startTouch: React.Touch,
    endTouch: React.Touch,
    onSwipe?: (gesture: TouchGesture) => void
  ): TouchGesture {
    const deltaX = endTouch.clientX - startTouch.clientX;
    const deltaY = endTouch.clientY - startTouch.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let direction: TouchGesture['direction'] = 'none';
    
    // Determine swipe direction (minimum distance of 50px)
    if (distance > 50) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
    }
    
    const gesture: TouchGesture = {
      startX: startTouch.clientX,
      startY: startTouch.clientY,
      endX: endTouch.clientX,
      endY: endTouch.clientY,
      deltaX,
      deltaY,
      direction,
      distance
    };
    
    if (onSwipe && direction !== 'none') {
      onSwipe(gesture);
    }
    
    return gesture;
  }

  /**
   * Optimize chart dimensions for mobile
   */
  static getChartDimensions(): {
    width: string;
    height: number;
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  } {
    if (this.isMobile()) {
      return {
        width: '100%',
        height: 300,
        margin: {
          top: 10,
          right: 10,
          bottom: 80,
          left: 10
        }
      };
    }
    
    return {
      width: '100%',
      height: 400,
      margin: {
        top: 20,
        right: 30,
        bottom: 60,
        left: 20
      }
    };
  }

  /**
   * Get mobile-optimized font sizes
   */
  static getFontSizes(): {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
  } {
    if (this.isMobile()) {
      return {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem'
      };
    }
    
    return {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.5rem'
    };
  }

  /**
   * Debounce function for performance optimization
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for scroll/resize events
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Add haptic feedback for touch interactions (if supported)
   */
  static addHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }

  /**
   * Prevent zoom on double tap for specific elements
   */
  static preventZoomOnDoubleTap(element: HTMLElement): void {
    let lastTouchEnd = 0;
    
    element.addEventListener('touchend', (event) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  /**
   * Get safe area insets for devices with notches
   */
  static getSafeAreaInsets(): {
    top: string;
    right: string;
    bottom: string;
    left: string;
  } {
    return {
      top: 'env(safe-area-inset-top, 0px)',
      right: 'env(safe-area-inset-right, 0px)',
      bottom: 'env(safe-area-inset-bottom, 0px)',
      left: 'env(safe-area-inset-left, 0px)'
    };
  }

  /**
   * Optimize scroll behavior for mobile
   */
  static optimizeScrolling(element: HTMLElement): void {
    // Enable momentum scrolling on iOS
    (element.style as any).webkitOverflowScrolling = 'touch';
    
    // Improve scroll performance
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'scroll-position';
  }

  /**
   * Handle orientation change
   */
  static onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): () => void {
    const handleOrientationChange = () => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      callback(orientation);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Cleanup function
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }

  /**
   * Get mobile-optimized grid columns
   */
  static getGridColumns(totalItems: number): number {
    if (this.isMobile()) {
      return totalItems === 1 ? 1 : 2;
    }
    
    if (this.isTablet()) {
      return Math.min(totalItems, 3);
    }
    
    return Math.min(totalItems, 4);
  }

  /**
   * Check if element is in viewport (for lazy loading)
   */
  static isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Get mobile-optimized button styles
   */
  static getMobileButtonStyles(): {
    minHeight: string;
    minWidth: string;
    padding: string;
    fontSize: string;
  } {
    const touchTargetSize = this.getTouchTargetSize();
    
    return {
      minHeight: `${touchTargetSize}px`,
      minWidth: `${touchTargetSize}px`,
      padding: this.isMobile() ? '0.75rem 1rem' : '0.5rem 1rem',
      fontSize: this.isMobile() ? '1rem' : '0.875rem'
    };
  }
}