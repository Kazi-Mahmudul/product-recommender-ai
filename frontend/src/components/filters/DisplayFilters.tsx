import React, { useState } from 'react';

interface DisplayFiltersProps {
  displayType: string | null;
  refreshRate: number | null;
  displaySize: {
    min: number | null;
    max: number | null;
  };
  onChange: {
    onDisplayTypeChange: (type: string | null) => void;
    onRefreshRateChange: (rate: number | null) => void;
    onDisplaySizeChange: (min: number | null, max: number | null) => void;
  };
  displayTypes: string[];
  refreshRateOptions: number[];
  displaySizeRange: { min: number; max: number };
}

const DisplayFilters: React.FC<DisplayFiltersProps> = ({
  displayType,
  refreshRate,
  displaySize,
  onChange,
  displayTypes,
  refreshRateOptions,
  displaySizeRange
}) => {
  const [localMin, setLocalMin] = useState<string>(displaySize.min?.toString() || '');
  const [localMax, setLocalMax] = useState<string>(displaySize.max?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalMin(value);
    validateAndUpdate(value, localMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalMax(value);
    validateAndUpdate(localMin, value);
  };

  const validateAndUpdate = (min: string, max: string) => {
    // Clear previous errors
    setError(null);

    // Parse values
    const minVal = min ? parseFloat(min) : null;
    const maxVal = max ? parseFloat(max) : null;

    // Validate min <= max if both are provided
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      setError('Minimum size cannot be greater than maximum size');
      return;
    }

    // Validate min is within range
    if (minVal !== null && (minVal < displaySizeRange.min || minVal > displaySizeRange.max)) {
      setError(`Minimum size must be between ${displaySizeRange.min} and ${displaySizeRange.max}`);
      return;
    }

    // Validate max is within range
    if (maxVal !== null && (maxVal < displaySizeRange.min || maxVal > displaySizeRange.max)) {
      setError(`Maximum size must be between ${displaySizeRange.min} and ${displaySizeRange.max}`);
      return;
    }

    // Update parent component if validation passes
    onChange.onDisplaySizeChange(minVal, maxVal);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Display Type
        </label>
        <select
          value={displayType || ''}
          onChange={(e) => onChange.onDisplayTypeChange(e.target.value === '' ? null : e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any Type</option>
          {displayTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Refresh Rate
        </label>
        <select
          value={refreshRate?.toString() || ''}
          onChange={(e) => onChange.onRefreshRateChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any Refresh Rate</option>
          {refreshRateOptions.map((rate) => (
            <option key={rate} value={rate}>
              {rate}Hz+
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Display Size (inches)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={localMin}
            onChange={handleMinChange}
            min={displaySizeRange.min}
            max={displaySizeRange.max}
            step="0.1"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <span className="text-neutral-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={localMax}
            onChange={handleMaxChange}
            min={displaySizeRange.min}
            max={displaySizeRange.max}
            step="0.1"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};

export default DisplayFilters;