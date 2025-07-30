import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Phone } from "../api/phones";
import { parseComparisonUrl, validateComparisonPhoneIdentifiers, generateComparisonUrl } from "../utils/slugUtils";
import { useComparisonState } from "../hooks/useComparisonState";
import { useAIVerdict } from "../hooks/useAIVerdict";

import StickyProductCards from "../components/Compare/StickyProductCards";
import PhonePickerModal from "../components/Compare/PhonePickerModal";
import ComparisonTable from "../components/Compare/ComparisonTable";
import MetricChart from "../components/Compare/MetricChart";
import AIVerdictBlock from "../components/Compare/AIVerdictBlock";
import ComparisonActions from "../components/Compare/ComparisonActions";
import ComparisonHistory from "../components/Compare/ComparisonHistory";
import ComparisonErrorBoundary from "../components/ErrorBoundary/ComparisonErrorBoundary";

const ComparePage: React.FC = () => {
  const { phoneIdentifiers } = useParams<{ phoneIdentifiers?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Initialize comparison state
  const [comparisonState, comparisonActions] = useComparisonState();
  
  // Initialize AI verdict state
  const [aiVerdictState, aiVerdictActions] = useAIVerdict();
  
  // Modal state
  const [isPhonePickerOpen, setIsPhonePickerOpen] = useState(false);
  const [phoneToReplace, setPhoneToReplace] = useState<number | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Ref to track if we've processed the initial URL
  const hasProcessedInitialUrl = useRef(false);
  

  // Parse phone identifiers from URL on component mount
  useEffect(() => {
    // Only process URL once to prevent infinite loops
    if (hasProcessedInitialUrl.current) return;
    
    if (phoneIdentifiers) {
      const parsedUrl = parseComparisonUrl(phoneIdentifiers);
      const validation = validateComparisonPhoneIdentifiers(parsedUrl.identifiers);
      
      if (validation.isValid) {
        if (parsedUrl.isSlugBased) {
          // Handle slug-based URLs properly
          comparisonActions.setSelectedPhoneSlugs(parsedUrl.identifiers);
          hasProcessedInitialUrl.current = true;
        } else {
          // Handle ID-based URLs (legacy)
          const phoneIds = parsedUrl.identifiers.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
          comparisonActions.setSelectedPhoneIds(phoneIds);
          hasProcessedInitialUrl.current = true;
        }
      } else {
        // Redirect to empty comparison page if invalid
        navigate('/compare', { replace: true });
      }
    } else {
      // Check for phone IDs in search params (fallback)
      const phoneIdsParam = searchParams.get('phones');
      
      if (phoneIdsParam) {
        const parsedUrl = parseComparisonUrl(phoneIdsParam);
        const validation = validateComparisonPhoneIdentifiers(parsedUrl.identifiers);
        
        if (validation.isValid && parsedUrl.isLegacyFormat) {
          const phoneIds = parsedUrl.identifiers.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
          comparisonActions.setSelectedPhoneIds(phoneIds);
          // Update URL to use path params instead of search params
          navigate(`/compare/${phoneIds.join('-')}`, { replace: true });
          hasProcessedInitialUrl.current = true;
        }
      } else {
        hasProcessedInitialUrl.current = true;
      }
    }
  }, [phoneIdentifiers, searchParams, navigate, comparisonActions]);

  // Handle opening phone picker for adding
  const handleOpenAddPhone = () => {
    setPhoneToReplace(null);
    setIsPhonePickerOpen(true);
  };

  // Handle opening phone picker for replacing
  const handleOpenChangePhone = (phoneId: number) => {
    setPhoneToReplace(phoneId);
    setIsPhonePickerOpen(true);
  };

  // Handle phone selection from picker
  const handlePhoneSelect = (phone: Phone) => {
    if (phoneToReplace !== null) {
      // Replace existing phone
      comparisonActions.replacePhone(phoneToReplace, phone);
    } else {
      // Add new phone
      comparisonActions.addPhone(phone.slug!);
    }
    setIsPhonePickerOpen(false);
    setPhoneToReplace(null);
  };

  // Handle removing a phone from comparison
  const handleRemovePhone = (phoneId: number) => {
    comparisonActions.removePhone(phoneId);
    const newPhones = comparisonState.phones.filter(p => p.id !== phoneId);
    
    if (newPhones.length === 0) {
      navigate('/compare');
    } else {
      navigate(generateComparisonUrl(newPhones));
    }
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (comparisonState.error) {
      const timer = setTimeout(() => comparisonActions.clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [comparisonState.error, comparisonActions]);

  // Update URL when phones change
  useEffect(() => {
    if (comparisonState.phones.length > 0) {
      const newUrl = generateComparisonUrl(comparisonState.phones);
      if (window.location.pathname !== newUrl) {
        navigate(newUrl, { replace: true });
      }
    }
  }, [comparisonState.phones, navigate]);
  
  // Ref to track if a verdict generation is in progress
  const isGeneratingVerdictRef = useRef(false);

  // Auto-generate AI verdict when phones are loaded
  useEffect(() => {
    if (
      comparisonState.phones.length >= 2 &&
      !aiVerdictState.verdict &&
      !aiVerdictState.isLoading &&
      !aiVerdictState.error &&
      !isGeneratingVerdictRef.current
    ) {
      isGeneratingVerdictRef.current = true;
      aiVerdictActions.generateVerdict(comparisonState.phones)
        .finally(() => {
          isGeneratingVerdictRef.current = false;
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonState.phones, aiVerdictState.isLoading, aiVerdictState.error, aiVerdictActions]);

  // Clear AI verdict when phones change (to trigger new generation)
  useEffect(() => {
    if (!aiVerdictState.isLoading) {
      aiVerdictActions.clearVerdict();
    }
  }, [comparisonState.phones, aiVerdictActions, aiVerdictState.isLoading]);

  return (
    <ComparisonErrorBoundary>
      <div className="min-h-screen bg-[#fdfbf9] dark:bg-[#121212] pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Compare Phones
            </h1>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="View comparison history"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Compare up to 5 smartphones side-by-side with detailed specifications, 
            AI-powered insights, and interactive visualizations.
          </p>
        </div>

        {/* Error Display */}
        {comparisonState.error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="text-red-700 dark:text-red-300">{comparisonState.error}</span>
                  {comparisonState.retryCount > 0 && (
                    <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Retry attempt {comparisonState.retryCount}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={comparisonActions.retryFetch}
                disabled={comparisonState.isLoading || comparisonState.isRetrying}
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {comparisonState.isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {comparisonState.isLoading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white dark:bg-gray-800 transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {comparisonState.isRetrying ? (
                <>Retrying phone data... (Attempt {comparisonState.retryCount})</>
              ) : (
                <>Loading phone data...</>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {comparisonState.selectedPhoneIds.length === 0 ? (
          // Empty state - no phones selected
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <svg className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                {comparisonState.error ? 'Unable to Load Phones' : 'Start Your Comparison'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {comparisonState.error 
                  ? 'The requested phones could not be loaded. Please select different phones from our catalog.'
                  : 'Select phones from our catalog to begin comparing their features, specifications, and get AI-powered recommendations.'
                }
              </p>
              <button
                onClick={() => navigate('/phones')}
                className="inline-flex items-center px-6 py-3 bg-brand hover:bg-brand-darkGreen text-white hover:text-hover-light font-medium rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Browse Phones
              </button>
            </div>
          </div>
        ) : (
          // Comparison content
          <div>
            {/* Sticky Product Cards */}
            <StickyProductCards
              phones={comparisonState.phones}
              onRemovePhone={handleRemovePhone}
              onChangePhone={handleOpenChangePhone}
              onAddPhone={handleOpenAddPhone}
              maxPhones={5}
            />

            {/* Main Comparison Content */}
            <div className="mt-8 space-y-8">
              {/* Comparison Table */}
              <ComparisonTable
                phones={comparisonState.phones}
                highlightBest={true}
              />

              {/* Metric Chart */}
              <MetricChart
                phones={comparisonState.phones}
                chartType="bar"
              />

              {/* AI Verdict Block */}
              <AIVerdictBlock
                phones={comparisonState.phones}
                verdict={aiVerdictState.verdict}
                isLoading={aiVerdictState.isLoading}
                error={aiVerdictState.error}
                onGenerateVerdict={() => aiVerdictActions.generateVerdict(comparisonState.phones)}
                onRetry={aiVerdictActions.retry}
              />

              {/* Export and Sharing Actions */}
              <ComparisonActions
                phones={comparisonState.phones}
                verdict={aiVerdictState.verdict}
              />
            </div>
          </div>
        )}

        {/* Phone Picker Modal */}
        <PhonePickerModal
          isOpen={isPhonePickerOpen}
          onClose={() => {
            setIsPhonePickerOpen(false);
            setPhoneToReplace(null);
          }}
          onSelectPhone={handlePhoneSelect}
          excludePhoneIds={comparisonState.selectedPhoneIds}
          title={phoneToReplace !== null ? "Replace Phone" : "Add Phone to Comparison"}
        />

        {/* Comparison History Modal */}
        <ComparisonHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
        </div>
      </div>
    </ComparisonErrorBoundary>
  );
};

export default ComparePage;