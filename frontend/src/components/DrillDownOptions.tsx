import React from 'react';
import { DrillDownOption } from '../types/suggestions';
import { Phone } from '../api/phones';

interface DrillDownOptionsProps {
  options: DrillDownOption[];
  onOptionClick: (option: DrillDownOption) => void;
  darkMode: boolean;
  isLoading?: boolean;
  phones?: Phone[]; // Add phones context
  chatContext?: any; // Add chat context
}

const DrillDownOptions: React.FC<DrillDownOptionsProps> = ({
  options,
  onOptionClick,
  darkMode,
  isLoading = false,
  phones = [],
  chatContext
}) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        🔧 Power user options:
      </div>
      
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={`${option.command}-${option.target || 'default'}`}
            onClick={() => onOptionClick(option)}
            disabled={isLoading}
            className={`
              flex flex-col items-start gap-1 px-4 py-3 rounded-xl text-left
              transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
              ${darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white border border-gray-700 hover:border-brand' 
                : 'bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-white text-gray-900 border border-gray-200 hover:border-brand'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2
              ${darkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
              relative group min-w-[180px] max-w-[220px]
            `}
            aria-label={`Execute: ${option.label}`}
            title={option.contextualQuery || option.label}
          >
            <div className="flex items-center gap-2 w-full">
              <span className="text-lg" role="img" aria-hidden="true">
                {option.icon}
              </span>
              <span className="font-semibold text-sm truncate">{option.label}</span>
            </div>
            
            {/* Context indicator */}
            {option.referencedPhones && option.referencedPhones.length > 0 && (
              <span 
                className="absolute top-2 right-2 text-xs bg-brand text-white rounded-full px-1.5 py-0.5"
                title={`Context: ${option.referencedPhones.slice(0, 2).join(', ')}${option.referencedPhones.length > 2 ? ', ...' : ''}`}
              >
                AI
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DrillDownOptions;