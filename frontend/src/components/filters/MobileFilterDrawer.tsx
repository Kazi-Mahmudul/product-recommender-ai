import React from 'react';
import { X } from 'lucide-react';
import FilterPanel from './FilterPanel';
import { FilterState, FilterOptions } from '../../types/filters';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  filterOptions: FilterOptions;
  onFilterChange: (newFilters: FilterState) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
  activeFiltersCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex md:hidden">
      <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h2 className="font-medium text-lg text-neutral-800 dark:text-white">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <FilterPanel
            filters={filters}
            filterOptions={filterOptions}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
        
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-between">
          <button
            onClick={onClearFilters}
            className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/90"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileFilterDrawer;