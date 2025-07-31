import React from 'react';
import { Phone } from '../../api/phones';

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
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Detailed Comparison
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Compare key specifications side-by-side
        </p>
      </div>

      <div className="overflow-x-auto touch-pan-x" role="region" aria-label="Phone comparison table">
        <table className="w-full min-w-[600px]" role="table" aria-label="Detailed phone specifications comparison">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700" role="row">
              <th 
                className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600"
                scope="col"
                role="columnheader"
              >
                Specification
              </th>
              {phones.map((phone, index) => (
                <th
                  key={phone.slug}
                  className="px-6 py-4 text-center text-sm font-medium text-gray-900 dark:text-white min-w-[200px]"
                  scope="col"
                  role="columnheader"
                  aria-label={`${phone.brand} ${phone.name} specifications`}
                >
                  <div className="flex flex-col items-center">
                    <img
                      src={phone.img_url || "https://via.placeholder.com/60x80?text=No+Image"}
                      alt={phone.name}
                      className="w-12 h-16 object-contain rounded mb-2 bg-white dark:bg-gray-600"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/60x80?text=No+Image";
                      }}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {phone.brand}
                    </div>
                    <div className="font-semibold text-sm line-clamp-2 text-center">
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
                    className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600"
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
                        className={`px-6 py-4 text-sm text-center transition-colors duration-200 ${
                          isBest 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-semibold' 
                            : 'text-gray-900 dark:text-gray-300'
                        }`}
                        role="cell"
                        aria-label={`${spec.label} for ${phone.brand} ${phone.name}: ${formattedValue}${isBest ? ' (best value)' : ''}`}
                      >
                        <div className="flex items-center justify-center">
                          {isBest && (
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span>{formattedValue}</span>
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

      {/* Legend */}
      {highlightBest && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
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