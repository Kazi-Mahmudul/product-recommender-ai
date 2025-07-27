import React from 'react';
import { Phone } from '../types/phone';
import { getThemeClasses, getChartColor, getSemanticColor } from '../utils/colorUtils';

interface Feature {
  key: string;
  label: string;
  percent: number[];
  raw: any[];
}

interface ComparisonTableProps {
  phones: Phone[];
  features: Feature[];
  darkMode: boolean;
  onPhoneSelect?: (phoneId: string) => void;
  compact?: boolean;
}

/**
 * A simplified table view for phone comparisons
 * Used as a fallback when chart rendering fails or for accessibility
 */
const ComparisonTable: React.FC<ComparisonTableProps> = ({
  phones,
  features,
  darkMode,
  onPhoneSelect,
  compact = false,
}) => {
  const themeClasses = getThemeClasses(darkMode);
  
  // Find the best score in each feature
  const bestScores = features.map(feature => {
    const maxValue = Math.max(...feature.percent);
    return maxValue;
  });
  
  return (
    <div className={`${themeClasses.chartContainer} overflow-x-auto`}>
      <div className="font-semibold mb-3 text-[#377D5B]">
        Feature Comparison Table
      </div>
      
      <table className={themeClasses.table}>
        <thead>
          <tr>
            <th className={`${themeClasses.tableHeader} text-left`}>Feature</th>
            {phones.map((phone, index) => (
              <th 
                key={phone.name} 
                className={`${themeClasses.tableHeader} text-center`}
                style={{ 
                  minWidth: compact ? '80px' : '100px',
                  backgroundColor: getChartColor(index, darkMode),
                }}
              >
                {phone.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, featureIndex) => (
            <tr key={feature.key} className={featureIndex % 2 === 0 ? themeClasses.tableRowEven : themeClasses.tableRowOdd}>
              <td className="font-medium py-2 px-3">{feature.label}</td>
              {phones.map((phone, phoneIndex) => {
                const value = feature.percent[phoneIndex];
                const rawValue = feature.raw[phoneIndex];
                const isHighest = value === bestScores[featureIndex];
                
                return (
                  <td 
                    key={`${feature.key}-${phone.name}`} 
                    className={`text-center py-2 px-3 ${isHighest ? 'font-semibold' : ''}`}
                    onClick={() => onPhoneSelect && phone.id && onPhoneSelect(phone.id)}
                    style={{ 
                      cursor: onPhoneSelect ? 'pointer' : 'default',
                      backgroundColor: isHighest 
                        ? (darkMode ? 'rgba(128, 239, 128, 0.1)' : 'rgba(55, 125, 91, 0.1)') 
                        : 'transparent'
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span 
                        className={isHighest ? 'text-[#377D5B] dark:text-[#80EF80]' : ''}
                      >
                        {value.toFixed(1)}%
                      </span>
                      {!compact && rawValue && (
                        <span className="text-xs opacity-70">({rawValue})</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          
          {/* Average row */}
          <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} font-medium`}>
            <td className="py-2 px-3">Average</td>
            {phones.map((phone, phoneIndex) => {
              // Calculate average for this phone
              const avgScore = features.reduce(
                (sum, feature) => sum + feature.percent[phoneIndex], 
                0
              ) / features.length;
              
              // Find highest average
              const allAvgs = phones.map((p, idx) => 
                features.reduce((sum, f) => sum + f.percent[idx], 0) / features.length
              );
              const maxAvg = Math.max(...allAvgs);
              const isHighest = avgScore === maxAvg;
              
              return (
                <td 
                  key={`avg-${phone.name}`} 
                  className="text-center py-2 px-3 font-semibold"
                  style={{
                    color: isHighest 
                      ? getSemanticColor('positive', darkMode)
                      : darkMode ? '#e2b892' : '#6b4b2b'
                  }}
                >
                  {avgScore.toFixed(1)}%
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      
      {/* Toggle instructions */}
      <div className="mt-3 text-xs text-center opacity-70">
        {compact ? (
          <span>View chart for visual comparison</span>
        ) : (
          <span>Click on a phone's score to see more details</span>
        )}
      </div>
    </div>
  );
};

export default ComparisonTable;