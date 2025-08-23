#!/usr/bin/env node

/**
 * Force Vercel rebuild by updating a timestamp file
 */

const fs = require('fs');
const path = require('path');

const timestampFile = path.join('frontend', 'src', 'build-timestamp.ts');

const timestamp = new Date().toISOString();
const content = `// Build timestamp: ${timestamp}
// This file is automatically updated to force Vercel rebuilds
export const BUILD_TIMESTAMP = '${timestamp}';
`;

fs.writeFileSync(timestampFile, content);

console.log('🔄 Force rebuild timestamp updated');
console.log(`📅 New timestamp: ${timestamp}`);
console.log('');
console.log('🚀 Next steps:');
console.log('1. Commit and push this change');
console.log('2. Vercel will automatically redeploy');
console.log('3. Check the debug info in the top-right corner of your site');
console.log('4. Verify that environment variables are loaded correctly');
console.log('');
console.log('🔧 If environment variables are still not loaded:');
console.log('1. Go to Vercel Dashboard → Project → Settings → Environment Variables');
console.log('2. Make sure these are set for Production:');
console.log('   REACT_APP_API_BASE=https://product-recommender-ai-188950165425.asia-southeast1.run.app');
console.log('   REACT_APP_GEMINI_API=https://gemini-api-wm3b.onrender.com');
console.log('   REACT_APP_GOOGLE_CLIENT_ID=188950165425-l2at9nnfpeo3n092cejskovvcd76bgi6.apps.googleusercontent.com');
console.log('   REACT_APP_SHOW_DEBUG=true (to enable debug info)');
console.log('3. Redeploy manually from Vercel dashboard');