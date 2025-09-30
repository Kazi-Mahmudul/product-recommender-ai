import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthAlerts } from '../hooks/useAuthAlerts';

const AuthSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, token } = useAuth();
  const authAlerts = useAuthAlerts(false); // Assuming light mode for this page

  useEffect(() => {
    const handleAuthSuccess = async () => {
      // The token should already be set in the cookie from the backend callback
      // We just need to ensure the UI updates and show a success message
      
      if (!loading) {
        if (token && user) {
          // User is authenticated, show success and redirect
          await authAlerts.showGoogleLoginSuccess(user);
          setTimeout(() => {
            navigate('/');
          }, 2000); // Redirect after 2 seconds
        } else {
          // If no token, maybe redirect to login
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      }
    };

    handleAuthSuccess();
  }, [loading, token, user, navigate, authAlerts]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand/5 via-white to-brand-darkGreen/10 dark:from-brand/20 dark:via-gray-900 dark:to-brand-darkGreen/20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-2">Completing Authentication</h2>
        <p className="text-neutral-600 dark:text-neutral-400">Please wait while we complete the authentication process...</p>
      </div>
    </div>
  );
};

export default AuthSuccessPage;