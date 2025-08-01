import React, { useState, useEffect, useCallback } from 'react';
import { BRAND_COLORS } from '../../utils/colorSystem';

interface DataRetentionNoticeProps {
  sessionExpiresAt: Date;
  isVisible: boolean;
  onDismiss: () => void;
}

const DataRetentionNotice: React.FC<DataRetentionNoticeProps> = ({
  sessionExpiresAt,
  isVisible,
  onDismiss,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isWarning, setIsWarning] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const calculateTimeRemaining = useCallback(() => {
    const now = new Date();
    const timeDiff = sessionExpiresAt.getTime() - now.getTime();

    if (timeDiff <= 0) {
      setIsExpired(true);
      setTimeRemaining('Expired');
      return;
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    // Set warning state if less than 2 hours remaining
    setIsWarning(hours < 2);

    if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${seconds}s`);
    }
  }, [sessionExpiresAt]);

  useEffect(() => {
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  const handleDismiss = () => {
    // Store dismissal in localStorage with expiration
    const dismissalData = {
      dismissed: true,
      timestamp: new Date().getTime(),
      sessionExpiry: sessionExpiresAt.getTime(),
    };
    localStorage.setItem('comparison_retention_notice_dismissed', JSON.stringify(dismissalData));
    onDismiss();
  };

  if (!isVisible) return null;

  const getNoticeStyles = () => {
    if (isExpired) {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        icon: 'text-red-600 dark:text-red-400',
      };
    }
    if (isWarning) {
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-800 dark:text-yellow-200',
        icon: 'text-yellow-600 dark:text-yellow-400',
      };
    }
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: 'text-blue-600 dark:text-blue-400',
    };
  };

  const styles = getNoticeStyles();

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 mb-6 transition-all duration-300 ease-in-out`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`${styles.icon} mt-0.5 flex-shrink-0`}>
            {isExpired ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : isWarning ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`${styles.text} text-sm font-semibold mb-1`}>
              {isExpired ? 'Comparison Data Expired' : isWarning ? 'Comparison Expiring Soon' : 'Data Retention Notice'}
            </h3>
            <div className={`${styles.text} text-sm space-y-1`}>
              {isExpired ? (
                <p>
                  Your comparison data has expired and been automatically removed. 
                  <span className="font-medium"> Start a new comparison</span> to continue.
                </p>
              ) : (
                <>
                  <p>
                    Your comparison data is stored for <span className="font-medium">24 hours</span> and will be automatically removed after expiration.
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs">Time remaining:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      isWarning 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200'
                    }`}>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {timeRemaining}
                    </span>
                  </div>
                  {isWarning && (
                    <p className="text-xs mt-2 font-medium">
                      💡 Consider exporting your comparison as PDF to save it permanently.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {!isExpired && (
          <button
            onClick={handleDismiss}
            className={`${styles.icon} hover:bg-black/5 dark:hover:bg-white/5 rounded-full p-1 transition-colors duration-200 flex-shrink-0`}
            aria-label="Dismiss notice"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default DataRetentionNotice;