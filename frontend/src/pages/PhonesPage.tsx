import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchPhones,
  fetchFilterOptions,
  Phone,
  SortOrder,
} from "../api/phones";
import PhoneCard from "../components/PhoneCard";
import Pagination from "../components/Pagination";
import SortSelect from "../components/SortSelect";
import PageSizeSelect from "../components/PageSizeSelect";
import FilterPanel from "../components/filters/FilterPanel";
import MobileFilterDrawer from "../components/filters/MobileFilterDrawer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Filter } from "lucide-react";
import { FilterState, defaultFilterState } from "../types/filters";
import {
  filtersToSearchParams,
  searchParamsToFilters,
} from "../utils/urlUtils";
import { useFilterCache } from "../hooks/useFilterCache";
import debounce from "lodash/debounce";

const PhonesPage: React.FC = () => {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortOrder>("default");
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const isMobile = useRef(window.innerWidth < 768);

  // Update isMobile ref on window resize
  useEffect(() => {
    const handleResize = () => {
      isMobile.current = window.innerWidth < 768;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(
    searchParamsToFilters(searchParams)
  );
  const { filterOptions } = useFilterCache(fetchFilterOptions);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const navigate = useNavigate();

  // Count active filters
  useEffect(() => {
    let count = 0;

    if (filters.priceRange.min !== null) count++;
    if (filters.priceRange.max !== null) count++;
    if (filters.brand !== null) count++;
    if (filters.cameraSetup !== null) count++;
    if (filters.mainCamera !== null) count++;
    if (filters.frontCamera !== null) count++;
    if (filters.ram !== null) count++;
    if (filters.storage !== null) count++;
    if (filters.batteryType !== null) count++;
    if (filters.batteryCapacity !== null) count++;
    if (filters.chipset !== null) count++;
    if (filters.displayType !== null) count++;
    if (filters.refreshRate !== null) count++;
    if (filters.displaySize.min !== null) count++;
    if (filters.displaySize.max !== null) count++;
    if (filters.os !== null) count++;

    setActiveFiltersCount(count);
  }, [filters]);

  // Filter options are now handled by the useFilterCache hook

  // Update URL when filters change
  const updateUrl = useCallback(
    debounce(
      (
        newFilters: FilterState,
        query: string,
        currentPage: number,
        currentPageSize: number
      ) => {
        const params = filtersToSearchParams(newFilters);

        // Add search query
        if (query) {
          params.set("q", query);
        }

        // Add pagination
        params.set("page", currentPage.toString());
        params.set("pageSize", currentPageSize.toString());

        setSearchParams(params);
      },
      300
    ),
    [setSearchParams]
  );

  // Update URL when pagination or sorting changes
  useEffect(() => {
    updateUrl(filters, searchQuery, page, pageSize);
  }, [page, pageSize, sort, updateUrl, filters, searchQuery]);

  // Fetch phones with filters
  useEffect(() => {
    setLoading(true);
    fetchPhones({ page, pageSize, sort, filters })
      .then(({ items, total }) => {
        setPhones(items);
        setTotal(total);
      })
      .catch((error) => {
        console.error("Failed to fetch phones:", error);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, sort, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      setPage(1); // Reset to first page when filters change
      updateUrl(newFilters, searchQuery, 1, pageSize);
    },
    [searchQuery, pageSize, updateUrl]
  );

  // Handle search query changes
  const handleSearchQueryChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setPage(1); // Reset to first page when search query changes
      updateUrl(filters, query, 1, pageSize);
    },
    [filters, pageSize, updateUrl]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilterState);
    setSearchQuery("");
    setPage(1);
    setSearchParams(
      new URLSearchParams({ page: "1", pageSize: pageSize.toString() })
    );
  }, [pageSize, setSearchParams]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 pt-24 pb-16 px-4 sm:px-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-medium text-neutral-800 dark:text-white mb-2">
          Explore Phones
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl">
          Find and compare the latest smartphones with detailed specifications
          and features
        </p>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white dark:bg-card rounded-3xl shadow-soft p-4 sm:p-6">
          {/* Search and Filter Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-neutral-400" />
              </div>
              <input
                type="text"
                placeholder="Search phones..."
                value={searchQuery}
                onChange={(e) => handleSearchQueryChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <button
              onClick={() => {
                if (isMobile.current) {
                  setShowMobileFilters(true);
                } else {
                  setShowFilters(!showFilters);
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
                activeFiltersCount > 0
                  ? "bg-brand text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              } transition-colors`}
            >
              {activeFiltersCount > 0 ? (
                <>
                  <Filter size={18} />
                  <span>Filters ({activeFiltersCount})</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={18} />
                  <span>Filters</span>
                </>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mb-6">
              <FilterPanel
                filters={filters}
                filterOptions={filterOptions}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                activeFiltersCount={activeFiltersCount}
              />
            </div>
          )}

          {/* Sort and Page Size Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Sort by:
              </span>
              <SortSelect value={sort} onChange={setSort} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Show:
              </span>
              <PageSizeSelect
                value={pageSize}
                onChange={(v) => {
                  setPageSize(v);
                  setPage(1);
                }}
              />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                per page
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
      />

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">
              Loading phones...
            </p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
              {phones.length > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-neutral-800 dark:text-white">
                    {phones.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-neutral-800 dark:text-white">
                    {total}
                  </span>{" "}
                  phones
                  {activeFiltersCount > 0 && (
                    <span>
                      {" "}
                      with{" "}
                      <span className="font-medium text-neutral-800 dark:text-white">
                        {activeFiltersCount}
                      </span>{" "}
                      active filters
                    </span>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-lg font-medium text-neutral-800 dark:text-white mb-2">
                    No phones match your filters
                  </div>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    Try adjusting your filters or clearing them to see more
                    results.
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {phones.map((phone) => (
                <PhoneCard
                  key={phone.id}
                  phone={phone}
                  onFullSpecs={() => navigate(`/phones/${phone.id}`)}
                  onCompare={() => navigate(`/compare?phone=${phone.id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-12">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PhonesPage;
