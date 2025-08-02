#!/usr/bin/env node

/**
 * Configuration Validation Script
 * 
 * Validates all configuration files and environment variables
 * before starting the service.
 */

const ConfigValidator = require('../utils/ConfigValidator');
const path = require('path');

async function validateConfiguration() {
  console.log('🔍 Validating configuration...\n');
  
  try {
    const configPath = process.env.CONFIG_PATH || './config';
    const validator = new ConfigValidator(configPath);
    
    const results = await validator.validateAll();
    
    // Print validation report
    console.log(validator.getValidationReport());
    
    if (results.isValid) {
      console.log('✅ Configuration validation passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Configuration validation failed!\n');
      console.log('Please fix the errors above before starting the service.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Configuration validation error:', error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateConfiguration();
}

module.exports = validateConfiguration;