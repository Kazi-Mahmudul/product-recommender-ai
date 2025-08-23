/**
 * Aggressive HTTPS enforcement utility
 * This ensures ALL API calls use HTTPS regardless of environment variables
 */

export function forceHttpsUrl(url: string): string {
  if (!url) return url;

  // If it's a relative URL, return as-is
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
    return url;
  }

  // If it's already HTTPS, return as-is
  if (url.startsWith("https://")) {
    return url;
  }

  // If it's HTTP, convert to HTTPS
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }

  // If it doesn't have a protocol, assume HTTPS
  if (
    url.includes("product-recommender-ai") ||
    url.includes("gemini-api") ||
    url.includes(".run.app") ||
    url.includes(".onrender.com")
  ) {
    return `https://${url}`;
  }

  return url;
}

export function getApiBase(): string {
  let apiBase = process.env.REACT_APP_API_BASE || "/api";

  // Force HTTPS in production
  if (process.env.NODE_ENV === "production") {
    apiBase = forceHttpsUrl(apiBase);
  }

  // Additional safety check for known domains
  if (
    apiBase.includes("product-recommender-ai") &&
    !apiBase.startsWith("https://")
  ) {
    apiBase =
      "https://product-recommender-ai-188950165425.asia-southeast1.run.app";
  }

  return apiBase;
}

export function getGeminiApiBase(): string {
  let geminiApi = process.env.REACT_APP_GEMINI_API || "http://localhost:3000";

  // Force HTTPS in production
  if (process.env.NODE_ENV === "production") {
    geminiApi = forceHttpsUrl(geminiApi);
  }

  // Additional safety check for known domains
  if (geminiApi.includes("gemini-api") && !geminiApi.startsWith("https://")) {
    geminiApi = "https://gemini-api-wm3b.onrender.com";
  }

  return geminiApi;
}
