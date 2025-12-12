import React from 'react';
import { Link, useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, RotateCcw } from 'lucide-react';

interface ErrorWithMessage {
  message?: string;
}

const ErrorPage: React.FC = () => {
  const error = useRouteError() as ErrorWithMessage;
  const navigate = useNavigate();

  let errorMessage = 'An unexpected error occurred';
  let errorStatus = '';
  let errorStatusText = '';

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status.toString();
    errorStatusText = error.statusText;
    errorMessage = error.data || (error.status >= 500 ? 'Internal Server Error' : 'An error occurred');
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = (error.message || 'An error occurred') as string;
  }

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-semantic-danger/5 via-white to-semantic-danger/10 dark:from-semantic-danger/20 dark:via-gray-900 dark:to-semantic-danger/20 px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8">
          <div className="w-24 h-24 bg-semantic-danger/10 dark:bg-semantic-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="text-semantic-danger text-4xl">⚠️</div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {errorStatus ? `${errorStatus} ${errorStatusText || 'Error'}` : 'Something went wrong'}
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <RotateCcw size={18} />
            Refresh Page
          </button>
          
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand dark:hover:text-hover-light rounded-xl transition-colors shadow-sm hover:shadow-md"
          >
            <Home size={18} />
            Go Home
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Need additional help?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Check our FAQ</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Find answers to common questions
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Contact Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get help from our team
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;