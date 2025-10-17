import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthAlerts } from '../hooks/useAuthAlerts';

const AuthSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, token, setUser } = useAuth();
  const authAlerts = useAuthAlerts(false); // Assuming light mode for this page

  useEffect(() => {
    const handleAuthSuccess = async () => {
      // Parse query parameters
      const searchParams = new URLSearchParams(location.search);
      const isNewUser = searchParams.get('new_user') === 'true';
      
      // The token should already be set in the cookie from the backend callback
      // We just need to ensure the UI updates and show a success message
      
      if (!loading) {
        if (token) {
          // If we don't have user data yet, fetch it
          if (!user) {
            try {
              const response = await fetch('/api/v1/auth/me', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const userData = await response.json();
                setUser({
                  ...userData,
                  auth_provider: 'google',
                  last_login: new Date().toISOString()
                });
                
                // Show appropriate success message
                if (isNewUser) {
                  await authAlerts.showSignupSuccess(userData);
                } else {
                  await authAlerts.showGoogleLoginSuccess(userData);
                }
              }
            } catch (error) {
              console.error('Failed to fetch user data:', error);
            }
          } else {
            // Show appropriate success message
            if (isNewUser) {
              await authAlerts.showSignupSuccess(user);
            } else {
              await authAlerts.showGoogleLoginSuccess(user);
            }
          }
          
          // Redirect to original page or home page after a short delay
          setTimeout(() => {
            // Get the stored redirect URL or default to home
            const redirectPath = localStorage.getItem('post_auth_redirect') || '/';
            // Remove the stored redirect URL
            localStorage.removeItem('post_auth_redirect');
            navigate(redirectPath);
          }, 2000);
        } else {
          // If no token, maybe redirect to login
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      }
    };

    handleAuthSuccess();
  }, [loading, token, user, navigate, authAlerts, location.search, setUser]);

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