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
  const scores = scoreFields.map(f => ({
    label: f.label,
    value: typeof phone[f.key as keyof Phone] === "number" ? Number(phone[f.key as keyof Phone]) : 0,
  }));
  const [animateChart, setAnimateChart] = useState<boolean>(false);
  const [activeScore, setActiveScore] = useState<string | null>(null);
  const highlightedScore = scores.reduce((max, score) => score.value > max.value ? score : max, scores[0]);

  useEffect(() => {
    setAnimateChart(true);
  }, []);

  const handleBarClick = (label: string) => {
    setActiveScore(activeScore === label ? null : label);
  };

  return (
    <div className="w-full max-w-full sm:max-w-md md:max-w-lg mx-auto rounded-xl bg-[#f2f3f1] dark:bg-gray-800 p-4 shadow-sm flex flex-col items-center">
      {/* Chart title */}
      <h3 className="text-center font-semibold text-gray-800 dark:text-white mb-3 w-full">
        Performance Scores
      </h3>
      {/* Chart container - responsive */}
      <div className="w-full flex justify-center items-end overflow-x-auto">
        <div className="w-full" style={{ maxWidth: 340 }}>
          <div className="relative w-full h-52">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs select-none pointer-events-none">
              <div className="text-gray-500 dark:text-gray-300">100</div>
              <div className="text-gray-500 dark:text-gray-300">75</div>
              <div className="text-gray-500 dark:text-gray-300">50</div>
              <div className="text-gray-500 dark:text-gray-300">25</div>
              <div className="text-gray-500 dark:text-gray-300">0</div>
            </div>
            {/* Y-axis grid lines */}
            <div className="absolute left-10 right-0 top-0 bottom-0 flex flex-col justify-between">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-gray-200 dark:border-gray-600 w-full h-0"></div>
              ))}
            </div>
            {/* Bars */}
            <div className="absolute left-10 right-0 top-0 bottom-0 flex items-end justify-around">
              {scores.map((score, index) => {
                // Only one bar should be colored and show popup: activeScore if set, else highlightedScore
                const isActive = activeScore === score.label;
                const isHighlighted = !activeScore && score.label === highlightedScore.label;
                const barHeight = `${(score.value / 100) * 100}%`;
                return (
                  <div key={index} className="flex flex-col items-center justify-end h-full pb-6">
                    {/* Bar */}
                    <div
                      className={`w-8 md:w-12 mx-0 md:mx-2 rounded-t-xl transition-all duration-700 cursor-pointer
                        ${(isActive || isHighlighted) ? 'bg-[#8cc63f]' : 'bg-gray-300 dark:bg-gray-500'}
                        hover:opacity-90`}
                      style={{
                        height: animateChart ? barHeight : '0%',
                        transitionDelay: `${index * 100}ms`,
                        minWidth: 20,
                        maxWidth: 48,
                      }}
                      onClick={() => handleBarClick(score.label)}
                    >
                      {/* Value popup for only the active or highlighted bar */}
                      {(isActive || isHighlighted) && (
                        <div className="relative">
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-[#8cc63f] text-white font-bold rounded-full px-3 py-1 text-center text-xs whitespace-nowrap z-10 shadow">
                            {score.value}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* X-axis label */}
                    <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center w-full">{score.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceScoresChart;
