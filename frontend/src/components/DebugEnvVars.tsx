import React from 'react';

/**
 * Debug component to show environment variables in production
 * This will help us understand what's happening with the environment variables
 */
const DebugEnvVars: React.FC = () => {
  // Only show in development or when explicitly enabled
  const showDebug = process.env.NODE_ENV === 'development' || 
                   process.env.REACT_APP_SHOW_DEBUG === 'true';

  if (!showDebug) {
    return null;
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_BASE: process.env.REACT_APP_API_BASE,
    REACT_APP_GEMINI_API: process.env.REACT_APP_GEMINI_API,
    REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
  };

  // Apply HTTPS enforcement logic to see what the final URLs would be
  let finalApiBase = process.env.REACT_APP_API_BASE || "/api";
  if (finalApiBase.startsWith('http://')) {
    finalApiBase = finalApiBase.replace('http://', 'https://');
  }

  let finalGeminiApi = process.env.REACT_APP_GEMINI_API || 'http://localhost:3000';
  if (finalGeminiApi.startsWith('http://')) {
    finalGeminiApi = finalGeminiApi.replace('http://', 'https://');
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#000',
      color: '#fff',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '400px',
      fontFamily: 'monospace'
    }}>
      <h4>🔍 Debug Environment Variables</h4>
      <div>
        <strong>Raw Environment Variables:</strong>
        <pre>{JSON.stringify(envVars, null, 2)}</pre>
      </div>
      <div>
        <strong>After HTTPS Enforcement:</strong>
        <pre>
          API_BASE: {finalApiBase}{'\n'}
          GEMINI_API: {finalGeminiApi}
        </pre>
      </div>
      <div>
        <strong>Current Location:</strong>
        <pre>
          Protocol: {window.location.protocol}{'\n'}
          Host: {window.location.host}
        </pre>
      </div>
    </div>
  );
};

export default DebugEnvVars;