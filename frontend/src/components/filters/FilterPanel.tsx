import React, { useState } from 'react';
import { FilterState, FilterOptions } from '../../types/filters';
import PriceRangeFilter from './PriceRangeFilter';
import BrandFilter from './BrandFilter';
import CameraFilters from './CameraFilters';
import PerformanceFilters from './PerformanceFilters';
import BatteryFilters from './BatteryFilters';
import DisplayFilters from './DisplayFilters';
import PlatformFilters from './PlatformFilters';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterState;
  filterOptions: FilterOptions;
  onFilterChange: (newFilters: FilterState) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
  activeFiltersCount
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    brand: true,
    camera: false,
    performance: false,
    battery: false,
    display: false,
    platform: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper function to update a specific filter
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-lg text-neutral-800 dark:text-white">
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </h3>
        <button
          onClick={onClearFilters}
          className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1"
        >
          <X size={16} />
          Clear All
        </button>
      </div>

      <div className="space-y-4">
        {/* Price Range Filter */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('price')}
          >
            <h4 className="font-medium text-neutral-800 dark:text-white">Price Range</h4>
            {expandedSections.price ? (
              <ChevronUp size={18} className="text-neutral-500" />
            ) : (
              <ChevronDown size={18} className="text-neutral-500" />
            )}
          </div>
          {expandedSections.price && (
            <div className="mt-2">
              <PriceRangeFilter
                minPrice={filters.priceRange.min}
                maxPrice={filters.priceRange.max}
                onChange={(min, max) => updateFilter('priceRange', { min, max })}
                priceRange={filterOptions.priceRange}
              />
            </div>
          )}
        </div>

        {/* Brand Filter */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('brand')}
          >
            <h4 className="font-medium text-neutral-800 dark:text-white">Brand</h4>
            {expandedSections.brand ? (
              <ChevronUp size={18} className="text-neutral-500" />
            ) : (
              <ChevronDown size={18} className="text-neutral-500" />
            )}
          </div>
          {expandedSections.brand && (
            <div className="mt-2">
              <BrandFilter
                selectedBrand={filters.brand}
                onChange={(brand) => updateFilter('brand', brand)}
                brands={filterOptions.brands}
              />
            </div>
          )}
        </div>

        {/* Camera Filters */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('camera')}
          >
            <h4 className="font-medium text-neutral-800 dark:text-white">Camera</h4>
            {expandedSections.camera ? (
              <ChevronUp size={18} className="text-neutral-500" />
            ) : (
              <ChevronDown size={18} className="text-neutral-500" />
            )}
          </div>
          {expandedSections.camera && (
            <div className="mt-2">
              <CameraFilters
                cameraSetup={filters.cameraSetup}
                mainCamera={filters.mainCamera}
                frontCamera={filters.frontCamera}
                onChange={{
                  onCameraSetupChange: (setup) => updateFilter('cameraSetup', setup),
                  onMainCameraChange: (mp) => updateFilter('mainCamera', mp),
                  onFrontCameraChange: (mp) => updateFilter('frontCamera', mp)
                }}
                cameraSetups={filterOptions.cameraSetups}
                mainCameraRange={filterOptions.mainCameraRange}
                frontCameraRange={filterOptions.frontCameraRange}
              />
            </div>
          )}
        </div>

        {/* Performance Filters */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('performance')}
          >
            <h4 className="font-medium text-neutral-800 dark:text-white">Performance</h4>
            {expandedSections.performance ? (
              <ChevronUp size={18} className="text-neutral-500" />
            ) : (
              <ChevronDown size={18} className="text-neutral-500" />
            )}
          </div>
          {expandedSections.performance && (
            <div className="mt-2">
              <PerformanceFilters
                ram={filters.ram}
                storage={filters.storage}
                onChange={{
                  onRamChange: (ram) => updateFilter('ram', ram),
                  onStorageChange: (storage) => updateFilter('storage', storage)
                }}
                ramOptions={filterOptions.ramOptions}
                storageOptions={filterOptions.storageOptions}
              />
            </div>
          )}
        </div>

        {/* Battery Filters */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('battery')}
          >
            <h4 className="font-medium text-neutral-800 dark:text-white">Battery</h4>
            {expandedSections.battery ? (
              <ChevronUp size={18} className="text-neutral-500" />
            ) : (
              <ChevronDown size={18} className="text-neutral-500" />
            )}
          </div>
          {expandedSections.battery && (
            <div className="mt-2">
              <BatteryFilters
                batteryType={filters.batteryType}
                batteryCapacity={filters.batteryCapacity}
                onChange={{
                  onBatteryTypeChange: (type) => updateFilter('batteryType', type),
                  onBatteryCapacityChange: (capacity) => updateFilter('batteryCapacity', capacity)
                }}
                batteryTypes={filterOptions.batteryTypes}
                batteryCapacityRange={filterOptions.batteryCapacityRange}
              />
            </div>
          )}
        </div>

        {/* Display Filters */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('display')}
          >
            <h4 className="font-medium text-neutral-800 dark:text-white">Display</h4>
            {expandedSections.display ? (
              <ChevronUp size={18} className="text-neutral-500" />
            ) : (
              <ChevronDown size={18} className="text-neutral-500" />
            )}
          </div>
          {expandedSections.display && (
            <div className="mt-2">
              <DisplayFilters
                displayType={filters.displayType}
                refreshRate={filters.refreshRate}
                displaySize={filters.displaySize}
                onChange={{
                  onDisplayTypeChange: (type) => updateFilter('displayType', type),
                  onRefreshRateChange: (rate) => updateFilter('refreshRate', rate),
                  onDisplaySizeChange: (min, max) => updateFilter('displaySize', { min, max })
                }}
                displayTypes={filterOptions.displayTypes}
                refreshRateOptions={filterOptions.refreshRateOptions}
                displaySizeRange={filterOptions.displaySizeRange}
              />
            </div>
          )}
        </div>

        {/* Platform Filters */}
        <div className="pb-4">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('platform')}
          >
            <h4 className="font-medium text-neutral-800 dark:text-white">Platform</h4>
            {expandedSections.platform ? (
              <ChevronUp size={18} className="text-neutral-500" />
            ) : (
              <ChevronDown size={18} className="text-neutral-500" />
            )}
          </div>
          {expandedSections.platform && (
            <div className="mt-2">
              <PlatformFilters
                chipset={filters.chipset}
                os={filters.os}
                onChange={{
                  onChipsetChange: (chipset) => updateFilter('chipset', chipset),
                  onOSChange: (os) => updateFilter('os', os)
                }}
                chipsets={filterOptions.chipsets}
                operatingSystems={filterOptions.operatingSystems}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onClearFilters()}
          className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 mr-2"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;