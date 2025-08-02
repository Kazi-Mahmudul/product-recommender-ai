#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * Performs health checks on all AI providers and system components.
 */

const path = require('path');

async function performHealthCheck() {
  console.log('🏥 Performing health check...\n');
  
  try {
    // Load configuration
    const configPath = process.env.CONFIG_PATH || './config';
    const providersConfig = require(path.join(process.cwd(), configPath, 'ai-providers.json'));
    
    console.log('📋 Health Check Report');
    console.log('='.repeat(50));
    
    // Check environment variables
    console.log('\n🔧 Environment Variables:');
    const requiredEnvVars = ['GOOGLE_API_KEY'];
    let envHealthy = true;
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        console.log(`  ✅ ${envVar}: Set (${value.substring(0, 10)}...)`);
      } else {
        console.log(`  ❌ ${envVar}: Not set`);
        envHealthy = false;
      }
    }
    
    // Check configuration files
    console.log('\n📁 Configuration Files:');
    const configFiles = ['ai-providers.json', 'quota-limits.json', 'environment.json'];
    let configHealthy = true;
    
    for (const file of configFiles) {
      try {
        const filePath = path.join(process.cwd(), configPath, file);
        require(filePath);
        console.log(`  ✅ ${file}: Valid`);
      } catch (error) {
        console.log(`  ❌ ${file}: ${error.message}`);
        configHealthy = false;
      }
    }
    
    // Check providers
    console.log('\n🤖 AI Providers:');
    let providersHealthy = true;
    
    for (const [name, provider] of Object.entries(providersConfig.providers || {})) {
      if (provider.enabled) {
        const apiKey = process.env[provider.apiKeyEnv];
        if (apiKey) {
          console.log(`  ✅ ${name}: Enabled with API key`);
        } else {
          console.log(`  ❌ ${name}: Enabled but missing API key (${provider.apiKeyEnv})`);
          providersHealthy = false;
        }
      } else {
        console.log(`  ⚪ ${name}: Disabled`);
      }
    }
    
    // Check system resources
    console.log('\n💻 System Resources:');
    const memUsage = process.memoryUsage();
    console.log(`  📊 Memory Usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`  📊 Node.js Version: ${process.version}`);
    console.log(`  📊 Platform: ${process.platform}`);
    
    // Overall health
    console.log('\n🎯 Overall Health:');
    const overallHealthy = envHealthy && configHealthy && providersHealthy;
    
    if (overallHealthy) {
      console.log('  ✅ System is healthy and ready to start');
      console.log('\n🚀 Ready to launch!\n');
      process.exit(0);
    } else {
      console.log('  ❌ System has health issues that need attention');
      console.log('\n🔧 Please fix the issues above before starting the service.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Health check error:', error.message);
    process.exit(1);
  }
}

// Run health check if called directly
if (require.main === module) {
  performHealthCheck();
}

module.exports = performHealthCheck;