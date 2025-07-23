import React from 'react';

interface PlatformFiltersProps {
  chipset: string | null;
  os: string | null;
  onChange: {
    onChipsetChange: (chipset: string | null) => void;
    onOSChange: (os: string | null) => void;
  };
  chipsets: string[];
  operatingSystems: string[];
}

const PlatformFilters: React.FC<PlatformFiltersProps> = ({
  chipset,
  os,
  onChange,
  chipsets,
  operatingSystems
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Chipset
        </label>
        <select
          value={chipset || ''}
          onChange={(e) => onChange.onChipsetChange(e.target.value === '' ? null : e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any Chipset</option>
          {chipsets.map((chip) => (
            <option key={chip} value={chip}>
              {chip}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Operating System
        </label>
        <select
          value={os || ''}
          onChange={(e) => onChange.onOSChange(e.target.value === '' ? null : e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any OS</option>
          {operatingSystems.map((system) => (
            <option key={system} value={system}>
              {system}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PlatformFilters;