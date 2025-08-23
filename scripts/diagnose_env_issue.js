#!/usr/bin/env node

/**
 * Diagnostic script to identify why HTTPS enforcement isn't working
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing Environment Variable Issues');
console.log('='.repeat(60));

// Check all files that use REACT_APP_API_BASE
const filesToCheck = [
  'frontend/src/api/phones.ts',
  'frontend/src/api/auth.ts',
  'frontend/src/api/comparison.ts',
  'frontend/src/api/recommendations.ts',
  'frontend/src/api/contextual.ts',
  'frontend/src/api/search.ts',
  'frontend/src/pages/ChatPage.tsx',
  'frontend/src/components/TrendingPhones.tsx',
  'frontend/src/components/UpcomingPhones.tsx',
  'frontend/src/pages/SignupPage.tsx',
  'frontend/src/pages/LoginPage.tsx',
  'frontend/src/context/AuthContext.tsx',
  'frontend/src/utils/oauthErrorHandler.ts'
];

console.log('📋 Checking HTTPS enforcement in all files:');
console.log('');

let issuesFound = 0;

filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    issuesFound++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file uses REACT_APP_API_BASE
  const usesApiBase = content.includes('REACT_APP_API_BASE');
  
  if (usesApiBase) {
    // Check if it has HTTPS enforcement
    const hasHttpsEnforcement = content.includes("replace('http://', 'https://')");
    
    if (hasHttpsEnforcement) {
      console.log(`✅ ${filePath}`);
    } else {
      console.log(`❌ ${filePath} - Missing HTTPS enforcement`);
      issuesFound++;
      
      // Show the problematic lines
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('REACT_APP_API_BASE')) {
          console.log(`   Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  } else {
    console.log(`ℹ️  ${filePath} - Does not use API_BASE`);
  }
});

console.log('');
console.log('='.repeat(60));

if (issuesFound === 0) {
  console.log('✅ All files have proper HTTPS enforcement');
  console.log('');
  console.log('🔍 The issue might be:');
  console.log('1. Vercel environment variables not set correctly');
  console.log('2. Build cache issue on Vercel');
  console.log('3. Environment variables not being loaded at runtime');
  console.log('');
  console.log('🛠️  Recommended fixes:');
  console.log('1. Check Vercel dashboard environment variables');
  console.log('2. Force a clean build by changing a file and redeploying');
  console.log('3. Add debug logging to see what environment variables are loaded');
  console.log('4. Check if there are any .env files overriding the variables');
} else {
  console.log(`❌ Found ${issuesFound} files with missing HTTPS enforcement`);
}

console.log('');
console.log('🔧 Expected Vercel Environment Variables:');
console.log('REACT_APP_API_BASE=https://product-recommender-ai-188950165425.asia-southeast1.run.app');
console.log('REACT_APP_GEMINI_API=https://gemini-api-wm3b.onrender.com');
console.log('REACT_APP_GOOGLE_CLIENT_ID=188950165425-l2at9nnfpeo3n092cejskovvcd76bgi6.apps.googleusercontent.com');
console.log('');
console.log('⚠️  Make sure these are set in Vercel Dashboard → Project → Settings → Environment Variables');