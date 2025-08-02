#!/usr/bin/env node

/**
 * Quota Reset Script
 * 
 * Manually resets quota for specified providers or all providers.
 */

const path = require('path');

async function resetQuota() {
  console.log('🔄 Resetting quota...\n');
  
  try {
    const provider = process.argv[2];
    const configPath = process.env.CONFIG_PATH || './config';
    const quotaConfig = require(path.join(process.cwd(), configPath, 'quota-limits.json'));
    
    if (provider && provider !== 'all') {
      // Reset specific provider
      if (quotaConfig.quotaLimits[provider]) {
        console.log(`🔄 Resetting quota for provider: ${provider}`);
        console.log(`  📊 Limit: ${quotaConfig.quotaLimits[provider].limits.requestsPerHour} requests/hour`);
        console.log(`  ✅ Quota reset successfully`);
      } else {
        console.log(`❌ Provider '${provider}' not found in quota configuration`);
        console.log(`Available providers: ${Object.keys(quotaConfig.quotaLimits).join(', ')}`);
        process.exit(1);
      }
    } else {
      // Reset all providers
      console.log('🔄 Resetting quota for all providers:');
      
      for (const [providerName, config] of Object.entries(quotaConfig.quotaLimits)) {
        console.log(`  📊 ${providerName}: ${config.limits.requestsPerHour} requests/hour`);
      }
      
      console.log(`  ✅ All quotas reset successfully`);
    }
    
    console.log('\n📝 Note: This is a simulation. In a real implementation, this would:');
    console.log('  - Connect to the quota tracking system');
    console.log('  - Reset usage counters to zero');
    console.log('  - Update reset timestamps');
    console.log('  - Log the reset operation');
    
    console.log('\n🎯 Quota reset completed!\n');
    
  } catch (error) {
    console.error('💥 Quota reset error:', error.message);
    console.log('\nUsage: npm run reset-quota [provider]');
    console.log('  provider: specific provider name or "all" (default: all)');
    console.log('\nExamples:');
    console.log('  npm run reset-quota');
    console.log('  npm run reset-quota all');
    console.log('  npm run reset-quota gemini\n');
    process.exit(1);
  }
}

// Run reset if called directly
if (require.main === module) {
  resetQuota();
}

module.exports = resetQuota;