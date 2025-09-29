import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchFilterOptions,
  Phone,
  SortOrder,
} from "../api/phones";
import PhoneCard from "../components/PhoneCard";
import { generatePhoneDetailUrl } from "../utils/slugUtils";
import Pagination from "../components/Pagination";
import SortSelect from "../components/SortSelect";
import PageSizeSelect from "../components/PageSizeSelect";
import FilterPanel from "../components/filters/FilterPanel";
import MobileFilterDrawer from "../components/filters/MobileFilterDrawer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Filter, X, Loader2, Smartphone } from "lucide-react";
import { FilterState, defaultFilterState } from "../types/filters";
import {
  filtersToSearchParams,
  searchParamsToFilters,
} from "../utils/urlUtils";
import { useFilterCache } from "../hooks/useFilterCache";
import debounce from "lodash/debounce";
import { fuzzySearchPhones, SearchResult } from "../api/search";
import { getSecureApiBase } from '../cache-buster';

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
  
  // Extract search query from URL params and set it to state
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setSearchQuery(query);
  }, [searchParams]);
  const { filterOptions } = useFilterCache(fetchFilterOptions);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    fetchPhonesWithSearch({ page, pageSize, sort, filters, search: searchQuery })
      .then(({ items, total }) => {
        setPhones(items);
        setTotal(total);
      })
      .catch((error) => {
        console.error("Failed to fetch phones:", error);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, sort, filters, searchQuery]);

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
      // Don't update URL or reset page until user presses Enter or clicks search button
      // This allows the real-time search to work without affecting the main phone list
    },
    []
  );

  // Handle search submit when user presses Enter or clicks search button
  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setPage(1); // Reset to first page when search query changes
      updateUrl(filters, searchQuery.trim(), 1, pageSize);
    }
  };

  // Clear all filters
  // Define handleSearch with useCallback to prevent unnecessary re-renders
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await fuzzySearchPhones(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, setSearchResults, setIsSearching]);

  // Handle search functionality with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [handleSearch, searchQuery]);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilterState);
    setSearchQuery("");
    setSearchResults([]);
    setPage(1);
    setSearchParams(
      new URLSearchParams({ page: "1", pageSize: pageSize.toString() })
    );
  }, [pageSize, setSearchParams]);

  // Click outside to close search results
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    
    if (searchFocused) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchFocused]);

  // Handle result click
  const handleResultClick = (phoneSlug: string) => {
    // For search results, we use the slug for direct navigation to the phone details page
    navigate(`/phones/${phoneSlug}`);
    setSearchFocused(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Custom function to fetch phones with search support
  const fetchPhonesWithSearch = async ({ 
    page = 1, 
    pageSize = 20, 
    sort = "default", 
    filters,
    search
  }: { 
    page?: number; 
    pageSize?: number; 
    sort?: SortOrder; 
    filters?: FilterState;
    search?: string;
  } = {}): Promise<{ items: Phone[], total: number }> => {
    // Set up pagination parameters
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: pageSize.toString(),
    });

    // Add search parameter if provided
    if (search && search.trim()) {
      params.append("search", search.trim());
    }

    // Add all filter parameters to the API request
    if (filters) {
      // Price range filters
      if (filters.priceRange.min !== null)
        params.append("min_price", filters.priceRange.min.toString());
      if (filters.priceRange.max !== null)
        params.append("max_price", filters.priceRange.max.toString());

      // Brand filter
      if (filters.brand !== null) params.append("brand", filters.brand);

      // Camera filters
      if (filters.cameraSetup !== null)
        params.append("camera_setup", filters.cameraSetup);
      if (filters.mainCamera !== null)
        params.append("min_primary_camera_mp", filters.mainCamera.toString());
      if (filters.frontCamera !== null)
        params.append("min_selfie_camera_mp", filters.frontCamera.toString());

      // Performance filters
      if (filters.ram !== null)
        params.append("min_ram_gb", filters.ram.toString());
      if (filters.storage !== null)
        params.append("min_storage_gb", filters.storage.toString());

      // Battery filters
      if (filters.batteryType !== null)
        params.append("battery_type", filters.batteryType);
      if (filters.batteryCapacity !== null)
        params.append("min_battery_capacity", filters.batteryCapacity.toString());

      // Display filters
      if (filters.displayType !== null)
        params.append("display_type", filters.displayType);
      if (filters.refreshRate !== null)
        params.append("min_refresh_rate", filters.refreshRate.toString());
      if (filters.displaySize.min !== null)
        params.append("min_screen_size", filters.displaySize.min.toString());
      if (filters.displaySize.max !== null)
        params.append("max_screen_size", filters.displaySize.max.toString());

      // Platform filters
      if (filters.chipset !== null) params.append("chipset", filters.chipset);
      if (filters.os !== null) params.append("os", filters.os);
    }

    // Add sorting parameter
    if (sort !== "default") {
      params.append("sort", sort);
    }

    // Fetch phones from API
    const API_BASE = getSecureApiBase();
    const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const res = await fetch(`${baseUrl}/api/v1/phones?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch phones");
    const data = await res.json();
    let items = data.items;
    let totalCount = data.total || items.length;

    return { items, total: totalCount };
  };

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
            <div className="relative flex-1 max-w-md" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search phones..."
                    value={searchQuery}
                    onChange={(e) => {
                      handleSearchQueryChange(e.target.value);
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={(e) => {
                      // If user presses Enter, submit the search
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchSubmit();
                      }
                    }}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                    autoComplete="off"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        // Also update the main filters when clearing the search
                        if (searchParams.get("q")) {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.delete("q");
                          setSearchParams(newParams);
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X size={18} />
                    </button>
                  ) : (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      <Search size={18} />
                    </div>
                  )}

                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={18} className="animate-spin text-brand" />
                    </div>
                  )}
                </div>
              </form>

              {/* Search Results */}
              {searchFocused && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-neutral-900 rounded-2xl shadow-soft-lg border border-neutral-200 dark:border-neutral-700/30 p-3">
                  <div className="max-h-80 overflow-y-auto rounded-xl">
                    {searchResults.length > 0 ? (
                      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors duration-150"
                            onClick={() => handleResultClick(result.slug || `phone-${result.id}`)}
                          >
                            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {result.img_url ? (
                                <img
                                  src={result.img_url}
                                  alt={result.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = "/no-image-placeholder.svg";
                                  }}
                                />
                              ) : (
                                <Smartphone
                                  size={16}
                                  className="text-neutral-400"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                                {result.name}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {result.ram && `${result.ram} • `}
                                {result.internal_storage &&
                                  `${result.internal_storage} • `}
                                <span className="text-brand font-medium">
                                  ৳ {result.price}
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isSearching && (
                        <div className="py-3 px-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                          No phones found matching "{searchQuery}"
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
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
                  onFullSpecs={() => navigate(generatePhoneDetailUrl(phone))}
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
