import { useState, useEffect } from 'react';
import { FilterOptions, defaultFilterOptions } from '../types/filters';

/**
 * Custom hook for caching filter options
 * @param fetchFunction Function to fetch filter options
 * @returns Cached filter options and loading state
 */
export const useFilterCache = (
  fetchFunction: () => Promise<FilterOptions>
): { filterOptions: FilterOptions; loading: boolean } => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Check if we have cached filter options in session storage
    const cachedOptions = sessionStorage.getItem('filterOptions');
    
    if (cachedOptions) {
      try {
        const parsedOptions = JSON.parse(cachedOptions);
        setFilterOptions(parsedOptions);
        setLoading(false);
        
        // Refresh cache in the background
        fetchFunction()
          .then(options => {
            sessionStorage.setItem('filterOptions', JSON.stringify(options));
            setFilterOptions(options);
          })
          .catch(error => {
            console.error('Error refreshing filter options cache:', error);
          });
      } catch (error) {
        console.error('Error parsing cached filter options:', error);
        fetchFreshOptions();
      }
    } else {
      fetchFreshOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFunction]);
  
  const fetchFreshOptions = () => {
    setLoading(true);
    fetchFunction()
      .then(options => {
        sessionStorage.setItem('filterOptions', JSON.stringify(options));
        setFilterOptions(options);
      })
      .catch(error => {
        console.error('Error fetching filter options:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  return { filterOptions, loading };
};