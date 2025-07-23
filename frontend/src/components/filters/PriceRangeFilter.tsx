import React, { useState, useEffect } from 'react';

interface PriceRangeFilterProps {
  minPrice: number | null;
  maxPrice: number | null;
  onChange: (min: number | null, max: number | null) => void;
  priceRange: { min: number; max: number };
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  minPrice,
  maxPrice,
  onChange,
  priceRange
}) => {
  const [localMin, setLocalMin] = useState<string>(minPrice?.toString() || '');
  const [localMax, setLocalMax] = useState<string>(maxPrice?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalMin(minPrice?.toString() || '');
    setLocalMax(maxPrice?.toString() || '');
  }, [minPrice, maxPrice]);

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
    const minVal = min ? parseInt(min, 10) : null;
    const maxVal = max ? parseInt(max, 10) : null;

    // Validate min <= max if both are provided
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      setError('Minimum price cannot be greater than maximum price');
      return;
    }

    // Validate min is within range
    if (minVal !== null && (minVal < priceRange.min || minVal > priceRange.max)) {
      setError(`Minimum price must be between ${priceRange.min} and ${priceRange.max}`);
      return;
    }

    // Validate max is within range
    if (maxVal !== null && (maxVal < priceRange.min || maxVal > priceRange.max)) {
      setError(`Maximum price must be between ${priceRange.min} and ${priceRange.max}`);
      return;
    }

    // Update parent component if validation passes
    onChange(minVal, maxVal);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Price Range
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={localMin}
          onChange={handleMinChange}
          min={priceRange.min}
          max={priceRange.max}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <span className="text-neutral-400">-</span>
        <input
          type="number"
          placeholder="Max"
          value={localMax}
          onChange={handleMaxChange}
          min={priceRange.min}
          max={priceRange.max}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default PriceRangeFilter;