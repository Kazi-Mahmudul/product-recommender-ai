/**
 * Color System for Peyechi Application
 * This file contains color constants and utility functions for consistent color usage
 * across the application, especially in the chat result sections.
 */

// Brand Colors
export const BRAND_COLORS = {
  green: "#377D5B", // Main brand color - PeyechiGreen
  darkGreen: "#80EF80", // Accent brand color - PeyechiDarkGreen
};

// Theme-specific colors for light and dark modes
export const THEME_COLORS = {
  light: {
    background: "#f7f3ef",
    cardBackground: "#fff7f0",
    text: "#6b4b2b",
    highlight: "#d4a88d",
    highlightHover: "#b07b50",
    border: "#eae4da",
    tableHeader: "#377D5B", // Using brand green for table headers
    tableHeaderText: "#ffffff",
    tableRowEven: "#ffffff",
    tableRowOdd: "#fff7f0",
  },
  dark: {
    background: "#181818",
    cardBackground: "#232323",
    text: "#e2b892",
    highlight: "#e2b892",
    highlightHover: "#d4a88d",
    border: "#333333",
    tableHeader: "#377D5B", // Using brand green for table headers
    tableHeaderText: "#ffffff",
    tableRowEven: "#232323",
    tableRowOdd: "#1e1e1e",
  },
};

// Chart colors for consistent data visualization
export const CHART_COLORS = {
  bars: [
    "#377D5B", // Primary - Brand Green
    "#80EF80", // Secondary - Brand Dark Green
    "#d4a88d", // Tertiary - Highlight
    "#33FF99", // Accent - Neon Green
  ],
  // Additional colors for larger datasets
  extended: [
    "#C1BFFF", // Soft Purple
    "#A9DBF9", // Sky Blue
    "#FFD6B0", // Peach
    "#4CAF50", // Success Green
    "#FFC107", // Warning Yellow
  ],
};

/**
 * Get theme-specific color based on dark mode state
 * @param colorKey The color key to retrieve
 * @param darkMode Whether dark mode is enabled
 * @returns The appropriate color for the current theme
 */
export const getThemeColor = (
  colorKey: keyof typeof THEME_COLORS.light & keyof typeof THEME_COLORS.dark,
  darkMode: boolean
): string => {
  return darkMode ? THEME_COLORS.dark[colorKey] : THEME_COLORS.light[colorKey];
};

/**
 * Get chart color by index with fallback to extended colors
 * @param index The index of the color to retrieve
 * @returns The chart color at the specified index
 */
export const getChartColor = (index: number): string => {
  if (index < CHART_COLORS.bars.length) {
    return CHART_COLORS.bars[index];
  }
  // Fallback to extended colors or cycle through the primary colors
  const extendedIndex = index - CHART_COLORS.bars.length;
  if (extendedIndex < CHART_COLORS.extended.length) {
    return CHART_COLORS.extended[extendedIndex];
  }
  // Cycle through primary colors if we run out of extended colors
  return CHART_COLORS.bars[index % CHART_COLORS.bars.length];
};

/**
 * Generate CSS classes for theme-aware styling
 * @param darkMode Whether dark mode is enabled
 * @returns Object with CSS class strings for different component types
 */
export const getThemeClasses = (darkMode: boolean) => {
  return {
    // Card classes
    card: `${
      darkMode
        ? "bg-gray-900 border-gray-700 text-gray-100"
        : "bg-[#fff7f0] border-[#eae4da] text-gray-900"
    } border rounded-2xl shadow-md`,
    
    // Text classes
    text: `${darkMode ? "text-[#e2b892]" : "text-[#6b4b2b]"}`,
    textMuted: `${darkMode ? "text-gray-400" : "text-gray-600"}`,
    textHighlight: `${darkMode ? "text-[#80EF80]" : "text-[#377D5B]"}`,
    
    // Button classes
    buttonPrimary: `bg-[#377D5B] hover:bg-[#377D5B]/90 text-white font-medium rounded-full px-4 py-2 transition-colors`,
    buttonSecondary: `${
      darkMode
        ? "bg-gray-800 hover:bg-gray-700 text-white"
        : "bg-[#eae4da] hover:bg-[#d4c8b8] text-[#6b4b2b]"
    } font-medium rounded-full px-4 py-2 transition-colors`,
    
    // Table classes
    table: `min-w-full border rounded-lg text-xs md:text-sm ${
      darkMode ? "border-gray-700" : "border-[#eae4da]"
    }`,
    tableHeader: `bg-[#377D5B] text-white px-2 py-1`,
    tableRowEven: `${darkMode ? "bg-gray-800" : "bg-white"} px-2 py-1`,
    tableRowOdd: `${darkMode ? "bg-gray-900" : "bg-[#fff7f0]"} px-2 py-1`,
    
    // Chart container classes
    chartContainer: `rounded-2xl shadow p-2 sm:p-4 mx-auto w-full ${
      darkMode ? "bg-gray-900 border-gray-700" : "bg-[#fff7f0] border-[#eae4da]"
    } border overflow-x-auto`,
  };
};