import { useState, useEffect } from 'react';

interface ResponsiveLayoutState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

// Breakpoint constants matching Tailwind CSS defaults
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export const useResponsiveLayout = (): ResponsiveLayoutState => {
  const [layoutState, setLayoutState] = useState<ResponsiveLayoutState>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenWidth: 1024,
        screenHeight: 768
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      screenWidth: width,
      screenHeight: height
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setLayoutState({
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isDesktop: width >= BREAKPOINTS.lg,
        screenWidth: width,
        screenHeight: height
      });
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return layoutState;
};

// Helper hooks for specific breakpoints
export const useIsMobile = (): boolean => {
  const { isMobile } = useResponsiveLayout();
  return isMobile;
};

export const useIsDesktop = (): boolean => {
  const { isDesktop } = useResponsiveLayout();
  return isDesktop;
};

export const useIsTablet = (): boolean => {
  const { isTablet } = useResponsiveLayout();
  return isTablet;
};

// Hook for getting current breakpoint
export const useCurrentBreakpoint = (): keyof typeof BREAKPOINTS | 'xs' => {
  const { screenWidth } = useResponsiveLayout();
  
  if (screenWidth >= BREAKPOINTS['2xl']) return '2xl';
  if (screenWidth >= BREAKPOINTS.xl) return 'xl';
  if (screenWidth >= BREAKPOINTS.lg) return 'lg';
  if (screenWidth >= BREAKPOINTS.md) return 'md';
  if (screenWidth >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};