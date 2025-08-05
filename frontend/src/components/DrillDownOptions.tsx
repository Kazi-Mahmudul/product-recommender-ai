import React from 'react';
import { DrillDownOption } from '../types/suggestions';

interface DrillDownOptionsProps {
  options: DrillDownOption[];
  onOptionClick: (option: DrillDownOption) => void;
  darkMode: boolean;
  isLoading?: boolean;
}

const DrillDownOptions: React.FC<DrillDownOptionsProps> = ({
  options,
  onOptionClick,
  darkMode,
  isLoading = false
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        🔧 Power user options:
      </div>
      
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={`${option.command}-${option.target || 'default'}`}
            onClick={() => onOptionClick(option)}
            disabled={isLoading}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
              transition-all duration-200 transform hover:scale-105 active:scale-95
              ${darkMode 
                ? 'bg-brand-darkGreen hover:bg-brand text-white border border-brand' 
                : 'bg-brand hover:bg-brand-darkGreen text-white border border-brand'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2
              ${darkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
            `}
            aria-label={`Execute: ${option.label}`}
          >
            <span className="text-base" role="img" aria-hidden="true">
              {option.icon}
            </span>
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DrillDownOptions;