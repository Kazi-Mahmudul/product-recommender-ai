import React from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useComparison } from '../context/ComparisonContext';

const ComparisonWidget: React.FC = () => {
  const location = useLocation();
  const {
    selectedPhones,
    error,
    removePhone,
    navigateToComparison,
    clearError,
    clearComparison
  } = useComparison();

  // Don't render if no phones are selected
  if (selectedPhones.length === 0) {
    return null;
  }

  // Don't render on comparison pages to avoid conflicts
  if (location.pathname.startsWith('/compare')) {
    return null;
  }

  const canCompare = selectedPhones.length >= 2;
  const maxPhones = 5;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-4xl w-full px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg backdrop-blur-sm">
        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                aria-label="Clear error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Header */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Selected for comparison
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {selectedPhones.length}/{maxPhones}
                </span>
              </div>
              
              {/* Clear All Button */}
              <button
                onClick={clearComparison}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors sm:hidden"
              >
                Clear all
              </button>
            </div>

            {/* Phone List */}
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {selectedPhones.map((phone) => (
                <div
                  key={phone.slug}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 min-w-0"
                >
                  {/* Phone Image */}
                  <img
                    src={phone.img_url || '/phone.png'}
                    alt={phone.name}
                    className="w-6 h-6 object-contain rounded flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = '/phone.png';
                    }}
                  />
                  
                  {/* Phone Info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {phone.brand} {phone.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {phone.price}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => phone.slug && removePhone(phone.slug)}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex-shrink-0"
                    aria-label={`Remove ${phone.brand} ${phone.name} from comparison`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Clear All Button (Desktop) */}
              <button
                onClick={clearComparison}
                className="hidden sm:block text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-3 py-2"
              >
                Clear all
              </button>

              {/* Compare Now Button */}
              <button
                onClick={navigateToComparison}
                disabled={!canCompare}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canCompare
                    ? 'bg-[#2d5016] hover:bg-[#3d6b1f] text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={!canCompare ? 'Select at least 2 phones to compare' : 'Compare selected phones'}
              >
                {canCompare ? (
                  <>
                    Compare Now
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Select {2 - selectedPhones.length} more
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonWidget;