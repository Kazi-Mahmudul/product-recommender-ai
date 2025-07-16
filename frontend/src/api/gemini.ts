// Gemini AI API utility
// Uses REACT_APP_GEMINI_API from .env

const GEMINI_API = process.env.REACT_APP_GEMINI_API;

export async function fetchGeminiSummary(prompt: string): Promise<string> {
  if (!GEMINI_API) {
    console.error("Gemini API URL not configured");
    throw new Error("AI service configuration missing");
  }

  if (!prompt || prompt.trim() === "") {
    console.error("Empty prompt provided to fetchGeminiSummary");
    throw new Error("Invalid prompt provided");
  }

  console.log(`[Gemini API] Sending request to: ${GEMINI_API}`);
  console.log(`[Gemini API] Prompt length: ${prompt.length} characters`);

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const res = await fetch(GEMINI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[Gemini API] Response status: ${res.status}`);

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If we can't parse the error response, use the status text
      }
      console.error(`[Gemini API] Error response: ${errorMessage}`);
      
      if (res.status === 400) {
        throw new Error("Invalid request to AI service");
      } else if (res.status === 401 || res.status === 403) {
        throw new Error("AI service authentication failed");
      } else if (res.status === 429) {
        throw new Error("AI service rate limit exceeded. Please try again later.");
      } else if (res.status >= 500) {
        throw new Error("AI service is temporarily unavailable");
      } else {
        throw new Error(`AI service error: ${errorMessage}`);
      }
    }

    const data = await res.json();
    const summary = data.summary || data.result || "";
    
    if (!summary) {
      console.warn("[Gemini API] Empty response received");
      throw new Error("AI service returned empty response");
    }

    console.log(`[Gemini API] Success - Summary length: ${summary.length} characters`);
    return summary;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("[Gemini API] Request timeout");
      throw new Error("AI service request timed out. Please try again.");
    }
    
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      console.error("[Gemini API] Network error:", error);
      throw new Error("Unable to connect to AI service. Please check your internet connection.");
    }

    // Re-throw our custom errors
    if (error.message.includes("AI service") || error.message.includes("Invalid") || error.message.includes("authentication")) {
      throw error;
    }

    // Log unexpected errors
    console.error("[Gemini API] Unexpected error:", error);
    throw new Error("An unexpected error occurred while generating the summary");
  }
}

// Helper for Pros/Cons
export async function fetchGeminiProsCons(phoneSpecs: any): Promise<{ pros: string[]; cons: string[] }> {
  const prompt = `Given these phone specs: ${JSON.stringify(phoneSpecs)}, list 3-5 pros and 2-4 cons as arrays.`;
  const text = await fetchGeminiSummary(prompt);
  // Expecting output like: { pros: [...], cons: [...] }
  try {
    const obj = JSON.parse(text);
    return { pros: obj.pros || [], cons: obj.cons || [] };
  } catch {
    // fallback: try to split lines
    // Fallback: compatible regex (no /s flag)
    const prosMatch = text.match(/Pros:([\s\S]*?)(Cons:|$)/);
    const pros = prosMatch?.[1]?.split(/\n|,/).map(s => s.trim()).filter(Boolean) || [];
    const consMatch = text.match(/Cons:([\s\S]*)/);
    const cons = consMatch?.[1]?.split(/\n|,/).map(s => s.trim()).filter(Boolean) || [];
    return { pros, cons };
  }
}

// Helper for Similar Phones
export async function fetchGeminiSimilarPhones(phoneSpecs: any): Promise<string[]> {
  const prompt = `Given these phone specs: ${JSON.stringify(phoneSpecs)}, suggest 3-5 similar phones by name only as a JSON array.`;
  const text = await fetchGeminiSummary(prompt);
  try {
    return JSON.parse(text);
  } catch {
    return text.split(/\n|,/).map(s => s.trim()).filter(Boolean);
  }
}
