#!/usr/bin/env node

/**
 * Setup Script
 * 
 * Performs initial setup tasks after npm install.
 */

const fs = require('fs');
const path = require('path');

async function setup() {
  console.log('🚀 Setting up AI Quota Management Service...\n');
  
  try {
    // Create necessary directories
    const directories = [
      './data',
      './exports',
      './logs',
      './docs'
    ];
    
    console.log('📁 Creating directories...');
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ Created: ${dir}`);
      } else {
        console.log(`  ⚪ Exists: ${dir}`);
      }
    }
    
    // Create default data files
    console.log('\n📄 Creating default data files...');
    
    const quotaStateFile = process.env.QUOTA_STATE_FILE || './data/quota-state.json';
    if (!fs.existsSync(quotaStateFile)) {
      const defaultQuotaState = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        providers: {
          gemini: {
            used: 0,
            resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          openai: {
            used: 0,
            resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          claude: {
            used: 0,
            resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          }
        }
      };
      
      fs.writeFileSync(quotaStateFile, JSON.stringify(defaultQuotaState, null, 2));
      console.log(`  ✅ Created: ${quotaStateFile}`);
    } else {
      console.log(`  ⚪ Exists: ${quotaStateFile}`);
    }
    
    // Check environment file
    console.log('\n🔧 Checking environment configuration...');
    if (!fs.existsSync('.env')) {
      if (fs.existsSync('.env.example')) {
        console.log('  ⚠️  .env file not found');
        console.log('  💡 Copy .env.example to .env and configure your API keys');
        console.log('  📋 Command: cp .env.example .env');
      } else {
        console.log('  ⚠️  No environment files found');
        console.log('  💡 Create a .env file with your configuration');
      }
    } else {
      console.log('  ✅ .env file exists');
    }
    
    // Display setup completion
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Configure your .env file with API keys');
    console.log('  2. Run: npm run validate-config');
    console.log('  3. Run: npm run check-health');
    console.log('  4. Start the service: npm start');
    
    console.log('\n📚 Available commands:');
    console.log('  npm start              - Start the service');
    console.log('  npm run dev            - Start in development mode');
    console.log('  npm test               - Run tests');
    console.log('  npm run validate-config - Validate configuration');
    console.log('  npm run check-health   - Check system health');
    console.log('  npm run export-metrics - Export metrics data');
    console.log('  npm run reset-quota    - Reset provider quotas');
    
    console.log('\n🔗 Documentation:');
    console.log('  Configuration: ./config/');
    console.log('  Examples: .env.example, .env.development.example');
    console.log('  Tests: ./test/');
    
    console.log('\n✨ Happy coding!\n');
    
  } catch (error) {
    console.error('💥 Setup error:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setup();
}

module.exports = setup;