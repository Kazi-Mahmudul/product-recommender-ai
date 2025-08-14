/**
 * Production verification utilities for Google OAuth integration
 */

export interface ProductionCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifies that all required environment variables are present for production
 */
export const verifyEnvironmentVariables = (): ProductionCheckResult => {
  const result: ProductionCheckResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check required environment variables
  const requiredVars = [
    'REACT_APP_GOOGLE_CLIENT_ID',
    'REACT_APP_API_BASE'
  ];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      result.errors.push(`Missing required environment variable: ${varName}`);
      result.isValid = false;
    } else if (value.includes('localhost') && process.env.NODE_ENV === 'production') {
      result.warnings.push(`${varName} contains localhost URL in production environment`);
    }
  });

  // Check Google Client ID format
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  if (clientId && !clientId.includes('.apps.googleusercontent.com')) {
    result.warnings.push('REACT_APP_GOOGLE_CLIENT_ID does not appear to be a valid Google Client ID');
  }

  return result;
};

/**
 * Verifies that the Google OAuth provider is properly configured
 */
export const verifyGoogleOAuthProvider = (): ProductionCheckResult => {
  const result: ProductionCheckResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check if GoogleOAuthProvider is available
  try {
    const { GoogleOAuthProvider } = require('@react-oauth/google');
    if (!GoogleOAuthProvider) {
      result.errors.push('GoogleOAuthProvider is not available');
      result.isValid = false;
    }
  } catch (error) {
    result.errors.push('Failed to import @react-oauth/google package');
    result.isValid = false;
  }

  return result;
};

/**
 * Verifies CORS configuration for production
 */
export const verifyCORSConfiguration = (): ProductionCheckResult => {
  const result: ProductionCheckResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const apiBase = process.env.REACT_APP_API_BASE;
  const currentOrigin = window.location.origin;

  if (apiBase && currentOrigin) {
    // Check if API base and current origin are on different domains
    try {
      const apiUrl = new URL(apiBase);
      const currentUrl = new URL(currentOrigin);
      
      if (apiUrl.hostname !== currentUrl.hostname) {
        result.warnings.push(
          `Cross-origin request detected. Ensure CORS is configured on ${apiUrl.hostname} to allow requests from ${currentUrl.hostname}`
        );
      }
    } catch (error) {
      result.warnings.push('Unable to parse API base URL or current origin');
    }
  }

  return result;
};

/**
 * Runs all production verification checks
 */
export const runProductionVerification = (): ProductionCheckResult => {
  const envCheck = verifyEnvironmentVariables();
  const oauthCheck = verifyGoogleOAuthProvider();
  const corsCheck = verifyCORSConfiguration();

  return {
    isValid: envCheck.isValid && oauthCheck.isValid && corsCheck.isValid,
    errors: [...envCheck.errors, ...oauthCheck.errors, ...corsCheck.errors],
    warnings: [...envCheck.warnings, ...oauthCheck.warnings, ...corsCheck.warnings]
  };
};

/**
 * Logs production verification results to console
 */
export const logProductionVerification = (): void => {
  const result = runProductionVerification();
  
  console.log('🔍 Google OAuth Production Verification');
  console.log('=====================================');
  
  if (result.isValid) {
    console.log('✅ All critical checks passed');
  } else {
    console.log('❌ Critical issues found');
  }
  
  if (result.errors.length > 0) {
    console.log('\n🚨 Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  console.log('\n📋 Environment Variables:');
  console.log(`  REACT_APP_GOOGLE_CLIENT_ID: ${process.env.REACT_APP_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`  REACT_APP_API_BASE: ${process.env.REACT_APP_API_BASE || '❌ Missing'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
};