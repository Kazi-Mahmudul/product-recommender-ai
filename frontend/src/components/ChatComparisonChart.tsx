import React, { useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  getChartColor,
  getThemeClasses,
  getContrastText,
  getSemanticColor,
} from "../utils/colorUtils";
import {
  ArrowRight,
  PinIcon,
  XIcon,
  BarChart2,
  Table,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useWindowSize } from "../hooks/useWindowSize";
import { useTooltipPin } from "../hooks/useTooltipPin";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import { useChartOptimization } from "../hooks/useChartOptimization";
import { useResizeHandler } from "../hooks/useResizeHandler";
import ComparisonTable from "./ComparisonTable";
import ChartErrorBoundary from "./ChartErrorBoundary";
import {
  getResponsiveChartMargins,
  shouldRotateLabels,
  getOptimalBarWidth,
  getOptimalBarGap,
  getOptimalCategoryGap,
  BREAKPOINTS,
} from "../utils/responsiveUtils";
import {
  getChartLayout,
  getOptimalChartHeight,
} from "../utils/chartLayoutManager";

import { Phone } from "../api/phones";

interface Feature {
  key: string;
  label: string;
  percent: number[];
  raw: any[];
}

interface ChatComparisonChartProps {
  phones: Phone[];
  features: Feature[];
  darkMode: boolean;
  onPhoneSelect?: (phoneId: string) => void;
  onViewDetailedComparison?: () => void;
  compact?: boolean; // New prop to allow for compact display mode
}

// Custom label for LabelList (shows correct % for every phone, responsive, mode-aware)
const CustomBarLabelList = (props: any) => {
  const { x, y, width, height, value, darkMode, containerWidth } = props;

  // Calculate font size based on container width - moved outside conditional
  const fontSize = useMemo(() => {
    if (containerWidth < BREAKPOINTS.xs) return 8;
    if (containerWidth < BREAKPOINTS.sm) return 9;
    if (containerWidth < BREAKPOINTS.md) return 10;
    return 12;
  }, [containerWidth]);

  // Determine if we should show the label inside or outside the bar
  const shouldShowOutside = height < 25 && value > 0;

  // Determine text color based on position and theme
  const getTextColor = () => {
    if (shouldShowOutside) {
      // When outside the bar, use theme text color
      return darkMode ? "#e2b892" : "#6b4b2b";
    }

    // When inside the bar, use a color with good contrast against the bar color
    const barColor = getChartColor(0, darkMode); // Default to first color if we don't know the actual bar color
    return getContrastText(barColor, darkMode);
  };

  // Calculate position for the label
  const labelPosition = useMemo(() => {
    if (shouldShowOutside) {
      return {
        x: x + width / 2,
        y: y - 5, // Position above the bar
        textAnchor: "middle",
        dominantBaseline: "bottom",
      };
    }
    return {
      x: x + width / 2,
      y: y + height / 2,
      textAnchor: "middle",
      dominantBaseline: "middle",
    };
  }, [x, y, width, height, shouldShowOutside]);

  // Only show labels if the value is positive
  if (value > 0) {
    const textColor = getTextColor();

    return (
      <>
        <text
          x={labelPosition.x}
          y={labelPosition.y}
          fill={textColor}
          textAnchor={labelPosition.textAnchor}
          dominantBaseline={labelPosition.dominantBaseline}
          fontSize={fontSize}
          fontWeight={700}
          style={{
            textShadow: shouldShowOutside
              ? "none"
              : height < 40
                ? "none"
                : "0px 1px 2px rgba(0,0,0,0.5)",
          }}
          role="presentation"
          aria-hidden="true"
        >
          {value.toFixed(1)}%
        </text>

        {/* Add a subtle highlight effect for the highest value */}
        {props.isHighest && !shouldShowOutside && (
          <circle
            cx={x + width / 2}
            cy={y + height + 3}
            r={2}
            fill={getSemanticColor("positive", darkMode)}
          />
        )}
      </>
    );
  }
  return null;
};

// Custom XAxis tick for wrapping and responsive font
const CustomXAxisTick = (props: any) => {
  const { x, y, payload, darkMode, containerWidth, rotate } = props;

  // Calculate font size based on container width
  const fontSize = useMemo(() => {
    if (containerWidth < BREAKPOINTS.xs) return 8;
    if (containerWidth < BREAKPOINTS.sm) return 10;
    if (containerWidth < BREAKPOINTS.md) return 11;
    return 13;
  }, [containerWidth]);

  // Smart text wrapping - handle long words and optimize line breaks
  const getWrappedText = (text: string, maxCharsPerLine: number = 10) => {
    // If text is short enough, return as is
    if (text.length <= maxCharsPerLine) return [text];

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    // For single long words
    if (words.length === 1) {
      const word = words[0];
      // Break long single words
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.substring(i, i + maxCharsPerLine));
      }
      return lines;
    }

    // For multiple words
    words.forEach((word) => {
      if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        // Handle long words
        if (word.length > maxCharsPerLine) {
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            lines.push(word.substring(i, i + maxCharsPerLine));
          }
          currentLine = "";
        } else {
          currentLine = word;
        }
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Determine max chars per line based on container width
  const maxCharsPerLine = useMemo(() => {
    if (containerWidth < BREAKPOINTS.xs) return 6;
    if (containerWidth < BREAKPOINTS.sm) return 8;
    if (containerWidth < BREAKPOINTS.md) return 10;
    return 12;
  }, [containerWidth]);

  // Get wrapped text lines
  const textLines = useMemo(() => {
    return rotate
      ? [payload.value]
      : getWrappedText(payload.value, maxCharsPerLine);
  }, [payload.value, rotate, maxCharsPerLine]);

  // For very small screens or when rotation is needed, use a single line with rotation
  if (rotate) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={5}
          textAnchor="end"
          fill={darkMode ? "#fff" : "#6b4b2b"}
          fontSize={fontSize}
          fontWeight={600}
          transform="rotate(-35)"
          role="presentation"
          aria-hidden="true"
        >
          {payload.value}
        </text>
      </g>
    );
  }

  // For normal display, wrap text into multiple lines
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill={darkMode ? "#fff" : "#6b4b2b"}
        fontSize={fontSize}
        fontWeight={600}
        role="presentation"
        aria-hidden="true"
      >
        {textLines.map((line: string, idx: number) => (
          <tspan
            key={idx}
            x={0}
            dy={idx === 0 ? 0 : fontSize * 1.2}
            style={{
              letterSpacing:
                containerWidth < BREAKPOINTS.sm ? "-0.2px" : "normal",
            }}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// Custom tooltip component
const CustomTooltip = ({
  active,
  payload,
  label,
  darkMode,
  containerWidth,
  isPinned,
  onTogglePin,
}: any) => {
  // Use pinned data or active data
  const isVisible = (isPinned || active) && payload && payload.length;

  if (isVisible) {
    // Determine tooltip width based on container size - smaller for mobile
    const tooltipWidth =
      containerWidth < BREAKPOINTS.xs
        ? "max-w-[180px]"
        : containerWidth < BREAKPOINTS.sm
          ? "max-w-[200px]"
          : containerWidth < BREAKPOINTS.md
            ? "max-w-[280px]"
            : "max-w-[320px]";

    // Find the best and worst values for highlighting
    const values = payload.map((entry: any) => entry.value || 0);
    const bestValue = Math.max(...values);
    const worstValue = Math.min(...values);

    // Calculate average value
    const avgValue =
      values.reduce((sum: number, val: number) => sum + val, 0) / values.length;

    // Sort entries by value (highest first)
    const sortedPayload = [...payload].sort(
      (a, b) => (b.value || 0) - (a.value || 0)
    );

    return (
      <div
        className={`${
          containerWidth < BREAKPOINTS.xs
            ? "p-2"
            : containerWidth < BREAKPOINTS.sm
              ? "p-2.5"
              : "p-3"
        } rounded-lg shadow-lg ${tooltipWidth} ${
          darkMode
            ? "bg-gray-800 text-white border-gray-700"
            : "bg-white text-gray-800 border-gray-200"
        } border`}
        style={{
          boxShadow:
            containerWidth < BREAKPOINTS.sm
              ? "0 2px 8px rgba(0,0,0,0.15)"
              : "0 4px 16px rgba(0,0,0,0.25)",
          maxHeight:
            containerWidth < BREAKPOINTS.xs
              ? "200px"
              : containerWidth < BREAKPOINTS.sm
                ? "250px"
                : "400px",
          overflow: "auto",
          animation: "tooltipFadeIn 0.2s ease-out",
          fontSize: containerWidth < BREAKPOINTS.sm ? "0.75rem" : "0.875rem",
        }}
        role="tooltip"
      >
        <div
          className={`font-semibold ${
            containerWidth < BREAKPOINTS.sm ? "mb-1" : "mb-2"
          } border-b pb-1 flex items-center justify-between gap-1`}
        >
          <div className="flex-1 text-center">
            <span className={containerWidth < BREAKPOINTS.sm ? "text-sm" : ""}>
              {label}
            </span>
            {containerWidth >= BREAKPOINTS.md && (
              <span className="text-xs font-normal opacity-70 ml-1">
                (Comparison)
              </span>
            )}
          </div>

          {/* Pin/Unpin button for touch devices */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin && onTogglePin();
            }}
            className={`p-1 rounded-full ${
              darkMode
                ? "hover:bg-gray-700 focus:bg-gray-700"
                : "hover:bg-gray-100 focus:bg-gray-100"
            } focus:outline-none transition-colors`}
            aria-label={isPinned ? "Unpin tooltip" : "Pin tooltip"}
          >
            {isPinned ? (
              <XIcon size={16} className="text-gray-400" />
            ) : (
              <PinIcon size={16} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Average score indicator */}
        <div
          className={`text-xs ${
            containerWidth < BREAKPOINTS.sm ? "mb-1" : "mb-2"
          } text-center`}
        >
          <span className="opacity-80">
            {containerWidth < BREAKPOINTS.sm ? "Avg: " : "Average: "}
          </span>
          <span className="font-medium">{avgValue.toFixed(1)}%</span>
        </div>

        {/* Sorted entries for better comparison */}
        <div
          className={
            containerWidth < BREAKPOINTS.sm ? "space-y-1" : "space-y-1.5"
          }
        >
          {sortedPayload.map((entry: any, index: number) => {
            const isHighest = entry.value === bestValue;
            const isLowest = entry.value === worstValue && payload.length > 1;
            const diffFromAvg = entry.value - avgValue;

            // Determine highlight color based on value
            const getHighlightColor = () => {
              if (isHighest) return getSemanticColor("positive", darkMode);
              if (isLowest) return getSemanticColor("negative", darkMode);
              return "";
            };

            // Determine badge text based on value
            const getBadgeText = () => {
              if (isHighest) return "Best";
              if (isLowest) return "Lowest";
              return "";
            };

            const highlightColor = getHighlightColor();
            const badgeText = getBadgeText();

            return (
              <div
                key={index}
                className={`flex items-center ${
                  containerWidth < BREAKPOINTS.sm ? "gap-1.5" : "gap-2"
                } ${containerWidth < BREAKPOINTS.sm ? "text-xs" : "text-sm"} ${
                  containerWidth < BREAKPOINTS.sm ? "py-0.5" : "py-1"
                } px-1 rounded ${
                  isHighest ? "bg-opacity-10 bg-green-500" : ""
                } ${isLowest ? "bg-opacity-10 bg-red-500" : ""}`}
              >
                <div
                  className={`${
                    containerWidth < BREAKPOINTS.sm
                      ? `w-2.5 h-2.5 ${isHighest ? "w-3 h-3" : ""}`
                      : `w-3 h-3 ${isHighest ? "w-4 h-4" : ""}`
                  } rounded-full`}
                  style={{ backgroundColor: entry.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-medium truncate ${
                        containerWidth < BREAKPOINTS.sm ? "text-xs" : ""
                      }`}
                    >
                      {containerWidth < BREAKPOINTS.xs
                        ? entry.name.length > 12
                          ? entry.name.substring(0, 12) + "..."
                          : entry.name
                        : entry.name}
                      :
                    </span>
                    <div
                      className={`flex items-center ${
                        containerWidth < BREAKPOINTS.sm ? "gap-0.5" : "gap-1"
                      }`}
                    >
                      <span
                        className={`font-semibold ${
                          containerWidth < BREAKPOINTS.sm ? "text-xs" : ""
                        }`}
                        style={{ color: highlightColor || "inherit" }}
                      >
                        {entry.value.toFixed(1)}%
                      </span>

                      {/* Show difference from average */}
                      {containerWidth >= BREAKPOINTS.md && (
                        <span
                          className="text-xs"
                          style={{
                            color:
                              diffFromAvg > 0
                                ? getSemanticColor("positive", darkMode)
                                : diffFromAvg < 0
                                  ? getSemanticColor("negative", darkMode)
                                  : darkMode
                                    ? "rgba(255,255,255,0.7)"
                                    : "rgba(0,0,0,0.7)",
                          }}
                        >
                          {diffFromAvg > 0 ? "+" : ""}
                          {diffFromAvg.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Raw value and badge row */}
                  {(containerWidth >= BREAKPOINTS.sm || badgeText) && (
                    <div
                      className={`flex items-center justify-between ${
                        containerWidth < BREAKPOINTS.sm ? "text-xs" : "text-xs"
                      } ${containerWidth < BREAKPOINTS.sm ? "mt-0" : "mt-0.5"}`}
                    >
                      {entry.payload &&
                        entry.payload[`${entry.name}_raw`] &&
                        containerWidth >= BREAKPOINTS.sm && (
                          <span className="opacity-80">
                            Raw: {entry.payload[`${entry.name}_raw`]}
                          </span>
                        )}

                      {badgeText && (
                        <span
                          className={`${
                            containerWidth < BREAKPOINTS.sm
                              ? "px-1 py-0.5 text-xs"
                              : "px-1.5 py-0.5 text-xs"
                          } rounded font-medium`}
                          style={{
                            backgroundColor: highlightColor,
                            color: "#fff",
                          }}
                        >
                          {badgeText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const ChatComparisonChart: React.FC<ChatComparisonChartProps> = ({
  phones,
  features,
  darkMode,
  onPhoneSelect,
  onViewDetailedComparison,
  compact = false,
}) => {
  const themeClasses = getThemeClasses(darkMode);
  const { width: rawWindowWidth, isMobile, orientation } = useWindowSize();

  // Use efficient resize handler
  const { isResizing, windowSize: optimizedWindowSize } = useResizeHandler(250);

  // Use optimized window width during resize
  const windowWidth = isResizing ? optimizedWindowSize.width : rawWindowWidth;

  // Use intersection observer to detect when chart is visible
  const { ref: chartRef, isIntersecting: isChartVisible } =
    useIntersectionObserver<HTMLDivElement>({
      threshold: 0.1,
      rootMargin: "100px",
    });

  // Calculate total data points for optimization
  const totalDataPoints = useMemo(
    () => phones.length * features.length,
    [phones.length, features.length]
  );

  // Get optimization settings
  const {
    enableAnimations: baseEnableAnimations,
    animationDuration: baseAnimationDuration,
    useSimplifiedRendering: baseUseSimplifiedRendering,
  } = useChartOptimization(totalDataPoints, isChartVisible);

  // Disable animations during resize
  const enableAnimations = isResizing ? false : baseEnableAnimations;
  const animationDuration = isResizing ? 0 : baseAnimationDuration;
  const useSimplifiedRendering = isResizing ? true : baseUseSimplifiedRendering;

  // Use tooltip pin hook for touch-friendly tooltip behavior
  const { isPinned, pinnedPayload, pinnedLabel, togglePin, unpinTooltip } =
    useTooltipPin();

  // Get chart layout configuration
  const chartLayout = useMemo(() => {
    // Calculate data complexity based on number of phones and features
    const dataComplexity = Math.min(
      5,
      Math.ceil((phones.length + features.length) / 4)
    );

    // Use simplified layout during resize
    const useSimplifiedLayout = isResizing && totalDataPoints > 10;

    return getChartLayout(
      windowWidth,
      compact || useSimplifiedLayout,
      dataComplexity,
      orientation
    );
  }, [
    windowWidth,
    compact,
    phones.length,
    features.length,
    orientation,
    isResizing,
    totalDataPoints,
  ]);

  // Calculate optimal chart height
  const chartHeight = useMemo(
    () => getOptimalChartHeight(windowWidth, chartLayout),
    [windowWidth, chartLayout]
  );

  // Calculate if labels should be rotated
  const rotateLabels = useMemo(
    () => shouldRotateLabels(windowWidth, features.length),
    [windowWidth, features.length]
  );

  // Calculate responsive margins
  const chartMargins = useMemo(
    () => getResponsiveChartMargins(windowWidth, "bar", "vertical", true),
    [windowWidth]
  );

  // Format data for the chart - memoized for performance with error handling
  const chartData = useMemo(() => {
    try {
      // If using simplified rendering and we have a lot of data points,
      // we can optimize by reducing precision of percentage values
      const formatValue = useSimplifiedRendering
        ? (val: number) => Math.round(val)
        : (val: number) => val;

      return features.map((feature) => {
        const obj: any = { feature: feature.label };
        phones.forEach((phone, idx) => {
          // Add error handling for missing or invalid data
          const percentValue = feature.percent[idx];
          const rawValue = feature.raw[idx];

          // Ensure percent value is a valid number
          obj[phone.name] =
            typeof percentValue === "number" && !isNaN(percentValue)
              ? formatValue(percentValue)
              : 0;

          // Include raw value if available
          if (rawValue !== undefined && rawValue !== null) {
            obj[`${phone.name}_raw`] = rawValue;
          }
        });
        return obj;
      });
    } catch (error) {
      console.error("Error processing chart data:", error);
      // Don't set state during render - we'll handle errors with error boundaries instead
      return [];
    }
  }, [features, phones, useSimplifiedRendering]);

  // Calculate average scores for visualization enhancements
  const averageScores = useMemo(() => {
    if (!phones || !features || phones.length < 1) return [];

    return phones.map((phone, phoneIdx) => {
      const scores = features.map((feature) => feature.percent[phoneIdx]);
      return {
        phone,
        avgScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      };
    });
  }, [phones, features]);

  // Generate enhanced summary text with more insights
  const summaryPoints = useMemo(() => {
    if (!phones || !features || phones.length < 2) return [];

    const points: Array<{
      text: string;
      type: "leader" | "close" | "gap";
      importance: number;
    }> = [];

    // Find leaders in each feature
    features.forEach((feature) => {
      const values = feature.percent;
      const maxValue = Math.max(...values);
      const maxIdx = values.indexOf(maxValue);

      if (maxIdx >= 0 && maxIdx < phones.length) {
        // Add leader insight
        points.push({
          text: `${phones[maxIdx].name} leads in ${feature.label} with ${maxValue.toFixed(1)}%`,
          type: "leader",
          importance: 10,
        });

        // Find close competitors (within 5%)
        const closeCompetitors = phones.filter((phone, idx) => {
          const value = values[idx];
          return idx !== maxIdx && maxValue - value <= 5;
        });

        if (closeCompetitors.length === 1) {
          points.push({
            text: `${closeCompetitors[0].name} is a close competitor in ${feature.label}`,
            type: "close",
            importance: 5,
          });
        } else if (closeCompetitors.length > 1) {
          points.push({
            text: `${closeCompetitors.length} phones are close competitors in ${feature.label}`,
            type: "close",
            importance: 5,
          });
        }

        // Find significant gaps (more than 15%)
        const minValue = Math.min(...values);
        if (maxValue - minValue > 15) {
          const minIdx = values.indexOf(minValue);
          points.push({
            text: `${phones[maxIdx].name} outperforms ${phones[minIdx].name} by ${(maxValue - minValue).toFixed(1)}% in ${feature.label}`,
            type: "gap",
            importance: 7,
          });
        }
      }
    });

    // Find overall best performer
    if (features.length > 1) {
      const averageScores = phones.map((phone, phoneIdx) => {
        const scores = features.map((feature) => feature.percent[phoneIdx]);
        return {
          phone,
          avgScore:
            scores.reduce((sum, score) => sum + score, 0) / scores.length,
        };
      });

      const bestOverall = averageScores.reduce(
        (best, current) => (current.avgScore > best.avgScore ? current : best),
        averageScores[0]
      );

      points.push({
        text: `${bestOverall.phone.name} has the best overall performance with an average score of ${bestOverall.avgScore.toFixed(1)}%`,
        type: "leader",
        importance: 15,
      });
    }

    // Sort by importance and limit to 5 most important insights
    return points
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5)
      .map((point) => point.text);
  }, [phones, features]);

  // Calculate optimal bar width and spacing with increased width
  const barSize = useMemo(
    () =>
      Math.max(
        20,
        getOptimalBarWidth(windowWidth, features.length, phones.length) * 1.2
      ),
    [windowWidth, features.length, phones.length]
  );

  // Calculate optimal gaps between bars and categories with increased spacing
  const barGap = useMemo(
    () => Math.max(0.3, getOptimalBarGap(windowWidth, phones.length) * 1.5),
    [windowWidth, phones.length]
  );

  const categoryGap = useMemo(
    () =>
      Math.max(0.4, getOptimalCategoryGap(windowWidth, features.length) * 1.5),
    [windowWidth, features.length]
  );

  // Add effect to handle clicks outside the tooltip to unpin
  React.useEffect(() => {
    if (!isPinned) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside tooltip
      const tooltipElement = document.querySelector('[role="tooltip"]');
      if (tooltipElement && !tooltipElement.contains(e.target as Node)) {
        unpinTooltip();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isPinned, unpinTooltip]);

  // Add effect to handle orientation changes
  React.useEffect(() => {
    // When orientation changes, unpin any pinned tooltips
    if (isPinned) {
      unpinTooltip();
    }
  }, [orientation, isPinned, unpinTooltip]);

  // Add effect to handle chart data errors
  React.useEffect(() => {
    // Check if chart data is valid
    if (chartData.length === 0 && features.length > 0) {
      setHasRenderError(true);
      setViewMode("table");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, features.length]);

  // State for keyboard navigation
  const [focusedBarIndex, setFocusedBarIndex] = React.useState<number | null>(
    null
  );
  const [focusedPhoneIndex, setFocusedPhoneIndex] = React.useState<
    number | null
  >(null);

  // State for insights section collapsible
  const [insightsCollapsed, setInsightsCollapsed] =
    React.useState<boolean>(false);

  // State for view toggle (chart or table)
  const [viewMode, setViewMode] = React.useState<"chart" | "table">("chart");

  // State for chart rendering error
  const [hasRenderError, setHasRenderError] = React.useState<boolean>(false);

  // State for chart retry counter
  const [retryCount, setRetryCount] = React.useState<number>(0);

  // Function to retry chart rendering
  const retryChartRendering = useCallback(() => {
    setHasRenderError(false);
    setViewMode("chart");
    setRetryCount((prev) => prev + 1);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (focusedBarIndex === null || focusedPhoneIndex === null) return;

      switch (e.key) {
        case "ArrowRight":
          // Move to next phone in same feature
          setFocusedPhoneIndex((prev) =>
            prev !== null ? Math.min(prev + 1, phones.length - 1) : 0
          );
          e.preventDefault();
          break;
        case "ArrowLeft":
          // Move to previous phone in same feature
          setFocusedPhoneIndex((prev) =>
            prev !== null ? Math.max(prev - 1, 0) : 0
          );
          e.preventDefault();
          break;
        case "ArrowUp":
          // Move to same phone in previous feature
          setFocusedBarIndex((prev) =>
            prev !== null ? Math.max(prev - 1, 0) : 0
          );
          e.preventDefault();
          break;
        case "ArrowDown":
          // Move to same phone in next feature
          setFocusedBarIndex((prev) =>
            prev !== null ? Math.min(prev + 1, features.length - 1) : 0
          );
          e.preventDefault();
          break;
        case "Enter":
        case " ":
          // Select the phone if onPhoneSelect is provided
          if (onPhoneSelect && focusedPhoneIndex !== null) {
            const phone = phones[focusedPhoneIndex];
            if (phone && phone.id) {
              onPhoneSelect(String(phone.id));
              e.preventDefault();
            }
          }
          break;
        case "Escape":
          // Clear focus
          setFocusedBarIndex(null);
          setFocusedPhoneIndex(null);
          e.preventDefault();
          break;
      }
    },
    [focusedBarIndex, focusedPhoneIndex, phones, features.length, onPhoneSelect]
  );

  return (
    <div
      ref={chartRef}
      className={`${themeClasses.chartContainer}`}
      role="region"
      aria-label="Phone feature comparison chart"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="font-semibold mb-2 text-[#377D5B] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span id="chart-title">Feature Comparison</span>
          {isResizing && (
            <span className="text-xs opacity-70 animate-pulse">
              Resizing...
            </span>
          )}
          <span className="text-xs opacity-70 ml-2 hidden sm:inline-block">
            (Hover over bars to see values)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle buttons */}
          {!compact && (
            <div className="flex rounded-md overflow-hidden border border-[#377D5B] mr-2">
              <button
                onClick={() => setViewMode("chart")}
                className={`flex items-center gap-1 px-2 py-1 text-xs ${
                  viewMode === "chart"
                    ? "bg-[#377D5B] text-white"
                    : "bg-transparent text-[#377D5B] hover:bg-[#377D5B]/10"
                } transition-colors`}
                aria-label="Switch to chart view"
                aria-pressed={viewMode === "chart"}
              >
                <BarChart2 size={12} />
                <span className="hidden sm:inline">Chart</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2 py-1 text-xs ${
                  viewMode === "table"
                    ? "bg-[#377D5B] text-white"
                    : "bg-transparent text-[#377D5B] hover:bg-[#377D5B]/10"
                } transition-colors`}
                aria-label="Switch to table view"
                aria-pressed={viewMode === "table"}
              >
                <Table size={12} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          )}

          {compact && onViewDetailedComparison && (
            <button
              onClick={onViewDetailedComparison}
              className="text-xs flex items-center gap-1 font-medium text-[#377D5B] hover:text-[#377D5B]/80 transition-colors"
              aria-label="View detailed comparison"
            >
              Details
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Screen reader instructions */}
      <div className="sr-only">
        {viewMode === "chart"
          ? "Use arrow keys to navigate between bars. Press Enter to select a phone."
          : "Table view showing phone comparison data."}
      </div>

      {/* Error message if chart rendering fails */}
      {hasRenderError && viewMode === "chart" && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-md mb-3 text-sm">
          <p className="font-medium">Chart rendering failed</p>
          <p className="text-xs mt-1">
            Switched to table view for compatibility. You can try switching back
            to chart view.
          </p>
        </div>
      )}

      {/* Render chart or table based on view mode */}
      {viewMode === "table" ? (
        <ComparisonTable
          phones={phones}
          features={features}
          darkMode={darkMode}
          onPhoneSelect={onPhoneSelect}
          compact={compact}
        />
      ) : (
        <ChartErrorBoundary
          onError={(error) => {
            console.error("Chart rendering error:", error);
            setHasRenderError(true);
            setViewMode("table");
          }}
          fallback={
            <div className="p-4 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30 rounded-md">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="text-red-500 dark:text-red-400 mt-0.5"
                  size={20}
                />
                <div>
                  <h3 className="font-semibold text-red-700 dark:text-red-300">
                    Chart rendering failed
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    We've encountered an error while rendering the chart.
                    Switching to table view for compatibility.
                  </p>
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={retryChartRendering}
                      className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 px-3 py-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                    >
                      <RefreshCw size={12} />
                      Retry Chart
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Table size={12} />
                      View as Table
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <div
            key={`chart-container-${retryCount}`}
            className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
            style={{
              height: chartHeight,
              scrollbarWidth: "thin",
              scrollbarColor: darkMode ? "#555 #333" : "#ccc #f0f0f0",
            }}
            aria-labelledby="chart-title"
          >
            <ResponsiveContainer
              width={Math.max(800, phones.length * features.length * 40 + 200)}
              height="100%"
              aria-hidden="false"
            >
              <BarChart
                data={chartData}
                margin={chartMargins}
                barSize={barSize}
                barGap={barGap}
                barCategoryGap={`${categoryGap * 100}%`}
                // Performance optimizations
                throttleDelay={useSimplifiedRendering ? 100 : 0}
                // Add gradient background for better visual appeal
                style={{
                  background: darkMode
                    ? "linear-gradient(180deg, rgba(55,55,55,0.1) 0%, rgba(30,30,30,0) 100%)"
                    : "linear-gradient(180deg, rgba(240,240,240,0.2) 0%, rgba(255,255,255,0) 100%)",
                }}
              >
                {/* Conditionally render grid */}
                {chartLayout.componentVisibility.grid && (
                  <>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={
                        darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                      }
                    />

                    {/* Add reference lines for better visualization */}
                    <ReferenceLine
                      y={75}
                      stroke={getSemanticColor("positive", darkMode)}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{
                        value: windowWidth >= BREAKPOINTS.md ? "Good" : "",
                        position: "insideLeft",
                        fill: getSemanticColor("positive", darkMode),
                        fontSize: 10,
                      }}
                    />

                    <ReferenceLine
                      y={50}
                      stroke={
                        darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"
                      }
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{
                        value: windowWidth >= BREAKPOINTS.md ? "Average" : "",
                        position: "insideLeft",
                        fill: darkMode
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                        fontSize: 10,
                      }}
                    />

                    <ReferenceLine
                      y={25}
                      stroke={getSemanticColor("negative", darkMode)}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{
                        value: windowWidth >= BREAKPOINTS.md ? "Poor" : "",
                        position: "insideLeft",
                        fill: getSemanticColor("negative", darkMode),
                        fontSize: 10,
                      }}
                    />
                  </>
                )}

                {/* X-Axis */}
                {chartLayout.componentVisibility.xAxis && (
                  <XAxis
                    dataKey="feature"
                    tick={(props) => (
                      <CustomXAxisTick
                        {...props}
                        darkMode={darkMode}
                        containerWidth={windowWidth}
                        rotate={rotateLabels}
                      />
                    )}
                    interval={0}
                    height={rotateLabels ? 60 : isMobile ? 50 : 70}
                    tickMargin={rotateLabels ? 5 : isMobile ? 16 : 24}
                    axisLine={{ stroke: darkMode ? "#333" : "#eae4da" }}
                    tickLine={{ stroke: darkMode ? "#333" : "#eae4da" }}
                  />
                )}

                {/* Y-Axis */}
                {chartLayout.componentVisibility.yAxis && (
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{
                      fontSize: windowWidth < BREAKPOINTS.sm ? 9 : 11,
                      fill: darkMode ? "#fff" : "#6b4b2b",
                    }}
                    axisLine={{ stroke: darkMode ? "#333" : "#eae4da" }}
                    tickLine={{ stroke: darkMode ? "#333" : "#eae4da" }}
                    width={windowWidth < BREAKPOINTS.sm ? 30 : 40}
                    ticks={
                      windowWidth < BREAKPOINTS.sm
                        ? [0, 25, 50, 75, 100]
                        : [0, 20, 40, 60, 80, 100]
                    }
                    allowDecimals={false}
                    minTickGap={5}
                    padding={{ top: 10, bottom: 0 }}
                    label={
                      chartLayout.componentVisibility.yAxis &&
                      windowWidth >= BREAKPOINTS.md
                        ? {
                            value: "Score (%)",
                            angle: -90,
                            position: "insideLeft",
                            style: {
                              textAnchor: "middle",
                              fill: darkMode ? "#e2b892" : "#6b4b2b",
                              fontSize: windowWidth < BREAKPOINTS.md ? 10 : 12,
                            },
                          }
                        : undefined
                    }
                  />
                )}

                {/* Enhanced Tooltip */}
                <Tooltip
                  content={(props) => (
                    <CustomTooltip
                      {...props}
                      darkMode={darkMode}
                      containerWidth={windowWidth}
                      isPinned={isPinned}
                      onTogglePin={() => {
                        if (togglePin && props.payload && props.label) {
                          togglePin(props.payload, String(props.label));
                        }
                      }}
                    />
                  )}
                  cursor={{
                    fill: darkMode
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.1)",
                    strokeWidth: 1,
                    stroke: darkMode
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(0,0,0,0.2)",
                  }}
                  wrapperStyle={{
                    outline: "none",
                    zIndex: 10,
                  }}
                  allowEscapeViewBox={{ x: false, y: false }}
                  animationDuration={100}
                  animationEasing="ease-out"
                  isAnimationActive={false}
                />

                {/* Legend */}
                {chartLayout.componentVisibility.legend &&
                  !useSimplifiedRendering && (
                    <Legend
                      verticalAlign={
                        windowWidth < BREAKPOINTS.md ? "bottom" : "top"
                      }
                      align={windowWidth < BREAKPOINTS.md ? "center" : "right"}
                      height={36}
                      iconSize={windowWidth < BREAKPOINTS.sm ? 8 : 10}
                      iconType="circle"
                      formatter={(value) => (
                        <span
                          style={{
                            color: darkMode ? "#e2b892" : "#6b4b2b",
                            fontSize: windowWidth < BREAKPOINTS.sm ? 10 : 12,
                          }}
                        >
                          {value}
                        </span>
                      )}
                      wrapperStyle={{
                        paddingTop: windowWidth < BREAKPOINTS.md ? 10 : 0,
                      }}
                    />
                  )}

                {phones.map((phone, phoneIndex) => {
                  // Find features where this phone has the highest value
                  const highestFeatures = features.map((feature) => {
                    const maxIdx = feature.percent.indexOf(
                      Math.max(...feature.percent)
                    );
                    return maxIdx === phoneIndex;
                  });

                  return (
                    <Bar
                      key={phone.name}
                      dataKey={phone.name}
                      onClick={() =>
                        onPhoneSelect && phone.id && onPhoneSelect(String(phone.id))
                      }
                      onFocus={() => {
                        setFocusedPhoneIndex(phoneIndex);
                      }}
                      cursor={onPhoneSelect ? "pointer" : "default"}
                      animationDuration={animationDuration}
                      animationEasing="ease-out"
                      isAnimationActive={enableAnimations}
                      role="button"
                      tabIndex={0}
                      aria-label={`${phone.name} data series with average score ${averageScores[phoneIndex]?.avgScore.toFixed(1)}%`}
                      // Add a label for the average score
                      name={`${phone.name} (Avg: ${averageScores[phoneIndex]?.avgScore.toFixed(1)}%)`}
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getChartColor(phoneIndex, darkMode)}
                          style={{
                            // Add visual enhancements
                            opacity: highestFeatures[index] ? 1 : 0.9,
                            // Add focus outline for keyboard navigation
                            stroke:
                              focusedBarIndex === index &&
                              focusedPhoneIndex === phoneIndex
                                ? "#ffffff"
                                : highestFeatures[index]
                                  ? getSemanticColor("positive", darkMode)
                                  : "none",
                            strokeWidth:
                              focusedBarIndex === index &&
                              focusedPhoneIndex === phoneIndex
                                ? 2
                                : highestFeatures[index]
                                  ? 1
                                  : 0,
                            // Add subtle glow effect for best-in-category
                            filter: highestFeatures[index]
                              ? "drop-shadow(0px 0px 3px rgba(128, 239, 128, 0.5))"
                              : "none",
                            // Add hover effect to indicate interactivity
                            transition: "all 0.2s ease-out",
                            cursor: "pointer",
                          }}
                          className="hover:opacity-100 hover:brightness-110"
                          role="graphics-symbol"
                          aria-label={`${phone.name} ${features[index].label} score: ${features[index].percent[phoneIndex]}%${highestFeatures[index] ? ", best in category" : ""}`}
                          tabIndex={0}
                          onFocus={() => {
                            setFocusedBarIndex(index);
                            setFocusedPhoneIndex(phoneIndex);
                          }}
                        />
                      ))}
                      {/* Labels removed as per requirement to only show values on hover */}
                    </Bar>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartErrorBoundary>
      )}

      {/* Enhanced Summary section - only show if enabled in layout and in chart view */}
      {viewMode === "chart" &&
        summaryPoints.length > 0 &&
        chartLayout.componentVisibility.summary && (
          <div
            className={`mt-3 ${darkMode ? "text-white" : "text-brand"} transition-all duration-300 ease-in-out`}
            aria-label="Key insights from the comparison"
          >
            <div className="flex items-center justify-between">
              <div
                className="font-semibold mb-2 text-sm flex items-center gap-1"
                id="insights-title"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Key Insights
              </div>
              {/* Collapsible control for mobile */}
              {isMobile && (
                <button
                  className="text-xs opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1"
                  onClick={() => setInsightsCollapsed(!insightsCollapsed)}
                  aria-expanded={!insightsCollapsed}
                  aria-controls="insights-list"
                >
                  {insightsCollapsed ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                      Show
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                      Hide
                    </>
                  )}
                </button>
              )}
            </div>

            <div
              id="insights-list"
              className={`bg-opacity-10 rounded-lg p-2 border border-opacity-10 transition-all duration-300 ${isMobile && insightsCollapsed ? "max-h-0 opacity-0 overflow-hidden p-0 my-0" : "max-h-96 opacity-100"}`}
              style={{
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
                borderColor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
              }}
            >
              <ul
                className="list-none space-y-2 text-xs sm:text-sm"
                aria-labelledby="insights-title"
              >
                {summaryPoints.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 pb-2 border-b last:border-b-0 border-opacity-10 transition-all duration-300 hover:bg-opacity-5 rounded px-1"
                    style={{
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                      animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s both`,
                    }}
                  >
                    <span className="text-[#377D5B] dark:text-[#80EF80] mt-0.5">
                      •
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add some CSS animation */}
            <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(5px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          </div>
        )}

      {/* Action button - only show if not in compact mode and not already shown in header */}
      {onViewDetailedComparison && !compact && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onViewDetailedComparison}
            className="flex items-center gap-1 text-sm font-medium text-[#377D5B] hover:text-[#377D5B]/80 transition-colors"
            aria-label="View detailed comparison"
          >
            View Detailed Comparison
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatComparisonChart;
