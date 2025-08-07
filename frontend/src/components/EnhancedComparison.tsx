import React, { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from "recharts";
import { Phone } from "../api/phones";
import { Plus, Minus, Eye, TrendingUp, Award } from "lucide-react";
import { useWindowSize } from "../hooks/useWindowSize";

interface EnhancedComparisonProps {
  phones: Phone[];
  features: ComparisonFeature[];
  summary: string;
  darkMode: boolean;
  onAddPhone?: (phone: Phone) => void;
  onRemovePhone?: (phoneId: string) => void;
  onFeatureFocus?: (feature: string) => void;
}

interface ComparisonFeature {
  key: string;
  label: string;
  raw: any[];
  percent: number[];
}

const EnhancedComparison: React.FC<EnhancedComparisonProps> = ({
  phones,
  features,
  summary,
  darkMode,
  onAddPhone,
  onRemovePhone,
  onFeatureFocus,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [hoveredPhone, setHoveredPhone] = useState<string | null>(null);
  const { width: windowWidth, isMobile } = useWindowSize();

  // Calculate optimal bar dimensions
  const barDimensions = useMemo(() => {
    if (isMobile) {
      // For mobile, use more compact settings
      return {
        barSize: Math.max(30, Math.min(50, 300 / features.length)), // Responsive bar size based on feature count
        barGap: 0.1, // Smaller gap between bars
        categoryGap: 0.2, // Smaller gap between categories
      };
    } else {
      // For desktop, use more spacious settings
      const totalBars = phones.length * features.length;
      const availableWidth = windowWidth * 0.8;
      const optimalBarWidth = Math.max(
        20,
        Math.min(60, availableWidth / totalBars)
      );

      return {
        barSize: optimalBarWidth,
        barGap: 0.3,
        categoryGap: 0.4,
      };
    }
  }, [phones.length, features.length, isMobile, windowWidth]);

  // Enhanced color palette for better visual appeal
  const phoneColors = useMemo(
    () => [
      "#4F46E5", // Indigo
      "#059669", // Emerald
      "#DC2626", // Red
      "#7C3AED", // Violet
      "#EA580C", // Orange
    ],
    []
  );

  // Prepare chart data with proper 100% stacked normalization
  const chartData = useMemo(() => {
    return features.map((feature) => {
      const dataPoint: any = {
        feature: feature.label,
        key: feature.key,
      };

      // For 100% stacked bars, normalize so all phones add up to 100% for each feature
      const validValues = feature.percent.filter(
        (val) => typeof val === "number" && !isNaN(val)
      );
      const totalValue = validValues.reduce((sum, val) => sum + val, 0);

      phones.forEach((phone, index) => {
        const percentValue = feature.percent[index];

        // Calculate the percentage of this phone relative to all phones for this feature
        let stackedPercentage = 0;
        if (
          typeof percentValue === "number" &&
          !isNaN(percentValue) &&
          totalValue > 0
        ) {
          // This gives us the percentage this phone contributes to the total
          stackedPercentage = (percentValue / totalValue) * 100;
        }

        dataPoint[phone.name] = stackedPercentage;
        dataPoint[`${phone.name}_original`] =
          typeof percentValue === "number" && !isNaN(percentValue)
            ? percentValue
            : 0;
        dataPoint[`${phone.name}_raw`] = feature.raw[index];
        dataPoint[`${phone.name}_color`] =
          phoneColors[index % phoneColors.length];
      });

      return dataPoint;
    });
  }, [phones, features, phoneColors]);

  // Helper function to get units for different features
  const getUnit = useCallback((featureKey: string): string => {
    const units: Record<string, string> = {
      price_original: " BDT",
      ram_gb: "GB",
      storage_gb: "GB",
      primary_camera_mp: "MP",
      selfie_camera_mp: "MP",
      battery_capacity_numeric: "mAh",
      display_score: "/10",
      camera_score: "/10",
      battery_score: "/10",
      performance_score: "/10",
      overall_device_score: "/10",
    };
    return units[featureKey] || "";
  }, []);

  // Generate insights for the comparison
  const insights = useMemo(() => {
    const insights: string[] = [];

    features.forEach((feature) => {
      const maxIndex = feature.percent.indexOf(Math.max(...feature.percent));
      const maxPhone = phones[maxIndex];
      const maxValue = feature.raw[maxIndex];

      if (maxPhone && maxValue !== null && maxValue !== undefined) {
        insights.push(
          `${maxPhone.name} leads in ${feature.label} with ${maxValue}${getUnit(feature.key)}`
        );
      }
    });

    return insights.slice(0, 3); // Show top 3 insights
  }, [phones, features, getUnit]);

  const handleFeatureClick = (feature: string) => {
    setSelectedFeature(selectedFeature === feature ? null : feature);
    if (onFeatureFocus) {
      onFeatureFocus(feature);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const feature = features.find((f) => f.label === label);
      return (
        <div
          className={`p-4 rounded-lg shadow-xl border-2 ${
            darkMode
              ? "bg-gray-800 border-gray-600 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <p className="font-bold text-lg mb-3 text-center">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              const rawValue = entry.payload[`${entry.dataKey}_raw`];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium">{entry.dataKey}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {(entry.payload[`${entry.dataKey}_original`] !== undefined
                        ? entry.payload[`${entry.dataKey}_original`]
                        : entry.value
                      ).toFixed(1)}
                      %
                    </div>
                    <div className="text-sm opacity-75">
                      {rawValue}
                      {getUnit(feature?.key || "")}
                    </div>
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

  const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value, payload, dataKey } = props;

    // Add safety checks
    if (!payload || !dataKey || value <= 8) {
      return null;
    }

    try {
      // Show the original percentage value (same as in tooltip)
      const originalKey = `${dataKey}_original`;
      const originalValue =
        payload && payload[originalKey] !== undefined
          ? payload[originalKey]
          : value;

      return (
        <text
          x={x + width / 2}
          y={y + height / 2}
          fill="white"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={isMobile ? "9" : "11"}
          fontWeight="600"
          style={{
            textShadow: "0px 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {originalValue.toFixed(1)}%
        </text>
      );
    } catch (error) {
      console.error("Error in CustomBarLabel:", error, {
        payload,
        dataKey,
        value,
      });
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div
        className={`p-6 rounded-xl ${
          darkMode
            ? "bg-gradient-to-r from-gray-800 to-gray-700"
            : "bg-gradient-to-r from-blue-50 to-indigo-50"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2 rounded-lg ${darkMode ? "bg-blue-600" : "bg-blue-500"}`}
          >
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Phone Comparison</h3>
            <p
              className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              Interactive comparison of {phones.length} phones across{" "}
              {features.length} features
            </p>
          </div>
        </div>

        {/* Key Insights */}
        {insights.length > 0 && (
          <div
            className={`p-4 rounded-lg ${
              darkMode ? "bg-gray-700/50" : "bg-white/70"
            } backdrop-blur-sm`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Award
                className={darkMode ? "text-yellow-400" : "text-yellow-500"}
                size={20}
              />
              <h4 className="font-semibold">Key Insights</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`text-sm p-2 rounded ${
                    darkMode ? "bg-gray-600/50" : "bg-gray-100/50"
                  }`}
                >
                  • {insight}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phones.map((phone, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
              hoveredPhone === phone.name
                ? darkMode
                  ? "border-blue-400 bg-gray-700 shadow-lg"
                  : "border-blue-400 bg-blue-50 shadow-lg"
                : darkMode
                  ? "border-gray-600 bg-gray-800 hover:border-gray-500"
                  : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            onMouseEnter={() => setHoveredPhone(phone.name)}
            onMouseLeave={() => setHoveredPhone(null)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: phoneColors[index % phoneColors.length],
                }}
              />
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{phone.name}</h4>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {phone.brand}
                </p>
              </div>
              {onRemovePhone && (
                <button
                  onClick={() => onRemovePhone(phone.id?.toString() || "")}
                  className={`p-1 rounded-full transition-colors ${
                    darkMode
                      ? "hover:bg-red-600 text-red-400"
                      : "hover:bg-red-100 text-red-500"
                  }`}
                  title="Remove from comparison"
                >
                  <Minus size={16} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {features.slice(0, 3).map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className="flex justify-between items-center"
                >
                  <span
                    className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                  >
                    {feature.label}:
                  </span>
                  <span className="font-medium">
                    {feature.raw[index]}
                    {getUnit(feature.key)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add Phone Button */}
        {onAddPhone && phones.length < 5 && (
          <div
            className={`p-4 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[200px] ${
              darkMode
                ? "border-gray-600 hover:border-gray-500 bg-gray-800/50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
            }`}
            onClick={() => {
              /* This would trigger a phone selection modal */
            }}
          >
            <Plus
              size={32}
              className={darkMode ? "text-gray-400" : "text-gray-500"}
            />
            <p
              className={`mt-2 text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Add Phone
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Chart */}
      <div
        className={`p-6 rounded-xl ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border`}
      >
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-semibold">Feature Comparison</h4>
          <div className="flex items-center gap-2 text-sm">
            <Eye size={16} />
            <span>Click on features for details</span>
          </div>
        </div>

        <div
          className={`${isMobile ? "h-80" : "h-96"} w-full ${isMobile ? "overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200" : ""}`}
          style={
            isMobile
              ? {
                  overflowX: "scroll",
                  WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
                  scrollbarWidth: "thin",
                  scrollbarColor: darkMode ? "#555 #333" : "#ccc #f0f0f0",
                }
              : {}
          }
        >
          <ResponsiveContainer
            width={
              isMobile
                ? Math.max(400, features.length * 60 + 150) // More compact calculation for mobile
                : "100%"
            }
            height="100%"
          >
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: isMobile ? 15 : 30,
                left: isMobile ? 10 : 20,
                bottom: isMobile ? 80 : 60,
              }}
              barSize={barDimensions.barSize}
              barGap={barDimensions.barGap}
              barCategoryGap={`${barDimensions.categoryGap * 100}%`}
              onClick={(data) => {
                if (data && data.activeLabel) {
                  handleFeatureClick(data.activeLabel);
                }
              }}
            >
              <XAxis
                dataKey="feature"
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: darkMode ? "#d1d5db" : "#374151",
                  textAnchor: "end",
                }}
                angle={isMobile ? -45 : -30}
                height={isMobile ? 100 : 80}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                type="number"
                tickFormatter={(v) => `${v}%`}
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: darkMode ? "#d1d5db" : "#374151",
                }}
                ticks={
                  isMobile ? [0, 25, 50, 75, 100] : [0, 20, 40, 60, 80, 100]
                }
                allowDecimals={false}
                includeHidden={false}
                width={isMobile ? 30 : 40}
              />
              <Tooltip content={<CustomTooltip />} />
              {!isMobile && (
                <Legend
                  wrapperStyle={{
                    fontSize: 14,
                    paddingTop: "20px",
                  }}
                />
              )}

              {phones.map((phone, index) => (
                <Bar
                  key={phone.name}
                  dataKey={phone.name}
                  stackId="a"
                  fill={phoneColors[index % phoneColors.length]}
                  radius={
                    index === phones.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                  }
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <LabelList content={CustomBarLabel} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Details */}
        {selectedFeature && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-50"
            }`}
          >
            <h5 className="font-semibold mb-2">{selectedFeature} Details</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {phones.map((phone, index) => {
                const feature = features.find(
                  (f) => f.label === selectedFeature
                );
                const value = feature?.raw[index];
                return (
                  <div
                    key={index}
                    className={`p-3 rounded ${
                      darkMode ? "bg-gray-600" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            phoneColors[index % phoneColors.length],
                        }}
                      />
                      <span className="font-medium">{phone.name}</span>
                    </div>
                    <div className="text-lg font-bold">
                      {value}
                      {getUnit(feature?.key || "")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Summary */}
      {summary && (
        <div
          className={`p-6 rounded-xl ${
            darkMode
              ? "bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-700/30"
              : "bg-gradient-to-r from-green-50 to-blue-50 border-green-200"
          } border`}
        >
          <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Award
              className={darkMode ? "text-green-400" : "text-green-600"}
              size={20}
            />
            Comparison Summary
          </h4>
          <p
            className={`${darkMode ? "text-gray-200" : "text-gray-700"} leading-relaxed`}
          >
            {summary}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedComparison;
