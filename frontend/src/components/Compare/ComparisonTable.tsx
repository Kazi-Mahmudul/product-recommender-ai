import React, { useState } from 'react';
import { Phone } from '../../api/phones';
import { useMobileResponsive } from '../../hooks/useMobileResponsive';

interface SpecificationRow {
  key: string;
  label: string;
  getValue: (phone: Phone) => string | number | null;
  compareFunction?: (a: any, b: any) => number;
  formatValue?: (value: any) => string;
  higherIsBetter?: boolean;
}

interface ComparisonTableProps {
  phones: Phone[];
  highlightBest?: boolean;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  phones,
  highlightBest = true
}) => {
  const { isMobile } = useMobileResponsive();
  const [forceCardView, setForceCardView] = useState(false);
  
  // Determine if we should show mobile/card view
  const showCardView = isMobile || forceCardView;
  // Define specification rows for comparison
  const specificationRows: SpecificationRow[] = [
    {
      key: 'price',
      label: 'Price',
      getValue: (phone) => phone.price_original || 0,
      formatValue: (value) => value ? `Tk. ${value.toLocaleString()}` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: false
    },
    {
      key: 'ram',
      label: 'RAM',
      getValue: (phone) => phone.ram_gb || null,
      formatValue: (value) => value ? `${value} GB` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'storage',
      label: 'Storage',
      getValue: (phone) => phone.storage_gb || null,
      formatValue: (value) => value ? `${value} GB` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'display_score',
      label: 'Display Score',
      getValue: (phone) => phone.display_score || null,
      formatValue: (value) => value ? `${value.toFixed(1)}/100` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'battery',
      label: 'Battery',
      getValue: (phone) => phone.battery_capacity_numeric || null,
      formatValue: (value) => value ? `${value} mAh` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'main_camera',
      label: 'Main Camera',
      getValue: (phone) => phone.primary_camera_mp || null,
      formatValue: (value) => value ? `${value} MP` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'front_camera',
      label: 'Selfie Camera',
      getValue: (phone) => phone.selfie_camera_mp || null,
      formatValue: (value) => value ? `${value} MP` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'refresh_rate',
      label: 'Refresh Rate',
      getValue: (phone) => phone.refresh_rate_numeric || null,
      formatValue: (value) => value ? `${value} Hz` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'quick_charging',
      label: 'Quick Charging',
      getValue: (phone) => phone.quick_charging || null,
      formatValue: (value) => value || 'N/A'
    },
    {
      key: 'wireless_charging',
      label: 'Wireless Charging',
      getValue: (phone) => phone.has_wireless_charging ? 'Yes' : 'No',
      formatValue: (value) => value
    },
    {
      key: 'screen_size',
      label: 'Screen Size',
      getValue: (phone) => phone.screen_size_inches || null,
      formatValue: (value) => value ? `${value}"` : 'N/A',
      compareFunction: (a, b) => a - b,
      higherIsBetter: true
    },
    {
      key: 'chipset',
      label: 'Chipset',
      getValue: (phone) => phone.chipset || null,
      formatValue: (value) => value || 'N/A'
    },
    {
      key: 'os',
      label: 'Operating System',
      getValue: (phone) => phone.operating_system || null,
      formatValue: (value) => value || 'N/A'
    },
    {
      key: 'build',
      label: 'Build',
      getValue: (phone) => phone.build || null,
      formatValue: (value) => value || 'N/A'
    },
    {
      key: 'weight',
      label: 'Weight',
      getValue: (phone) => phone.weight || null,
      formatValue: (value) => value || 'N/A'
    }
  ];

  // Function to determine the best value for a specification
  const getBestPhoneIndex = (spec: SpecificationRow): number | null => {
    if (!highlightBest || !spec.compareFunction) return null;

    const values = phones.map(phone => spec.getValue(phone));
    const validValues = values.filter(value => value !== null && value !== undefined && value !== '');
    
    if (validValues.length === 0) return null;

    let bestIndex = -1;
    let bestValue: string | number | null = null;

    values.forEach((value, index) => {
      if (value === null || value === undefined || value === '') return;

      if (bestValue === null) {
        bestValue = value;
        bestIndex = index;
      } else {
        const comparison = spec.compareFunction!(value, bestValue);
        const isBetter = spec.higherIsBetter ? comparison > 0 : comparison < 0;
        
        if (isBetter) {
          bestValue = value;
          bestIndex = index;
        }
      }
    });

    return bestIndex >= 0 ? bestIndex : null;
  };

  // Mobile card view component
  const MobileComparisonCards = () => (
    <div className="space-y-4">
      {phones.map((phone, phoneIndex) => (
        <div key={phone.slug} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Phone Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center space-x-3">
              <img
                src={phone.img_url || "/no-image-placeholder.svg"}
                alt={phone.name}
                className="w-12 h-16 object-contain rounded bg-white dark:bg-gray-600 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.src = "/no-image-placeholder.svg";
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {phone.brand}
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight">
                  {phone.name}
                </h3>
                <div className="text-sm font-bold text-[#2d5016] dark:text-[#4ade80] mt-1">
                  Tk. {phone.price}
                </div>
              </div>
            </div>
          </div>
          
          {/* Specifications Grid */}
          <div className="p-4">
            <div className="grid grid-cols-1 gap-3">
              {specificationRows.map((spec) => {
                const value = spec.getValue(phone);
                const formattedValue = spec.formatValue ? spec.formatValue(value) : (value?.toString() || 'N/A');
                const bestPhoneIndex = getBestPhoneIndex(spec);
                const isBest = bestPhoneIndex === phoneIndex && value !== null && value !== undefined && value !== '';
                
                return (
                  <div key={spec.key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                      {spec.label}
                    </div>
                    <div className={`text-sm font-semibold flex items-center ${
                      isBest 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {isBest && (
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span>{formattedValue}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Early return for empty state
  if (phones.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Detailed Comparison
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No phones to compare
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Detailed Comparison
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Compare key specifications side-by-side
            </p>
          </div>
          
          {/* View Toggle for large screens */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={() => setForceCardView(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !showCardView 
                  ? 'bg-brand text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setForceCardView(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                showCardView 
                  ? 'bg-brand text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Card View
            </button>
          </div>
        </div>
      </div>

      {/* Conditional rendering based on view type */}
      {showCardView ? (
        <div className="p-4 sm:p-6">
          <MobileComparisonCards />
        </div>
      ) : (
        <div className="overflow-x-auto touch-pan-x" role="region" aria-label="Phone comparison table">
          <table className="w-full min-w-[600px]" role="table" aria-label="Detailed phone specifications comparison">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700" role="row">
                <th 
                  className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600"
                  scope="col"
                  role="columnheader"
                >
                  Specification
                </th>
                {phones.map((phone, index) => (
                  <th
                    key={phone.slug}
                    className="px-4 sm:px-6 py-4 text-center text-sm font-medium text-gray-900 dark:text-white min-w-[160px] sm:min-w-[200px]"
                    scope="col"
                    role="columnheader"
                    aria-label={`${phone.brand} ${phone.name} specifications`}
                  >
                    <div className="flex flex-col items-center">
                      <img
                        src={phone.img_url || "/no-image-placeholder.svg"}
                        alt={phone.name}
                        className="w-10 h-12 sm:w-12 sm:h-16 object-contain rounded mb-2 bg-white dark:bg-gray-600"
                        onError={(e) => {
                          e.currentTarget.src = "/no-image-placeholder.svg";
                        }}
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {phone.brand}
                      </div>
                      <div className="font-semibold text-xs sm:text-sm line-clamp-2 text-center px-1">
                        {phone.name}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {specificationRows.map((spec, specIndex) => {
                const bestPhoneIndex = getBestPhoneIndex(spec);
                
                return (
                  <tr key={spec.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50" role="row">
                    <th 
                      className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600"
                      scope="row"
                      role="rowheader"
                    >
                      {spec.label}
                    </th>
                    {phones.map((phone, phoneIndex) => {
                      const value = spec.getValue(phone);
                      const formattedValue = spec.formatValue ? spec.formatValue(value) : (value?.toString() || 'N/A');
                      const isBest = bestPhoneIndex === phoneIndex && value !== null && value !== undefined && value !== '';
                      
                      return (
                        <td
                          key={phone.slug}
                          className={`px-4 sm:px-6 py-3 sm:py-4 text-sm text-center transition-colors duration-200 ${
                            isBest 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-semibold' 
                              : 'text-gray-900 dark:text-gray-300'
                          }`}
                          role="cell"
                          aria-label={`${spec.label} for ${phone.brand} ${phone.name}: ${formattedValue}${isBest ? ' (best value)' : ''}`}
                        >
                          <div className="flex items-center justify-center">
                            {isBest && (
                              <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="truncate">{formattedValue}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {highlightBest && (
        <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Best value in each category is highlighted
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonTable;