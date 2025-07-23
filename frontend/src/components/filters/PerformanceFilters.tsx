import React from 'react';

interface PerformanceFiltersProps {
  ram: number | null;
  storage: number | null;
  onChange: {
    onRamChange: (ram: number | null) => void;
    onStorageChange: (storage: number | null) => void;
  };
  ramOptions: number[];
  storageOptions: number[];
}

const PerformanceFilters: React.FC<PerformanceFiltersProps> = ({
  ram,
  storage,
  onChange,
  ramOptions,
  storageOptions
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          RAM
        </label>
        <select
          value={ram?.toString() || ''}
          onChange={(e) => onChange.onRamChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any RAM</option>
          {ramOptions.map((option) => (
            <option key={option} value={option}>
              {option}GB+
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Storage
        </label>
        <select
          value={storage?.toString() || ''}
          onChange={(e) => onChange.onStorageChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any Storage</option>
          {storageOptions.map((option) => (
            <option key={option} value={option}>
              {option < 1000 ? `${option}GB+` : `${option / 1024}TB+`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PerformanceFilters;