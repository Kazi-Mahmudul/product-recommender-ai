import {
  verifyEnvironmentVariables,
  verifyGoogleOAuthProvider,
  verifyCORSConfiguration,
  runProductionVerification,
} from "../utils/productionVerification";

// Mock environment variables for testing
const originalEnv = process.env;

describe("Production Verification", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("verifyEnvironmentVariables passes with valid config", () => {
    process.env.REACT_APP_GOOGLE_CLIENT_ID =
      "123456789-abcdef.apps.googleusercontent.com";
    process.env.REACT_APP_API_BASE = "https://api.example.com";

    const result = verifyEnvironmentVariables();

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("verifyEnvironmentVariables fails with missing variables", () => {
    delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
    delete process.env.REACT_APP_API_BASE;

    const result = verifyEnvironmentVariables();

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Missing required environment variable: REACT_APP_GOOGLE_CLIENT_ID"
    );
    expect(result.errors).toContain(
      "Missing required environment variable: REACT_APP_API_BASE"
    );
  });

  test("verifyEnvironmentVariables warns about localhost in production", () => {
    process.env.NODE_ENV = "production";
    process.env.REACT_APP_GOOGLE_CLIENT_ID =
      "123456789-abcdef.apps.googleusercontent.com";
    process.env.REACT_APP_API_BASE = "http://localhost:8000";

    const result = verifyEnvironmentVariables();

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain(
      "REACT_APP_API_BASE contains localhost URL in production environment"
    );
  });

  test("verifyGoogleOAuthProvider passes when package is available", () => {
    const result = verifyGoogleOAuthProvider();

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("verifyCORSConfiguration warns about cross-origin requests", () => {
    process.env.REACT_APP_API_BASE = "https://api.example.com";

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://app.example.com",
      },
      writable: true,
    });

    const result = verifyCORSConfiguration();

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Cross-origin request detected");
  });

  test("runProductionVerification combines all checks", () => {
    process.env.REACT_APP_GOOGLE_CLIENT_ID =
      "123456789-abcdef.apps.googleusercontent.com";
    process.env.REACT_APP_API_BASE = "https://api.example.com";

    const result = runProductionVerification();

    expect(result).toHaveProperty("isValid");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("warnings");
  });

  test("production configuration matches expected values", () => {
    // Test with actual environment variables from .env files
    const actualClientId =
      "188950165425-l2at9nnfpeo3n092cejskovvcd76bgi6.apps.googleusercontent.com";
    const actualApiBase = "https://product-recommender-ai-188950165425.asia-southeast1.run.app";

    process.env.REACT_APP_GOOGLE_CLIENT_ID = actualClientId;
    process.env.REACT_APP_API_BASE = actualApiBase;

    const result = verifyEnvironmentVariables();

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Verify the client ID format
    expect(actualClientId).toMatch(
      /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/
    );

    // Verify the API base is HTTPS
    expect(actualApiBase).toMatch(/^https:\/\//);
  });
});
