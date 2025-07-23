import React, { useState } from 'react';

interface BatteryFiltersProps {
  batteryType: string | null;
  batteryCapacity: number | null;
  onChange: {
    onBatteryTypeChange: (type: string | null) => void;
    onBatteryCapacityChange: (capacity: number | null) => void;
  };
  batteryTypes: string[];
  batteryCapacityRange: { min: number; max: number };
}

const BatteryFilters: React.FC<BatteryFiltersProps> = ({
  batteryType,
  batteryCapacity,
  onChange,
  batteryTypes,
  batteryCapacityRange
}) => {
  const [sliderValue, setSliderValue] = useState<number>(
    batteryCapacity || batteryCapacityRange.min
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSliderValue(value);
    onChange.onBatteryCapacityChange(value === batteryCapacityRange.min ? null : value);
  };

  // Generate capacity options at 500mAh intervals
  const capacityMarks = [];
  for (let i = batteryCapacityRange.min; i <= batteryCapacityRange.max; i += 500) {
    capacityMarks.push(i);
  }
  if (!capacityMarks.includes(batteryCapacityRange.max)) {
    capacityMarks.push(batteryCapacityRange.max);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Battery Type
        </label>
        <select
          value={batteryType || ''}
          onChange={(e) => onChange.onBatteryTypeChange(e.target.value === '' ? null : e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any Type</option>
          {batteryTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Battery Capacity
          </label>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {sliderValue === batteryCapacityRange.min ? 'Any' : `${sliderValue}+ mAh`}
          </span>
        </div>
        
        <input
          type="range"
          min={batteryCapacityRange.min}
          max={batteryCapacityRange.max}
          step={500}
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-brand"
        />
        
        <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
          <span>{batteryCapacityRange.min}</span>
          <span>{batteryCapacityRange.max} mAh</span>
        </div>
      </div>
    </div>
  );
};

export default BatteryFilters;