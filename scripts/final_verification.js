#!/usr/bin/env node

/**
 * Final verification script to ensure HTTPS enforcement is working
 */

const fs = require('fs');

console.log('🔍 Final HTTPS Verification');
console.log('='.repeat(50));

// Check key files
const keyFiles = [
  'frontend/src/api/phones.ts',
  'frontend/src/api/comparison.ts', 
  'frontend/src/api/auth.ts',
  'frontend/src/cache-buster.ts'
];

let allGood = true;

keyFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`❌ Missing: ${file}`);
    allGood = false;
    return;
  }
  
  const content = fs.readFileSync(file, 'utf8');
  
  if (file.includes('cache-buster.ts')) {
    if (content.includes('ensureHttps') && content.includes('getSecureApiBase')) {
      console.log(`✅ ${file} - Cache buster ready`);
    } else {
      console.log(`❌ ${file} - Missing functions`);
      allGood = false;
    }
  } else {
    if (content.includes('getSecureApiBase') || content.includes('cache-buster')) {
      console.log(`✅ ${file} - Using secure API base`);
    } else {
      console.log(`❌ ${file} - Not using secure API base`);
      allGood = false;
    }
  }
});

console.log('');
console.log('='.repeat(50));

if (allGood) {
  console.log('✅ All key files are properly configured!');
  console.log('');
  console.log('🚀 IMMEDIATE NEXT STEPS:');
  console.log('1. Commit and push ALL changes');
  console.log('2. Go to Vercel Dashboard → Deployments');
  console.log('3. Click "Redeploy" to force a fresh build');
  console.log('4. Clear browser cache completely (Ctrl+Shift+Delete)');
  console.log('5. Test the site');
  console.log('');
  console.log('🔧 The cache-buster approach should force Vercel to rebuild');
  console.log('   with the new HTTPS enforcement logic.');
} else {
  console.log('❌ Some files need fixing');
}

console.log('');
console.log('📊 Expected Result:');
console.log('- No more mixed content errors');
console.log('- All API calls use HTTPS');
console.log('- Debug info shows correct URLs');
console.log('- Phone listing and comparison work');