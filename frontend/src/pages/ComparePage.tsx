import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Phone } from "../api/phones";
import { parseComparisonUrl, validateComparisonPhoneSlugs, generateComparisonUrl } from "../utils/slugUtils";
import { useComparisonState } from "../hooks/useComparisonState";
import { useAIVerdict } from "../hooks/useAIVerdict";
import { getComparisonSession } from "../api/comparison";

import StickyProductCards from "../components/Compare/StickyProductCards";
import PhonePickerModal from "../components/Compare/PhonePickerModal";
import ComparisonTable from "../components/Compare/ComparisonTable";
import MetricChart from "../components/Compare/MetricChart";
import AIVerdictBlock from "../components/Compare/AIVerdictBlock";
import ComparisonActions from "../components/Compare/ComparisonActions";
import ComparisonHistory from "../components/Compare/ComparisonHistory";
import ComparisonErrorBoundary from "../components/ErrorBoundary/ComparisonErrorBoundary";
import { toast, ToastContainer } from 'react-toastify';
import DataRetentionNotice from "../components/Compare/DataRetentionNotice";
import 'react-toastify/dist/ReactToastify.css';

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
  const [phoneToReplace, setPhoneToReplace] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Data retention notice state
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const [isRetentionNoticeVisible, setIsRetentionNoticeVisible] = useState(false);

  // Ref to track if we've processed the initial URL
  const hasProcessedInitialUrl = useRef(false);
  

  // Parse phone slugs from URL on component mount
  useEffect(() => {
    // Only process URL once to prevent infinite loops
    if (hasProcessedInitialUrl.current) return;
    
    if (phoneIdentifiers) {
      const parsedUrl = parseComparisonUrl(phoneIdentifiers);
      const validation = validateComparisonPhoneSlugs(parsedUrl.slugs);
      
      if (validation.isValid) {
        comparisonActions.setSelectedPhoneSlugs(parsedUrl.slugs);
        hasProcessedInitialUrl.current = true;
      } else {
        // Redirect to empty comparison page if invalid
        navigate('/compare', { replace: true });
      }
    } else {
      hasProcessedInitialUrl.current = true;
    }
  }, [phoneIdentifiers, navigate, comparisonActions]);

  // Handle opening phone picker for adding
  const handleOpenAddPhone = () => {
    setPhoneToReplace(null);
    setIsPhonePickerOpen(true);
  };

  // Handle opening phone picker for replacing
  const handleOpenChangePhone = (phoneSlug: string) => {
    setPhoneToReplace(phoneSlug);
    setIsPhonePickerOpen(true);
  };

  // Handle phone selection from picker
  const handlePhoneSelect = (phone: Phone) => {
    if (phoneToReplace !== null) {
      // Replace existing phone
      comparisonActions.replacePhone(phoneToReplace, phone); // Pass the full phone object
      toast.success(`${phone.name} has been added to the comparison.`);
    } else {
      // Add new phone
      comparisonActions.addPhone(phone.slug!);
      toast.success(`${phone.name} has been added to the comparison.`);
    }
    setIsPhonePickerOpen(false);
    setPhoneToReplace(null);
  };

  // Handle removing a phone from comparison
  const handleRemovePhone = (phoneSlug: string) => {
    comparisonActions.removePhone(phoneSlug);
    const newPhones = comparisonState.phones.filter(p => p.slug !== phoneSlug);
    toast.success(`A phone has been removed from the comparison.`);
    
    if (newPhones.length === 0) {
      navigate('/compare');
    } else {
      navigate(generateComparisonUrl(newPhones.map(p => p.slug!)));
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
      const newUrl = generateComparisonUrl(comparisonState.selectedPhoneSlugs);
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

  // Fetch session expiration data and manage retention notice visibility
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const session = await getComparisonSession();
        const expiresAt = new Date(session.expires_at);
        setSessionExpiresAt(expiresAt);

        // Check if session has already expired
        if (expiresAt.getTime() <= new Date().getTime()) {
          // Session expired, clear comparison state and show appropriate message
          comparisonActions.clearError();
          setIsRetentionNoticeVisible(false);
          return;
        }

        // Check if user has dismissed the notice for this session
        const dismissalData = localStorage.getItem('comparison_retention_notice_dismissed');
        if (dismissalData) {
          const parsed = JSON.parse(dismissalData);
          const isDismissedForCurrentSession = parsed.sessionExpiry === expiresAt.getTime();
          setIsRetentionNoticeVisible(!isDismissedForCurrentSession);
        } else {
          setIsRetentionNoticeVisible(true);
        }
      } catch (error) {
        console.error('Failed to fetch session data:', error);
        
        // Handle different types of session errors
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('expired')) {
            // Session not found or expired
            setIsRetentionNoticeVisible(false);
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            // Network error - show user-friendly message
            console.warn('Network error fetching session data, continuing without retention notice');
          }
        }
        
        // Don't show retention notice if we can't verify session
        setIsRetentionNoticeVisible(false);
      }
    };

    // Only fetch session data if we have phones in comparison
    if (comparisonState.selectedPhoneSlugs.length > 0) {
      fetchSessionData();
    } else {
      setIsRetentionNoticeVisible(false);
    }
  }, [comparisonState.selectedPhoneSlugs, comparisonActions]);

  // Handle retention notice dismissal
  const handleRetentionNoticeDismiss = () => {
    setIsRetentionNoticeVisible(false);
  };

  return (
    <ComparisonErrorBoundary>
      <ToastContainer />
      <div className="min-h-screen bg-[#fdfbf9] dark:bg-[#121212] pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#377D5B] to-[#80EF80] bg-clip-text text-transparent">
                Compare Phones
              </h1>
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
            </div>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-3 bg-white dark:bg-gray-800 text-gray-500 hover:text-[#377D5B] dark:text-gray-400 dark:hover:text-[#80EF80] transition-all duration-200 rounded-full shadow-md hover:shadow-lg transform hover:scale-105"
              title="View comparison history"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4 leading-relaxed">
            Compare up to 5 smartphones side-by-side with detailed specifications, 
            <span className="text-[#377D5B] dark:text-[#80EF80] font-semibold"> AI-powered insights</span>, and interactive visualizations.
          </p>
          <div className="mt-6 flex justify-center">
            <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#377D5B] rounded-full"></div>
                <span>Detailed Specs</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#80EF80] rounded-full"></div>
                <span>AI Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>PDF Export</span>
              </div>
            </div>
          </div>
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {comparisonState.isLoading && (
          <div className="text-center py-12">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#377D5B]/20 border-t-[#377D5B] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-gradient-to-r from-[#377D5B] to-[#80EF80] rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {comparisonState.isRetrying ? 'Retrying Connection...' : 'Loading Comparison Data'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {comparisonState.isRetrying ? (
                  <>Attempting to reconnect... (Attempt {comparisonState.retryCount})</>
                ) : (
                  <>Fetching phone specifications and details</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Data Retention Notice */}
        {sessionExpiresAt && isRetentionNoticeVisible && (
          <DataRetentionNotice
            sessionExpiresAt={sessionExpiresAt}
            isVisible={isRetentionNoticeVisible}
            onDismiss={handleRetentionNoticeDismiss}
          />
        )}

        {/* Main Content */}
        {comparisonState.selectedPhoneSlugs.length === 0 ? (
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
                className="inline-flex items-center px-6 py-3 bg-[#377D5B] hover:bg-[#377D5B]/90 text-white font-medium rounded-lg transition-colors duration-200"
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
                characterCount={aiVerdictState.characterCount}
                retryCount={aiVerdictState.retryCount}
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
          excludePhoneSlugs={comparisonState.selectedPhoneSlugs}
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