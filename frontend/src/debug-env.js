// Debug script to check environment variables
console.log('Environment Variables Debug:');
console.log('REACT_APP_API_BASE:', process.env.REACT_APP_API_BASE);
console.log('REACT_APP_GEMINI_API:', process.env.REACT_APP_GEMINI_API);
console.log('REACT_APP_GOOGLE_CLIENT_ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Check if API_BASE is being constructed correctly
let API_BASE = process.env.REACT_APP_API_BASE || "/api";
if (API_BASE.startsWith('http://')) {
  API_BASE = API_BASE.replace('http://', 'https://');
}
console.log('Computed API_BASE:', API_BASE);

export default function debugEnv() {
  return {
    REACT_APP_API_BASE: process.env.REACT_APP_API_BASE,
    computed_API_BASE: API_BASE,
    NODE_ENV: process.env.NODE_ENV
  };
}