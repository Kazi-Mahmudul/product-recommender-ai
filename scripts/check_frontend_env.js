// Script to check if frontend environment variables are correct
// Run this in the browser console on your deployed frontend

console.log('🔍 Frontend Environment Variables Check');
console.log('=====================================');

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  console.log('Environment:', process.env.NODE_ENV || 'unknown');
  
  // Check API base URL
  const apiBase = process.env.REACT_APP_API_BASE;
  console.log('REACT_APP_API_BASE:', apiBase);
  
  if (!apiBase) {
    console.error('❌ REACT_APP_API_BASE is not set!');
  } else if (apiBase.startsWith('http://')) {
    console.warn('⚠️  REACT_APP_API_BASE uses HTTP instead of HTTPS:', apiBase);
  } else if (apiBase.startsWith('https://')) {
    console.log('✅ REACT_APP_API_BASE uses HTTPS correctly');
  } else {
    console.warn('⚠️  REACT_APP_API_BASE has unexpected format:', apiBase);
  }
  
  // Check other environment variables
  const geminiApi = process.env.REACT_APP_GEMINI_API;
  console.log('REACT_APP_GEMINI_API:', geminiApi);
  
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  console.log('REACT_APP_GOOGLE_CLIENT_ID:', googleClientId ? 'Set' : 'Not set');
  
  // Test API URL construction
  let computedApiBase = apiBase || "/api";
  if (computedApiBase.startsWith('http://')) {
    computedApiBase = computedApiBase.replace('http://', 'https://');
    console.log('🔧 Computed API_BASE (after HTTP->HTTPS conversion):', computedApiBase);
  } else {
    console.log('🔧 Computed API_BASE (no conversion needed):', computedApiBase);
  }
  
  // Test a sample API URL
  const sampleApiUrl = `${computedApiBase}/api/v1/phones`;
  console.log('📝 Sample API URL:', sampleApiUrl);
  
  if (sampleApiUrl.startsWith('https://')) {
    console.log('✅ Sample API URL uses HTTPS correctly');
  } else {
    console.error('❌ Sample API URL does not use HTTPS:', sampleApiUrl);
  }
  
} else {
  console.log('This script should be run in a browser environment');
}

console.log('=====================================');
console.log('💡 If you see HTTP URLs above, you need to:');
console.log('1. Update environment variables in Vercel dashboard');
console.log('2. Redeploy the frontend');
console.log('3. Clear browser cache and refresh');