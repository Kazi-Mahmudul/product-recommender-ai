import { BREAKPOINTS, Breakpoint, getCurrentBreakpoint } from './responsiveUtils';

/**
 * Component visibility configuration
 */
export interface ComponentVisibility {
  xAxis: boolean;
  yAxis: boolean;
  labels: boolean;
  legend: boolean;
  tooltip: boolean;
  grid: boolean;
  summary: boolean;
}

/**
 * Chart layout configuration
 */
export interface ChartLayout {
  aspectRatio: number;
  minHeight: number;
  maxHeight: number;
  componentVisibility: ComponentVisibility;
  compactMode: boolean;
}

/**
 * Default component visibility by breakpoint
 */
const defaultComponentVisibility: Record<Breakpoint, ComponentVisibility> = {
  xs: {
    xAxis: true,
    yAxis: true,
    labels: false,
    legend: false,
    tooltip: true,
    grid: false,
    summary: false,
  },
  sm: {
    xAxis: true,
    yAxis: true,
    labels: true,
    legend: false,
    tooltip: true,
    grid: false,
    summary: true,
  },
  md: {
    xAxis: true,
    yAxis: true,
    labels: true,
    legend: true,
    tooltip: true,
    grid: true,
    summary: true,
  },
  lg: {
    xAxis: true,
    yAxis: true,
    labels: true,
    legend: true,
    tooltip: true,
    grid: true,
    summary: true,
  },
  xl: {
    xAxis: true,
    yAxis: true,
    labels: true,
    legend: true,
    tooltip: true,
    grid: true,
    summary: true,
  },
};

/**
 * Default aspect ratios by breakpoint
 */
const defaultAspectRatios: Record<Breakpoint, number> = {
  xs: 1.2, // More square for small screens
  sm: 1.5,
  md: 1.8,
  lg: 2.0,
  xl: 2.2, // Wider for large screens
};

/**
 * Default height constraints by breakpoint
 */
const defaultHeightConstraints: Record<Breakpoint, { min: number; max: number }> = {
  xs: { min: 180, max: 220 },
  sm: { min: 200, max: 250 },
  md: { min: 220, max: 280 },
  lg: { min: 250, max: 300 },
  xl: { min: 280, max: 350 },
};

/**
 * Get chart layout configuration based on container width and options
 * @param containerWidth Width of the container
 * @param compact Whether to use compact mode
 * @param dataComplexity Complexity of the data (1-5, higher means more complex)
 * @param orientation Device orientation ('portrait' or 'landscape')
 * @returns Chart layout configuration
 */
export const getChartLayout = (
  containerWidth: number,
  compact: boolean = false,
  dataComplexity: number = 3,
  orientation: 'portrait' | 'landscape' = 'landscape'
): ChartLayout => {
  const breakpoint = getCurrentBreakpoint(containerWidth);
  
  // Start with default visibility for the breakpoint
  let visibility = { ...defaultComponentVisibility[breakpoint] };
  
  // Adjust for compact mode
  if (compact) {
    visibility = {
      ...visibility,
      labels: containerWidth >= BREAKPOINTS.md,
      legend: false,
      grid: false,
      summary: containerWidth >= BREAKPOINTS.lg,
    };
  }
  
  // Adjust for orientation
  if (orientation === 'portrait') {
    // In portrait mode on small screens, optimize vertical space
    if (breakpoint === 'xs' || breakpoint === 'sm') {
      visibility.grid = false;
      visibility.summary = false;
    }
  } else {
    // In landscape mode, we have more horizontal space
    if (breakpoint === 'sm') {
      visibility.labels = true;
      visibility.summary = true;
    }
  }
  
  // Adjust for data complexity
  if (dataComplexity >= 4) {
    // For complex data, simplify on smaller screens
    if (breakpoint === 'xs' || breakpoint === 'sm') {
      visibility.labels = false;
      visibility.grid = false;
    }
  } else if (dataComplexity <= 2) {
    // For simple data, show more on smaller screens
    visibility.labels = true;
    visibility.grid = breakpoint !== 'xs';
  }
  
  // Get aspect ratio and height constraints
  let aspectRatio = compact 
    ? defaultAspectRatios[breakpoint] * 0.8 // More compact
    : defaultAspectRatios[breakpoint];
    
  // Adjust aspect ratio for orientation
  if (orientation === 'portrait') {
    // Make chart taller in portrait mode
    aspectRatio = aspectRatio * 0.7;
  } else {
    // Make chart wider in landscape mode
    aspectRatio = aspectRatio * 1.1;
  }
    
  const heightConstraints = defaultHeightConstraints[breakpoint];
  
  // Calculate min/max heights with adjustments for compact mode
  const minHeight = compact 
    ? heightConstraints.min * 0.8 
    : heightConstraints.min;
    
  const maxHeight = compact 
    ? heightConstraints.max * 0.8 
    : heightConstraints.max;
  
  return {
    aspectRatio,
    minHeight,
    maxHeight,
    componentVisibility: visibility,
    compactMode: compact,
  };
};

/**
 * Calculate optimal chart height based on container width and layout
 * @param containerWidth Width of the container
 * @param layout Chart layout configuration
 * @returns Optimal chart height
 */
export const getOptimalChartHeight = (
  containerWidth: number,
  layout: ChartLayout
): number => {
  // Calculate height based on aspect ratio
  const calculatedHeight = containerWidth / layout.aspectRatio;
  
  // Constrain to min/max
  return Math.min(
    Math.max(calculatedHeight, layout.minHeight),
    layout.maxHeight
  );
};