/**
 * OAuth debugging utilities to help identify client ID issues
 */

export const debugGoogleOAuth = () => {
  console.log('🔍 Google OAuth Debug Information');
  console.log('================================');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`REACT_APP_GOOGLE_CLIENT_ID: ${process.env.REACT_APP_GOOGLE_CLIENT_ID}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  
  // Check if Google OAuth is loaded
  console.log('\n🌐 Google OAuth Status:');
  if ((window as any).google) {
    console.log('✅ Google OAuth library is loaded');
    console.log('Google object:', (window as any).google);
  } else {
    console.log('❌ Google OAuth library is not loaded');
  }
  
  // Check current domain
  console.log('\n🏠 Current Domain:');
  console.log(`Origin: ${window.location.origin}`);
  console.log(`Hostname: ${window.location.hostname}`);
  console.log(`Protocol: ${window.location.protocol}`);
  
  // Check localStorage for any cached OAuth data
  console.log('\n💾 Local Storage OAuth Data:');
  const authToken = localStorage.getItem('auth_token');
  console.log(`Auth Token: ${authToken ? 'Present' : 'Not found'}`);
  
  // Check for any Google-related cookies
  console.log('\n🍪 Google-related Cookies:');
  const cookies = document.cookie.split(';');
  const googleCookies = cookies.filter(cookie => 
    cookie.toLowerCase().includes('google') || 
    cookie.toLowerCase().includes('oauth') ||
    cookie.toLowerCase().includes('gsi')
  );
  
  if (googleCookies.length > 0) {
    googleCookies.forEach(cookie => console.log(`  ${cookie.trim()}`));
  } else {
    console.log('  No Google-related cookies found');
  }
  
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('1. Clear browser cache and cookies');
  console.log('2. Sign out of all Google accounts');
  console.log('3. Try in incognito/private mode');
  console.log('4. Verify the new client ID is active in Google Console');
  console.log('5. Check if the domain is authorized in Google Console');
};

export const clearOAuthCache = () => {
  console.log('🧹 Clearing OAuth cache...');
  
  // Clear localStorage
  localStorage.removeItem('auth_token');
  
  // Clear any Google-related sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.toLowerCase().includes('google') || key.toLowerCase().includes('oauth')) {
      sessionStorage.removeItem(key);
      console.log(`Removed sessionStorage: ${key}`);
    }
  });
  
  // Clear any Google-related localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.toLowerCase().includes('google') || key.toLowerCase().includes('oauth')) {
      localStorage.removeItem(key);
      console.log(`Removed localStorage: ${key}`);
    }
  });
  
  console.log('✅ OAuth cache cleared');
  console.log('Please refresh the page and try again');
};

// Add to window for easy access in browser console (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugGoogleOAuth = debugGoogleOAuth;
  (window as any).clearOAuthCache = clearOAuthCache;
}