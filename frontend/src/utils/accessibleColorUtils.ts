/**
 * Accessible Color Utilities for Charts
 * This file contains utilities for generating accessible color palettes
 * and ensuring proper contrast ratios for chart elements.
 */

/**
 * Calculate the relative luminance of a color
 * @param hexColor Hex color code (e.g., "#377D5B")
 * @returns Luminance value between 0 and 1
 */
export const getLuminance = (hexColor: string): number => {
  // Remove # if present
  const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Calculate luminance
  const rgb = [r, g, b].map(c => {
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};

/**
 * Calculate contrast ratio between two colors
 * @param color1 First hex color
 * @param color2 Second hex color
 * @returns Contrast ratio (1-21)
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if a color combination meets WCAG AA contrast requirements
 * @param foreground Foreground color (text)
 * @param background Background color
 * @param isLargeText Whether the text is large (>= 18pt or 14pt bold)
 * @returns Whether the contrast meets AA requirements
 */
export const meetsWcagAA = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Adjust color brightness
 * @param hexColor Hex color code
 * @param factor Factor to adjust brightness (>1 brightens, <1 darkens)
 * @returns Adjusted hex color
 */
export const adjustBrightness = (hexColor: string, factor: number): string => {
  // Remove # if present
  const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  
  // Convert hex to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  r = Math.min(255, Math.max(0, Math.round(r * factor)));
  g = Math.min(255, Math.max(0, Math.round(g * factor)));
  b = Math.min(255, Math.max(0, Math.round(b * factor)));
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Get a text color with sufficient contrast against the background
 * @param backgroundColor Background color
 * @param darkModeEnabled Whether dark mode is enabled
 * @returns Text color with good contrast
 */
export const getAccessibleTextColor = (
  backgroundColor: string,
  darkModeEnabled: boolean
): string => {
  // Default text colors
  const lightText = '#ffffff';
  const darkText = '#333333';
  
  // Check contrast with light text
  const lightContrast = getContrastRatio(backgroundColor, lightText);
  const darkContrast = getContrastRatio(backgroundColor, darkText);
  
  // Use the color with better contrast
  if (lightContrast >= darkContrast) {
    return lightText;
  }
  return darkText;
};

/**
 * Generate a color palette that is colorblind-friendly
 * @param baseColors Array of base colors to use
 * @param count Number of colors needed
 * @returns Array of colorblind-friendly colors
 */
export const getColorblindFriendlyPalette = (
  baseColors: string[] = [],
  count: number = 5
): string[] => {
  // Colorblind-friendly palette (based on ColorBrewer)
  const colorblindSafe = [
    '#377eb8', // Blue
    '#ff7f00', // Orange
    '#4daf4a', // Green
    '#f781bf', // Pink
    '#a65628', // Brown
    '#984ea3', // Purple
    '#999999', // Grey
    '#e41a1c', // Red
    '#dede00'  // Yellow
  ];
  
  // Use provided base colors first, then fill with colorblind-safe colors
  const result = [...baseColors];
  
  for (let i = result.length; i < count; i++) {
    result.push(colorblindSafe[i % colorblindSafe.length]);
  }
  
  return result;
};

/**
 * Generate a gradient between two colors
 * @param color1 Starting color
 * @param color2 Ending color
 * @param steps Number of steps in the gradient
 * @returns Array of colors forming a gradient
 */
export const generateGradient = (
  color1: string,
  color2: string,
  steps: number
): string[] => {
  const result: string[] = [];
  
  // Remove # if present
  const hex1 = color1.startsWith('#') ? color1.slice(1) : color1;
  const hex2 = color2.startsWith('#') ? color2.slice(1) : color2;
  
  // Convert hex to RGB
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  // Calculate step size
  const rStep = (r2 - r1) / (steps - 1);
  const gStep = (g2 - g1) / (steps - 1);
  const bStep = (b2 - b1) / (steps - 1);
  
  // Generate gradient
  for (let i = 0; i < steps; i++) {
    const r = Math.round(r1 + rStep * i);
    const g = Math.round(g1 + gStep * i);
    const b = Math.round(b1 + bStep * i);
    
    result.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
  }
  
  return result;
};