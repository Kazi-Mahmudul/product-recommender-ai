import React, { useState } from 'react';
import { Phone } from '../../api/phones';
import { BRAND_COLORS } from '../../utils/colorSystem';
import {
  generateComparisonPDF,
  generateShareableUrl,
  copyToClipboard,
  shareComparison,
  saveComparisonToHistory
} from '../../utils/exportUtils';

interface ComparisonActionsProps {
  phones: Phone[];
  verdict?: string | null;
}

const ComparisonActions: React.FC<ComparisonActionsProps> = ({
  phones,
  verdict
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleExportPDF = async () => {
    if (phones.length === 0) return;

    setIsExporting(true);
    try {
      await generateComparisonPDF(phones, verdict || undefined);
      // Save to history when user exports
      saveComparisonToHistory(phones);

      // Show success feedback
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successMessage.textContent = '✓ PDF exported successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
    } catch (error) {
      console.error('Export failed:', error);

      // Show error feedback
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMessage.textContent = '✗ Failed to export PDF. Please try again.';
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = async () => {
    if (phones.length === 0) return;

    const url = generateShareableUrl(phones.map(p => p.slug!));
    const success = await copyToClipboard(url);

    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      // Save to history when user copies link
      saveComparisonToHistory(phones);
    } else {
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleShare = async () => {
    if (phones.length === 0) return;

    const url = generateShareableUrl(phones.map(p => p.slug!));
    const success = await shareComparison(phones, url);

    if (success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
      // Save to history when user shares
      saveComparisonToHistory(phones);
    } else {
      // Fallback to copy link if native sharing is not supported
      handleCopyLink();
    }
  };

  if (phones.length === 0) {
    return null;
  }

  return (
    <div className="max-w-[800px] mx-auto bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Export & Share
        </h2>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
          Save or share this comparison with others
        </p>
      </div>

      <div className="p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3 font-medium rounded-md transition-colors duration-200 ${isExporting
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : `bg-[${BRAND_COLORS.green}] hover:bg-[${BRAND_COLORS.green}]/90 text-white`
              }`}
            aria-label={isExporting ? 'Exporting comparison to PDF...' : 'Export comparison as PDF'}
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs sm:text-sm">Exporting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs sm:text-sm">Export PDF</span>
              </>
            )}
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3 font-medium rounded-md transition-all duration-200 ${copySuccess
                ? 'bg-green-600 text-white'
                : `bg-[${BRAND_COLORS.darkGreen}] hover:bg-[${BRAND_COLORS.darkGreen}]/90 text-black`
              }`}
            aria-label={copySuccess ? 'Link copied to clipboard' : 'Copy comparison link to clipboard'}
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs sm:text-sm">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-xs sm:text-sm">Copy Link</span>
              </>
            )}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className={`flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3 font-medium rounded-md transition-all duration-200 ${shareSuccess
                ? 'bg-green-600 text-white'
                : `bg-[${BRAND_COLORS.green}] hover:bg-[${BRAND_COLORS.green}]/90 text-white`
              }`}
            aria-label={shareSuccess ? 'Comparison shared successfully' : 'Share comparison with others'}
          >
            {shareSuccess ? (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs sm:text-sm">Shared!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-xs sm:text-sm">Share</span>
              </>
            )}
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-md sm:rounded-lg">
          <div className="flex items-start">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Export & Share Features:</p>
              <ul className="space-y-1 text-[10px] md:text-sm">
                <li>• PDF export includes all specifications and AI verdict</li>
                <li>• Shareable links preserve your exact comparison</li>
                <li>• Comparisons are automatically saved to your history</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonActions;