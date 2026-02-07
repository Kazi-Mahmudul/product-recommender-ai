import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Phone, fetchPhonesBySlugs } from '../api/phones';
import { useNavigate } from 'react-router-dom';
import { generateComparisonUrl } from '../utils/slugUtils';
import { getComparisonSession, addComparisonItem, removeComparisonItem, getComparisonItems, ComparisonItem } from '../api/comparison';

const MAX_PHONES = 5;

// Error types for comparison operations
export type ComparisonError = 
  | 'MAX_PHONES_REACHED'
  | 'PHONE_ALREADY_SELECTED'
  | 'INVALID_PHONE_DATA'
  | 'NETWORK_ERROR';

// Context interface
export interface ComparisonContextType {
  // State
  selectedPhones: Phone[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addPhone: (phone: Phone) => Promise<void>;
  removePhone: (slug: string) => Promise<void>;
  clearComparison: () => Promise<void>;
  isPhoneSelected: (slug: string) => boolean;
  navigateToComparison: () => void;
  clearError: () => void;
}

// Create context
const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

// Error messages mapping
const ERROR_MESSAGES: Record<ComparisonError, string> = {
  MAX_PHONES_REACHED: `Maximum ${MAX_PHONES} phones can be compared at once`,
  PHONE_ALREADY_SELECTED: 'This phone is already in your comparison list',
  INVALID_PHONE_DATA: 'Invalid phone data provided',
  NETWORK_ERROR: 'Network error occurred'
};

// Helper function to validate phone data
const isValidPhone = (phone: any): phone is Phone => {
  return (
    phone &&
    typeof phone === 'object' &&
    typeof phone.slug === 'string' &&
    phone.slug.length > 0 &&
    typeof phone.name === 'string' &&
    typeof phone.brand === 'string' &&
    typeof phone.price === 'string'
  );
};

// Provider component
export const ComparisonProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPhones, setSelectedPhones] = useState<Phone[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as loading to fetch session
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Function to fetch comparison items from the backend
  const fetchComparisonItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getComparisonItems();
      
      if (items.length === 0) {
        setSelectedPhones([]);
        setError(null);
        return;
      }

      // Extract slugs from comparison items
      const slugs = items.map(item => item.slug);
      
      // Fetch full phone data using slugs
      const phones = await fetchPhonesBySlugs(slugs);
      
      setSelectedPhones(phones);
      setError(null);
    } catch (err) {
      // If there's no session yet, that's okay - start with empty list
      setSelectedPhones([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load comparison data on mount
  useEffect(() => {
    // Just fetch items - session will be handled by SessionManager
    fetchComparisonItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Helper function to set error with type safety
  const setComparisonError = useCallback((errorType: ComparisonError) => {
    setError(ERROR_MESSAGES[errorType]);
  }, []);

  // Add phone to comparison
  const addPhone = useCallback(async (phone: Phone) => {
    // Validate phone data
    if (!isValidPhone(phone)) {
      setComparisonError('INVALID_PHONE_DATA');
      return;
    }

    // Check if phone is already selected
    if (selectedPhones.some(p => p.slug === phone.slug)) {
      setComparisonError('PHONE_ALREADY_SELECTED');
      return;
    }

    // Check maximum limit
    if (selectedPhones.length >= MAX_PHONES) {
      setComparisonError('MAX_PHONES_REACHED');
      return;
    }

    try {
      setIsLoading(true);
      
      // If this is the first item and we don't have a session, initialize one
      if (selectedPhones.length === 0) {
        try {
          await getComparisonSession();
        } catch (err) {
          // If session creation fails, continue with local session
          console.warn('Failed to initialize comparison session:', err);
        }
      }
      
      await addComparisonItem(phone.slug!); // Use non-null assertion as isValidPhone checks for slug
      
      // Small delay to ensure backend consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await fetchComparisonItems(); // Re-fetch to get updated list from backend
      
      setError(null); // Clear any previous errors
    } catch (err) {
      setComparisonError('NETWORK_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPhones, setComparisonError, fetchComparisonItems]);

  // Remove phone from comparison
  const removePhone = useCallback(async (slug: string) => {
    try {
      setIsLoading(true);
      await removeComparisonItem(slug);
      await fetchComparisonItems(); // Re-fetch to get updated list from backend
      setError(null); // Clear any previous errors
    } catch (err) {
      setComparisonError('NETWORK_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [setComparisonError, fetchComparisonItems]);

  // Clear all comparisons
  const clearComparison = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch all items and remove them one by one
      const items = await getComparisonItems();
      await Promise.all(items.map(item => removeComparisonItem(item.slug)));
      await fetchComparisonItems(); // Re-fetch to confirm empty list
      setError(null);
    } catch (err) {
      setComparisonError('NETWORK_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [setComparisonError, fetchComparisonItems]);

  // Check if phone is selected
  const isPhoneSelected = useCallback((slug: string): boolean => {
    return selectedPhones.some(phone => phone.slug === slug);
  }, [selectedPhones]);

  // Navigate to comparison page
  const navigateToComparison = useCallback(() => {
    if (selectedPhones.length < 2) {
      setError('At least 2 phones are required for comparison');
      return;
    }

    try {
      const phoneSlugs = selectedPhones.map(phone => phone.slug!);
      const comparisonUrl = generateComparisonUrl(phoneSlugs);
      
      // Navigate to comparison page
      navigate(comparisonUrl);
      
    } catch (navigationError) {
      setError('Failed to navigate to comparison page');
    }
  }, [selectedPhones, navigate]);

  // Clear error manually
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue: ComparisonContextType = {
    selectedPhones,
    isLoading,
    error,
    addPhone,
    removePhone,
    clearComparison,
    isPhoneSelected,
    navigateToComparison,
    clearError
  };

  return (
    <ComparisonContext.Provider value={contextValue}>
      {children}
    </ComparisonContext.Provider>
  );
};

// Custom hook to use comparison context
export function useComparison(): ComparisonContextType {
  const context = useContext(ComparisonContext);
  
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  
  return context;
}