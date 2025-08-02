#!/usr/bin/env node

/**
 * Integration Test Runner
 * 
 * Runs all integration tests with proper setup and reporting.
 */

const { execSync } = require('child_process');
const path = require('path');

async function runIntegrationTests() {
  console.log('🧪 Starting Integration Test Suite\n');
  console.log('=' .repeat(60));
  
  const testSuites = [
    {
      name: 'End-to-End Integration Tests',
      file: 'end-to-end.test.js',
      description: 'Complete system flow testing'
    },
    {
      name: 'Load Tests',
      file: 'load-test.test.js',
      description: 'Quota enforcement under load'
    },
    {
      name: 'Provider Failover Tests',
      file: 'provider-failover.test.js',
      description: 'Provider failure and recovery scenarios'
    },
    {
      name: 'Fallback Performance Tests',
      file: 'fallback-performance.test.js',
      description: 'Local parser performance characteristics'
    }
  ];

  const results = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTime = 0;

  for (const suite of testSuites) {
    console.log(`\n📋 Running: ${suite.name}`);
    console.log(`📝 Description: ${suite.description}`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    
    try {
      const testPath = path.join(__dirname, suite.file);
      const output = execSync(
        `npx jest "${testPath}" --verbose --detectOpenHandles --forceExit`,
        { 
          encoding: 'utf8',
          cwd: path.join(__dirname, '../..'),
          stdio: 'pipe'
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Parse Jest output for test counts
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      const passed = testMatch ? parseInt(testMatch[1]) : 0;
      const total = testMatch ? parseInt(testMatch[2]) : 0;
      const failed = total - passed;
      
      results.push({
        name: suite.name,
        status: 'PASSED',
        duration,
        passed,
        failed,
        total,
        output
      });
      
      totalTests += total;
      totalPassed += passed;
      totalFailed += failed;
      totalTime += duration;
      
      console.log(`✅ ${suite.name}: ${passed}/${total} tests passed (${duration}ms)`);
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Try to parse failed test output
      const output = error.stdout || error.message;
      const testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      const failed = testMatch ? parseInt(testMatch[1]) : 1;
      const passed = testMatch ? parseInt(testMatch[2]) : 0;
      const total = testMatch ? parseInt(testMatch[3]) : 1;
      
      results.push({
        name: suite.name,
        status: 'FAILED',
        duration,
        passed,
        failed,
        total,
        output,
        error: error.message
      });
      
      totalTests += total;
      totalPassed += passed;
      totalFailed += failed;
      totalTime += duration;
      
      console.log(`❌ ${suite.name}: ${failed} tests failed, ${passed} passed (${duration}ms)`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.passed}/${result.total} (${result.duration}ms)`);
  });
  
  console.log('\n📈 OVERALL STATISTICS:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0}%`);
  console.log(`Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  
  // Performance insights
  console.log('\n⚡ PERFORMANCE INSIGHTS:');
  const avgTimePerTest = totalTests > 0 ? totalTime / totalTests : 0;
  console.log(`Average time per test: ${avgTimePerTest.toFixed(2)}ms`);
  
  const slowestSuite = results.reduce((prev, current) => 
    (prev.duration > current.duration) ? prev : current
  );
  console.log(`Slowest test suite: ${slowestSuite.name} (${slowestSuite.duration}ms)`);
  
  const fastestSuite = results.reduce((prev, current) => 
    (prev.duration < current.duration) ? prev : current
  );
  console.log(`Fastest test suite: ${fastestSuite.name} (${fastestSuite.duration}ms)`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (totalFailed > 0) {
    console.log('❗ Some tests failed. Check the detailed output above for specific issues.');
  }
  
  if (avgTimePerTest > 1000) {
    console.log('⚠️  Average test time is high. Consider optimizing slow tests.');
  }
  
  if (totalTime > 60000) {
    console.log('⚠️  Total test time exceeds 1 minute. Consider parallel execution.');
  }
  
  if (totalFailed === 0) {
    console.log('🎉 All integration tests passed! System is ready for deployment.');
  }
  
  console.log('\n🔗 NEXT STEPS:');
  if (totalFailed === 0) {
    console.log('✅ Integration tests complete - proceed with deployment');
    console.log('📊 Run monitoring setup: npm run setup-monitoring');
    console.log('🚀 Start the service: npm start');
  } else {
    console.log('🔧 Fix failing tests before deployment');
    console.log('📝 Review test output for specific error details');
    console.log('🔄 Re-run tests: npm run test:integration');
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('💥 Integration test runner error:', error.message);
    process.exit(1);
  });
}

module.exports = runIntegrationTests;