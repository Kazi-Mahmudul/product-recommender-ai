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
      const urlToken = searchParams.get('token');
      const isNewUser = searchParams.get('new_user') === 'true';

      let effectiveToken = token;

      // If token is provided in URL, save it and use it
      if (urlToken) {
        localStorage.setItem('auth_token', urlToken);
        // We'll trust the token from URL temporarily until context updates
        effectiveToken = urlToken;

        // Reload is often the safest way to reset all context state with new token
        // But let's try to do it gracefully first if we can access setToken exposed by context?
        // Context exposes setUser but maybe not setToken directly used this way?
        // Actually AuthContext provider exposes user, loading, token...
        // We can manually set the token in the cookie as a fallacy backup if needed by legacy code, 
        // but localStorage is primary for this app's Bearer auth
      }

      if (effectiveToken || urlToken) {
        const currentToken = effectiveToken || urlToken!;

        try {
          // Check user data
          const response = await fetch('/api/v1/auth/me', {
            headers: {
              'Authorization': `Bearer ${currentToken}`
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

            // Redirect logic
            setTimeout(() => {
              const redirectPath = localStorage.getItem('post_auth_redirect') || '/';
              localStorage.removeItem('post_auth_redirect');
              // Force a reload if we just set the token to ensure all contexts pick it up
              if (urlToken) {
                window.location.href = redirectPath;
              } else {
                navigate(redirectPath);
              }
            }, 1500);

          } else {
            console.error("Failed to verify token from URL");
            navigate('/login');
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          navigate('/login');
        }
      } else if (!loading) {
        // No token found
        console.warn("No token found in URL or Context");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
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