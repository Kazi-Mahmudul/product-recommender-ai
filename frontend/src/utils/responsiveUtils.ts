/**
 * Responsive Utilities for ePick Application
 * This file contains breakpoint definitions and utility functions for responsive design
 */

// Breakpoint definitions (in pixels)
export const BREAKPOINTS = {
  xs: 320,  // Extra small devices (small phones)
  sm: 640,  // Small devices (large phones)
  md: 768,  // Medium devices (tablets)
  lg: 1024, // Large devices (laptops/desktops)
  xl: 1280, // Extra large devices (large desktops)
};

// Breakpoint types
export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Determine the current breakpoint based on window width
 * @param width Current window width
 * @returns The current breakpoint
 */
export const getCurrentBreakpoint = (width: number): Breakpoint => {
  if (width < BREAKPOINTS.xs) return 'xs';
  if (width < BREAKPOINTS.sm) return 'sm';
  if (width < BREAKPOINTS.md) return 'md';
  if (width < BREAKPOINTS.lg) return 'lg';
  return 'xl';
};

/**
 * Check if the current width is smaller than a specific breakpoint
 * @param width Current window width
 * @param breakpoint Breakpoint to check against
 * @returns True if width is smaller than the breakpoint
 */
export const isSmallerThan = (width: number, breakpoint: Breakpoint): boolean => {
  return width < BREAKPOINTS[breakpoint];
};

/**
 * Check if the current width is larger than a specific breakpoint
 * @param width Current window width
 * @param breakpoint Breakpoint to check against
 * @returns True if width is larger than the breakpoint
 */
export const isLargerThan = (width: number, breakpoint: Breakpoint): boolean => {
  return width >= BREAKPOINTS[breakpoint];
};

/**
 * Get responsive font size based on container width
 * @param containerWidth Width of the container
 * @returns Appropriate font size as a string with units
 */
export const getResponsiveFontSize = (containerWidth: number): string => {
  if (containerWidth < BREAKPOINTS.xs) return '0.7rem';
  if (containerWidth < BREAKPOINTS.sm) return '0.8rem';
  if (containerWidth < BREAKPOINTS.md) return '0.9rem';
  return '1rem';
};

/**
 * Chart types for margin calculation
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'radar' | 'scatter';

/**
 * Chart orientation for margin calculation
 */
export type ChartOrientation = 'horizontal' | 'vertical';

/**
 * Calculate responsive margins for charts based on container width
 * @param containerWidth Width of the container
 * @param chartType Type of chart (bar, line, pie, etc.)
 * @param orientation Chart orientation (horizontal or vertical)
 * @param hasAxisLabels Whether the chart has axis labels
 * @returns Margin object with top, right, bottom, left values
 */
export const getResponsiveChartMargins = (
  containerWidth: number,
  chartType: ChartType = 'bar',
  orientation: ChartOrientation = 'vertical',
  hasAxisLabels: boolean = true
): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} => {
  const breakpoint = getCurrentBreakpoint(containerWidth);
  
  // Base margins by breakpoint
  let margins = {
    xs: { top: 10, right: 10, bottom: 40, left: 25 },
    sm: { top: 15, right: 15, bottom: 50, left: 30 },
    md: { top: 20, right: 20, bottom: 60, left: 35 },
    lg: { top: 20, right: 30, bottom: 60, left: 40 },
    xl: { top: 20, right: 30, bottom: 60, left: 40 },
  };
  
  // Adjust based on chart type
  if (chartType === 'pie' || chartType === 'radar') {
    // Pie and radar charts need more even margins
    margins = {
      xs: { top: 10, right: 10, bottom: 10, left: 10 },
      sm: { top: 15, right: 15, bottom: 15, left: 15 },
      md: { top: 20, right: 20, bottom: 20, left: 20 },
      lg: { top: 30, right: 30, bottom: 30, left: 30 },
      xl: { top: 30, right: 30, bottom: 30, left: 30 },
    };
  } else if (chartType === 'line') {
    // Line charts need more space for points at edges
    margins = {
      xs: { top: 15, right: 15, bottom: 40, left: 25 },
      sm: { top: 20, right: 20, bottom: 50, left: 30 },
      md: { top: 25, right: 25, bottom: 60, left: 35 },
      lg: { top: 25, right: 35, bottom: 60, left: 40 },
      xl: { top: 25, right: 35, bottom: 60, left: 40 },
    };
  }
  
  // Adjust based on orientation
  if (orientation === 'horizontal') {
    // Swap left/bottom margins for horizontal charts
    const baseMargins = { ...margins[breakpoint] };
    margins[breakpoint] = {
      top: baseMargins.top,
      right: baseMargins.right,
      bottom: baseMargins.left,
      left: baseMargins.bottom,
    };
  }
  
  // Adjust if no axis labels
  if (!hasAxisLabels) {
    margins[breakpoint].bottom = Math.max(10, margins[breakpoint].bottom * 0.5);
    margins[breakpoint].left = Math.max(10, margins[breakpoint].left * 0.5);
  }
  
  // For very small screens, ensure minimum margins
  if (containerWidth < 300) {
    return {
      top: Math.max(5, margins[breakpoint].top * 0.7),
      right: Math.max(5, margins[breakpoint].right * 0.7),
      bottom: Math.max(20, margins[breakpoint].bottom * 0.7),
      left: Math.max(15, margins[breakpoint].left * 0.7),
    };
  }
  
  return margins[breakpoint];
};

/**
 * Determine if labels should be rotated based on container width and item count
 * @param containerWidth Width of the container
 * @param itemCount Number of items in the chart
 * @returns True if labels should be rotated
 */
export const shouldRotateLabels = (containerWidth: number, itemCount: number): boolean => {
  if (containerWidth < BREAKPOINTS.xs) return true;
  if (containerWidth < BREAKPOINTS.sm && itemCount > 3) return true;
  if (containerWidth < BREAKPOINTS.md && itemCount > 5) return true;
  return false;
};

/**
 * Calculate optimal bar width based on container width and number of data groups
 * @param containerWidth Width of the container
 * @param dataGroups Number of data groups (categories)
 * @param barSets Number of bar sets (series) per group
 * @returns Optimal bar width as a number
 */
export const getOptimalBarWidth = (
  containerWidth: number,
  dataGroups: number,
  barSets: number
): number => {
  // Base calculation
  const availableWidth = containerWidth * 0.8; // 80% of container width for bars
  const totalBars = dataGroups * barSets;
  const baseWidth = availableWidth / totalBars;
  
  // Adjust based on breakpoint
  const breakpoint = getCurrentBreakpoint(containerWidth);
  
  // Calculate minimum width based on number of bars
  const getMinWidth = () => {
    if (barSets === 1) return 30; // Single bar set can be wider
    if (barSets === 2) return 20; // Two bar sets
    if (barSets <= 4) return 15; // 3-4 bar sets
    return 10; // More than 4 bar sets
  };
  
  // Calculate width factor based on data density
  const getWidthFactor = () => {
    const density = totalBars / dataGroups;
    if (density <= 2) return 0.95;
    if (density <= 4) return 0.9;
    if (density <= 6) return 0.85;
    return 0.8;
  };
  
  // Get minimum width based on breakpoint and bar count
  const minWidth = (() => {
    const baseMin = getMinWidth();
    switch (breakpoint) {
      case 'xs': return Math.max(8, baseMin * 0.6);
      case 'sm': return Math.max(10, baseMin * 0.7);
      case 'md': return Math.max(12, baseMin * 0.8);
      default: return baseMin;
    }
  })();
  
  // Get width factor based on breakpoint and data density
  const widthFactor = (() => {
    const baseFactor = getWidthFactor();
    switch (breakpoint) {
      case 'xs': return baseFactor * 0.85;
      case 'sm': return baseFactor * 0.9;
      case 'md': return baseFactor * 0.95;
      default: return baseFactor;
    }
  })();
  
  return Math.max(minWidth, baseWidth * widthFactor);
};

/**
 * Calculate optimal bar gap based on container width and bar count
 * @param containerWidth Width of the container
 * @param barCount Number of bars in a group
 * @returns Optimal bar gap as a number
 */
export const getOptimalBarGap = (
  containerWidth: number,
  barCount: number
): number => {
  const breakpoint = getCurrentBreakpoint(containerWidth);
  
  // Base gap percentage (higher means more space between bars)
  let baseGap = 0.2; // 20% gap
  
  // Adjust based on bar count
  if (barCount === 1) baseGap = 0;
  else if (barCount === 2) baseGap = 0.1;
  else if (barCount === 3) baseGap = 0.15;
  else if (barCount > 5) baseGap = 0.25;
  
  // Adjust based on breakpoint
  switch (breakpoint) {
    case 'xs': return Math.max(0, baseGap - 0.05);
    case 'sm': return baseGap;
    case 'md': return baseGap + 0.05;
    default: return baseGap + 0.1;
  }
};

/**
 * Calculate optimal category gap based on container width and category count
 * @param containerWidth Width of the container
 * @param categoryCount Number of categories (groups)
 * @returns Optimal category gap as a number
 */
export const getOptimalCategoryGap = (
  containerWidth: number,
  categoryCount: number
): number => {
  const breakpoint = getCurrentBreakpoint(containerWidth);
  
  // Base gap percentage (higher means more space between categories)
  let baseGap = 0.3; // 30% gap
  
  // Adjust based on category count
  if (categoryCount <= 2) baseGap = 0.5;
  else if (categoryCount <= 4) baseGap = 0.4;
  else if (categoryCount > 7) baseGap = 0.2;
  
  // Adjust based on breakpoint
  switch (breakpoint) {
    case 'xs': return Math.max(0.1, baseGap - 0.1);
    case 'sm': return Math.max(0.15, baseGap - 0.05);
    case 'md': return baseGap;
    default: return baseGap + 0.05;
  }
};