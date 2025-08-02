/**
 * Jest Test Setup
 * 
 * Global setup for all tests.
 */

const TestConfigSetup = require('./test-config');

// Set test environment
process.env.NODE_ENV = 'test';

// Setup test configuration
const testConfigSetup = new TestConfigSetup();

// Setup test configuration before tests run
beforeAll(() => {
  testConfigSetup.setupTestConfig();
});

// Make test utilities available globally
global.testUtils = {
  testConfig: testConfigSetup,
  getMockConfig: () => testConfigSetup.getMockConfig(),
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  generateRandomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  }
};

// Mock console methods globally to reduce test noise
const originalConsole = { ...console };

beforeEach(() => {
  // Restore console for each test
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(10000);

// Mock timers for tests that use setTimeout/setInterval
beforeEach(() => {
  jest.clearAllTimers();
});

afterEach(() => {
  jest.clearAllTimers();
});

// Clean up any global state
afterEach(() => {
  // Clear any environment variables set during tests
  delete process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.LOG_LEVEL;
  delete process.env.ENABLE_METRICS;
  delete process.env.ENABLE_QUOTA_TRACKING;
  delete process.env.ENABLE_HEALTH_MONITORING;
  delete process.env.FALLBACK_MODE;
  delete process.env.CONFIG_PATH;
  delete process.env.QUOTA_STATE_FILE;
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress specific warnings in tests
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (
    name === 'warning' &&
    typeof data === 'object' &&
    data.name === 'ExperimentalWarning'
  ) {
    return false;
  }
  return originalEmit.apply(process, arguments);
};