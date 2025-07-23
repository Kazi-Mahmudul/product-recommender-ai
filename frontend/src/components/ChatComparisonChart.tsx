import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { getChartColor, getThemeClasses } from "../utils/colorUtils";
import { ArrowRight } from "lucide-react";

import { Phone } from "../types/phone";

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
}

// Custom label for LabelList (shows correct % for every phone, responsive, mode-aware)
const CustomBarLabelList = (props: any) => {
  const { x, y, width, height, value, fill, darkMode } = props;
  const isMobile = window.innerWidth < 640;
  
  if (value > 0) {
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill={darkMode ? "#ffffff" : "#ffffff"}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={isMobile ? 10 : 12}
        fontWeight={700}
      >
        {value.toFixed(1)}%
      </text>
    );
  }
  return null;
};

// Custom XAxis tick for wrapping and responsive font
const CustomXAxisTick = (props: any) => {
  const { x, y, payload, darkMode } = props;
  const isMobile = window.innerWidth < 640;
  const words = String(payload.value).split(" ");
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill={darkMode ? "#fff" : "#6b4b2b"}
        fontSize={isMobile ? 10 : 13}
        fontWeight={600}
      >
        {words.map((word: string, idx: number) => (
          <tspan key={idx} x={0} dy={idx === 0 ? 0 : 12}>
            {word}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, darkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 rounded-lg shadow-md ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"} border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span>{entry.value.toFixed(1)}%</span>
            {entry.payload && entry.payload[`${entry.name}_raw`] && (
              <span className="text-xs opacity-80">
                ({entry.payload[`${entry.name}_raw`]})
              </span>
            )}
          </div>
        ))}
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
}) => {
  const themeClasses = getThemeClasses(darkMode);
  const windowWidth = window.innerWidth;
  const isMobile = windowWidth < 640;
  
  // Format data for the chart
  const chartData = features.map((feature) => {
    const obj: any = { feature: feature.label };
    phones.forEach((phone, idx) => {
      obj[phone.name] = feature.percent[idx];
      obj[`${phone.name}_raw`] = feature.raw[idx];
    });
    return obj;
  });
  
  // Generate summary text
  const generateSummary = () => {
    if (!phones || !features) return [];
    
    const summaryPoints: string[] = [];
    
    features.forEach((feature) => {
      const maxIdx = feature.percent.indexOf(Math.max(...feature.percent));
      if (maxIdx >= 0 && maxIdx < phones.length) {
        summaryPoints.push(`${phones[maxIdx].name} leads in ${feature.label}`);
      }
    });
    
    return summaryPoints;
  };
  
  const summaryPoints = generateSummary();
  
  return (
    <div className={themeClasses.chartContainer}>
      <div className="font-semibold mb-2 text-[#377D5B]">
        Feature Comparison
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ 
            top: 20, 
            right: 30, 
            left: 20, 
            bottom: isMobile ? 80 : 60 
          }}
        >
          <XAxis
            dataKey="feature"
            tick={<CustomXAxisTick darkMode={darkMode} />}
            interval={0}
            height={isMobile ? 50 : 70}
            tickMargin={isMobile ? 16 : 24}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ 
              fontSize: isMobile ? 10 : 12, 
              fill: darkMode ? "#fff" : "#6b4b2b" 
            }}
          />
          <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
          
          {phones.map((phone, phoneIndex) => (
            <Bar
              key={phone.name}
              dataKey={phone.name}
              onClick={() => onPhoneSelect && phone.id && onPhoneSelect(phone.id)}
              cursor={onPhoneSelect ? "pointer" : "default"}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getChartColor(phoneIndex)}
                />
              ))}
              <LabelList
                dataKey={phone.name}
                position="center"
                content={(props) => <CustomBarLabelList {...props} darkMode={darkMode} />}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      
      {/* Summary section */}
      {summaryPoints.length > 0 && (
        <div className={`mt-4 ${darkMode ? "text-white" : "text-brand"}`}>
          <div className="font-semibold mb-1">Key Insights:</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {summaryPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Action button */}
      {onViewDetailedComparison && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onViewDetailedComparison}
            className="flex items-center gap-1 text-sm font-medium text-[#377D5B] hover:text-[#377D5B]/80 transition-colors"
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