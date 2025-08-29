import React, { useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer 
} from "recharts";
import { Phone } from "../api/phones";

interface ChartVisualizationProps {
  phones: Phone[];
  darkMode: boolean;
  onBackToSimple?: () => void;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  phones,
  darkMode,
  onBackToSimple,
}) => {
  // Chart type state
  const [chartType, setChartType] = useState<"bar" | "line" | "radar">("bar");
  
  // Metrics selection state
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "overall_device_score",
    "camera_score",
    "battery_score",
    "performance_score",
    "display_score"
  ]);

  // Generate colors for phones
  const phoneColors = ["#4F46E5", "#059669", "#DC2626", "#7C3AED", "#EA580C"];
  
  // Available metrics
  const availableMetrics = [
    { key: "overall_device_score", label: "Overall Score" },
    { key: "camera_score", label: "Camera Score" },
    { key: "battery_score", label: "Battery Score" },
    { key: "performance_score", label: "Performance Score" },
    { key: "display_score", label: "Display Score" },
    { key: "primary_camera_mp", label: "Main Camera (MP)" },
    { key: "battery_capacity_numeric", label: "Battery (mAh)" },
    { key: "ram_gb", label: "RAM (GB)" },
    { key: "storage_gb", label: "Storage (GB)" },
    { key: "refresh_rate_numeric", label: "Refresh Rate (Hz)" },
    { key: "screen_size_numeric", label: "Screen Size (in)" },
    { key: "ppi_numeric", label: "Pixel Density (PPI)" },
  ];

  // Prepare data for charts
  const chartData = availableMetrics
    .filter(metric => selectedMetrics.includes(metric.key))
    .map(metric => {
      const dataPoint: any = {
        metric: metric.label,
        key: metric.key,
      };
      
      phones.forEach((phone, index) => {
        dataPoint[`phone_${index}`] = (phone as any)[metric.key] || 0;
      });
      
      return dataPoint;
    });

  // Toggle metric selection
  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(key => key !== metricKey) 
        : [...prev, metricKey]
    );
  };

  // Render appropriate chart based on type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 100 },
    };

    if (chartType === "bar") {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#4b5563" : "#e5e7eb"} />
          <XAxis 
            dataKey="metric" 
            angle={-45} 
            textAnchor="end" 
            height={80}
            tick={{ fill: darkMode ? "#d1d5db" : "#374151" }}
          />
          <YAxis 
            tick={{ fill: darkMode ? "#d1d5db" : "#374151" }}
          />
          <Tooltip 
            contentStyle={darkMode ? { 
              backgroundColor: "#1f2937", 
              borderColor: "#374151",
              color: "#f9fafb"
            } : {}} 
          />
          <Legend />
          {phones.map((phone, index) => (
            <Bar 
              key={`phone_${index}`} 
              dataKey={`phone_${index}`} 
              name={`${phone.name} (${phone.brand})`}
              fill={phoneColors[index % phoneColors.length]} 
            />
          ))}
        </BarChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#4b5563" : "#e5e7eb"} />
          <XAxis 
            dataKey="metric" 
            angle={-45} 
            textAnchor="end" 
            height={80}
            tick={{ fill: darkMode ? "#d1d5db" : "#374151" }}
          />
          <YAxis 
            tick={{ fill: darkMode ? "#d1d5db" : "#374151" }}
          />
          <Tooltip 
            contentStyle={darkMode ? { 
              backgroundColor: "#1f2937", 
              borderColor: "#374151",
              color: "#f9fafb"
            } : {}} 
          />
          <Legend />
          {phones.map((phone, index) => (
            <Line 
              key={`phone_${index}`} 
              dataKey={`phone_${index}`} 
              name={`${phone.name} (${phone.brand})`}
              stroke={phoneColors[index % phoneColors.length]} 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      );
    }

    // Radar chart
    return (
      <RadarChart 
        cx="50%" 
        cy="50%" 
        outerRadius="80%" 
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
      >
        <PolarGrid stroke={darkMode ? "#4b5563" : "#e5e7eb"} />
        <PolarAngleAxis 
          dataKey="metric" 
          tick={{ fill: darkMode ? "#d1d5db" : "#374151" }}
        />
        <PolarRadiusAxis 
          angle={30} 
          domain={[0, 10]} 
          tick={{ fill: darkMode ? "#d1d5db" : "#374151" }}
        />
        <Tooltip 
          contentStyle={darkMode ? { 
            backgroundColor: "#1f2937", 
            borderColor: "#374151",
            color: "#f9fafb"
          } : {}} 
        />
        <Legend />
        {phones.map((phone, index) => (
          <Radar 
            key={`phone_${index}`} 
            dataKey={`phone_${index}`} 
            name={`${phone.name} (${phone.brand})`}
            stroke={phoneColors[index % phoneColors.length]} 
            fill={phoneColors[index % phoneColors.length]} 
            fillOpacity={0.2}
          />
        ))}
      </RadarChart>
    );
  };

  return (
    <div className={`max-w-6xl mx-auto p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-[#eae4da]'} border shadow-xl`}>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className={`text-2xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-2xl">📊</span>
            Interactive Chart View
          </h3>
          {onBackToSimple && (
            <button
              onClick={onBackToSimple}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              Back to Simple View
            </button>
          )}
        </div>
        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Compare {phones.length} phones across multiple metrics
        </p>
      </div>
      
      {/* Chart Type Selector */}
      <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
        <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Chart Type
        </h4>
        <div className="flex flex-wrap gap-2">
          {([
            { type: "bar", label: "Bar", icon: "📊" },
            { type: "line", label: "Line", icon: "📈" },
            { type: "radar", label: "Radar", icon: "🕸️" }
          ] as const).map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                chartType === type
                  ? darkMode
                    ? 'bg-brand text-white'
                    : 'bg-brand text-white'
                  : darkMode
                    ? 'bg-gray-600 hover:bg-gray-500 text-white'
                    : 'bg-white hover:bg-gray-200 text-gray-800'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Metrics Selector */}
      <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
        <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Metrics to Display
        </h4>
        <div className="flex flex-wrap gap-2">
          {availableMetrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedMetrics.includes(metric.key)
                  ? darkMode
                    ? 'bg-brand text-white'
                    : 'bg-brand text-white'
                  : darkMode
                    ? 'bg-gray-600 hover:bg-gray-500 text-white'
                    : 'bg-white hover:bg-gray-200 text-gray-800'
              }`}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Phone Legend */}
      <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
        <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Phones
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {phones.map((phone, index) => (
            <div 
              key={phone.id || index} 
              className="flex items-center gap-3 p-2 rounded-lg"
            >
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: phoneColors[index % phoneColors.length] }}
              />
              <div>
                <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {phone.name}
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {phone.brand} • ৳{phone.price_original?.toLocaleString() || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      
      <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        🔍 Hover over chart elements to see detailed values
      </div>
    </div>
  );
};

export default ChartVisualization;