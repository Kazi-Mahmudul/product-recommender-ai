import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Phone } from '../api/phones';
import { useNavigate } from 'react-router-dom';
import { generateComparisonUrl } from '../utils/slugUtils';

// Storage key for localStorage
const COMPARISON_STORAGE_KEY = 'epick_comparison_selection';
const STORAGE_VERSION = '1.0';
const MAX_PHONES = 5;

// Error types for comparison operations
export type ComparisonError = 
  | 'MAX_PHONES_REACHED'
  | 'PHONE_ALREADY_SELECTED'
  | 'INVALID_PHONE_DATA'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR';

// Interface for localStorage data structure
interface ComparisonSelection {
  phones: Phone[];
  timestamp: number;
  version: string;
}

// Context interface
export interface ComparisonContextType {
  // State
  selectedPhones: Phone[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addPhone: (phone: Phone) => void;
  removePhone: (phoneId: number) => void;
  clearComparison: () => void;
  isPhoneSelected: (phoneId: number) => boolean;
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
  STORAGE_ERROR: 'Failed to save comparison data',
  NETWORK_ERROR: 'Network error occurred'
};

// Helper function to validate phone data
const isValidPhone = (phone: any): phone is Phone => {
  return (
    phone &&
    typeof phone === 'object' &&
    typeof phone.id === 'number' &&
    typeof phone.name === 'string' &&
    typeof phone.brand === 'string' &&
    typeof phone.price === 'string'
  );
};

// Helper function to load comparison data from localStorage
const loadComparisonFromStorage = (): Phone[] => {
  try {
    const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
    if (!stored) return [];

    const data: ComparisonSelection = JSON.parse(stored);
    
    // Validate data structure and version
    if (!data || typeof data !== 'object' || !Array.isArray(data.phones)) {
      console.warn('Invalid comparison data structure in localStorage');
      return [];
    }

    // Check version compatibility (for future migrations)
    if (data.version !== STORAGE_VERSION) {
      console.warn(`Comparison data version mismatch: ${data.version} vs ${STORAGE_VERSION}`);
      // For now, clear old version data
      localStorage.removeItem(COMPARISON_STORAGE_KEY);
      return [];
    }

    // Validate each phone object
    const validPhones = data.phones.filter(phone => {
      const isValid = isValidPhone(phone);
      if (!isValid) {
        console.warn('Invalid phone data found in localStorage:', phone);
      }
      return isValid;
    });

    // If we filtered out invalid phones, don't immediately save back
    // Just log the issue and return the valid phones
    if (validPhones.length !== data.phones.length) {
      console.warn(`Filtered out ${data.phones.length - validPhones.length} invalid phones from localStorage`);
    }

    return validPhones;
  } catch (error) {
    console.error('Error loading comparison data from localStorage:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(COMPARISON_STORAGE_KEY);
    } catch (clearError) {
      console.error('Error clearing corrupted localStorage data:', clearError);
    }
    return [];
  }
};

// Helper function to save comparison data to localStorage with debouncing
let saveTimeout: NodeJS.Timeout | null = null;
const saveComparisonToStorage = (phones: Phone[]): void => {
  // Clear any existing timeout to debounce rapid saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    try {
      const data: ComparisonSelection = {
        phones,
        timestamp: Date.now(),
        version: STORAGE_VERSION
      };
      
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving comparison data to localStorage:', error);
      // Don't throw error to avoid breaking the app
    }
  }, 100); // Debounce by 100ms
};

// Provider component
export const ComparisonProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPhones, setSelectedPhones] = useState<Phone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load comparison data on mount
  useEffect(() => {
    const storedPhones = loadComparisonFromStorage();
    setSelectedPhones(storedPhones);
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
  const addPhone = useCallback((phone: Phone) => {
    // Validate phone data
    if (!isValidPhone(phone)) {
      setComparisonError('INVALID_PHONE_DATA');
      return;
    }

    // Check if phone is already selected
    if (selectedPhones.some(p => p.id === phone.id)) {
      setComparisonError('PHONE_ALREADY_SELECTED');
      return;
    }

    // Check maximum limit
    if (selectedPhones.length >= MAX_PHONES) {
      setComparisonError('MAX_PHONES_REACHED');
      return;
    }

    // Add phone to selection
    const newSelection = [...selectedPhones, phone];
    setSelectedPhones(newSelection);
    
    // Save to localStorage
    try {
      saveComparisonToStorage(newSelection);
      setError(null); // Clear any previous errors
    } catch (storageError) {
      setComparisonError('STORAGE_ERROR');
    }
  }, [selectedPhones, setComparisonError]);

  // Remove phone from comparison
  const removePhone = useCallback((phoneId: number) => {
    const newSelection = selectedPhones.filter(phone => phone.id !== phoneId);
    setSelectedPhones(newSelection);
    
    // Save to localStorage
    try {
      saveComparisonToStorage(newSelection);
      setError(null); // Clear any previous errors
    } catch (storageError) {
      setComparisonError('STORAGE_ERROR');
    }
  }, [selectedPhones, setComparisonError]);

  // Clear all comparisons
  const clearComparison = useCallback(() => {
    setSelectedPhones([]);
    setError(null);
    
    // Clear from localStorage
    try {
      localStorage.removeItem(COMPARISON_STORAGE_KEY);
    } catch (storageError) {
      console.error('Error clearing comparison data from localStorage:', storageError);
    }
  }, []);

  // Check if phone is selected
  const isPhoneSelected = useCallback((phoneId: number): boolean => {
    return selectedPhones.some(phone => phone.id === phoneId);
  }, [selectedPhones]);

  // Navigate to comparison page
  const navigateToComparison = useCallback(() => {
    if (selectedPhones.length < 2) {
      setError('At least 2 phones are required for comparison');
      return;
    }

    try {
      const phoneIds = selectedPhones.map(phone => phone.id);
      const comparisonUrl = generateComparisonUrl(phoneIds);
      
      // Navigate to comparison page
      navigate(comparisonUrl);
      
      // Don't clear comparison here - let user manually clear it if they want
      // The comparison page works independently with URL-based phone IDs
    } catch (navigationError) {
      console.error('Error navigating to comparison:', navigationError);
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