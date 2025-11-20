import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GoogleCallbackPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code) {
        setError("No authorization code received from Google.");
        return;
      }

      try {
        const API_BASE = process.env.REACT_APP_API_BASE || "/api";
        // Construct the callback URL with query parameters
        const callbackUrl = `${API_BASE}/api/v1/auth/google/callback?code=${code}&state=${state || ""}`;
        
        // Since the backend redirects to the frontend success page with the token,
        // we might not need to fetch here if the backend handles the redirect.
        // However, if the backend returns JSON, we handle it here.
        // Based on the backend code, it redirects to /auth/success with token in URL.
        // So we should actually just let the backend redirect happen if we were navigating the browser.
        // But since we are in an SPA and captured the route, we need to call the backend.
        
        // Wait, the backend uses `RedirectResponse`. If we use `fetch`, the redirect is followed transparently 
        // or we get the final content. 
        // BUT, the backend sets a cookie. `fetch` will store the cookie if we use `credentials: 'include'`.
        
        // Let's try to just redirect the window to the backend callback URL, 
        // so the browser handles the cookie setting and the final redirect.
        window.location.href = callbackUrl;
        
      } catch (err: any) {
        console.error("Google login error:", err);
        setError(err.message || "Failed to complete Google login.");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
  }, [location, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Login Failed</h2>
          <p className="text-gray-700">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">Processing Google Login...</h2>
        <p className="text-gray-600">Please wait while we verify your credentials.</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
