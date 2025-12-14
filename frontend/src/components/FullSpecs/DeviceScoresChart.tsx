import React, { useState, useEffect } from "react";
import { Phone } from "../../api/phones";

interface DeviceScoresChartProps {
  phone: Phone;
}

const scoreFields = [
  { key: "display_score", label: "Display" },
  { key: "battery_score", label: "Battery" },
  { key: "performance_score", label: "Performance" },
  { key: "camera_score", label: "Camera" },
  { key: "overall_device_score", label: "Overall" },
];

const DeviceScoresChart: React.FC<DeviceScoresChartProps> = ({ phone }) => {
  // Multiply scores by 10 to convert from 0-10 scale to 0-100 scale
  const scores = scoreFields.map(f => ({
    label: f.label,
    value: typeof phone[f.key as keyof Phone] === "number" 
      ? Math.round(Number(phone[f.key as keyof Phone])) 
      : 0,
  }));
  
  const [animateChart, setAnimateChart] = useState<boolean>(false);
  const [activeScore, setActiveScore] = useState<string | null>(null);
  const highlightedScore = scores.reduce((max, score) => score.value > max.value ? score : max, scores[0]);

  useEffect(() => {
    // Delay animation slightly for better UX
    const timer = setTimeout(() => {
      setAnimateChart(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleBarClick = (label: string) => {
    setActiveScore(activeScore === label ? null : label);
  };

  return (
    <div className="w-full mx-auto rounded-lg md:rounded-xl bg-[#f8f9fa] dark:bg-gray-800 p-3 md:p-6 shadow-md flex flex-col items-center overflow-hidden">
      {/* Chart title with icon and better styling */}
      <div className="flex items-center justify-center gap-1 md:gap-2 mb-3 md:mb-6">
        <span className="text-[#8cc63f] text-lg md:text-xl">📊</span>
        <h3 className="text-center font-bold text-base md:text-xl text-gray-800 dark:text-white">
          Performance Breakdown
        </h3>
      </div>
      
      {/* Chart description */}
      <p className="text-center text-[10px] md:text-sm text-gray-600 dark:text-gray-300 mb-3 md:mb-6 max-w-md">
        See how this device scores across key performance metrics on a scale of 0-100
      </p>
      
      {/* Chart container with horizontal scroll for very small screens */}
      <div className="w-full overflow-x-auto pb-2 -mx-3 md:-mx-4 px-3 md:px-4">
        {/* Minimum width container to ensure chart is always visible */}
        <div className="min-w-[250px] w-full max-w-[500px] mx-auto">
          <div className="relative w-full h-48 md:h-64">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-6 md:w-10 flex flex-col justify-between text-[10px] md:text-xs select-none pointer-events-none">
              <div className="text-gray-500 dark:text-gray-300">100</div>
              <div className="text-gray-500 dark:text-gray-300">75</div>
              <div className="text-gray-500 dark:text-gray-300">50</div>
              <div className="text-gray-500 dark:text-gray-300">25</div>
              <div className="text-gray-500 dark:text-gray-300">0</div>
            </div>
            
            {/* Y-axis grid lines */}
            <div className="absolute left-6 md:left-10 right-0 top-0 bottom-8 flex flex-col justify-between">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-gray-200 dark:border-gray-600 w-full h-0"></div>
              ))}
            </div>
            
            {/* Bars */}
            <div className="absolute left-6 md:left-10 right-0 top-0 bottom-8 flex items-end justify-around">
              {scores.map((score, index) => {
                // Only one bar should be colored and show popup: activeScore if set, else highlightedScore
                const isActive = activeScore === score.label;
                const isHighlighted = !activeScore && score.label === highlightedScore.label;
                const barHeight = `${score.value}%`;
                
                return (
                  <div key={index} className="flex flex-col items-center justify-end h-full flex-1 mx-0.5 md:mx-1">
                    {/* Bar */}
                    <div
                      className={`w-full max-w-[30px] md:max-w-[40px] rounded-t-lg md:rounded-t-xl transition-all duration-700 cursor-pointer
                        ${(isActive || isHighlighted) ? 'bg-[#8cc63f]' : 'bg-gray-300 dark:bg-gray-500'}
                        hover:opacity-90 hover:bg-[#a0d468]`}
                      style={{
                        height: animateChart ? barHeight : '0%',
                        transitionDelay: `${index * 150}ms`,
                      }}
                      onClick={() => handleBarClick(score.label)}
                    >
                      {/* Value popup for only the active or highlighted bar */}
                      {(isActive || isHighlighted) && (
                        <div className="relative">
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-[#8cc63f] text-white font-bold rounded-full px-1.5 md:px-3 py-0.5 md:py-1 text-center text-[10px] md:text-xs whitespace-nowrap z-10 shadow-md">
                            {score.value}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* X-axis labels */}
            <div className="absolute left-6 md:left-10 right-0 bottom-0 h-6 md:h-8 flex justify-around items-center">
              {scores.map((score, index) => (
                <div 
                  key={index} 
                  className={`text-[10px] text-center flex-1
                    ${(activeScore === score.label || (!activeScore && score.label === highlightedScore.label)) 
                      ? 'text-[#8cc63f] font-semibold' 
                      : 'text-gray-600 dark:text-gray-300'}`}
                >
                  {score.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-2 md:mt-4 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 text-center">
        Tap any bar to see detailed score
      </div>
    </div>
  );
};

export default DeviceScoresChart;