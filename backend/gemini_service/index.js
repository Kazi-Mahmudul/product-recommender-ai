const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Generative AI model
let genAI;
let model;

// Import AI quota management components
const ConfigurationManager = require("./managers/ConfigurationManager");
const QuotaTracker = require("./managers/QuotaTracker");
const HealthMonitor = require("./managers/HealthMonitor");
const AIServiceManager = require("./managers/AIServiceManager");

// Load environment variables from multiple possible locations
const envPaths = [
  path.resolve(__dirname, "../../.env"),  // Root directory
  path.resolve(__dirname, ".env"),        // Current directory
  path.resolve(__dirname, "../.env"),     // Parent directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  } catch (error) {
    console.log(`⚠️ Could not load from: ${envPath}`);
  }
}

if (!envLoaded) {
  console.log("ℹ️ No .env file found, using environment variables from deployment platform");
}

const app = express();
app.use(cors());
app.use(express.json());

// Initialize AI quota management system
let aiServiceManager;
let configManager;
let quotaTracker;
let healthMonitor;

try {
  // Initialize configuration manager
  configManager = new ConfigurationManager();
  
  // Replace environment variable placeholders with actual values
  const config = configManager.config;
  for (const provider of config.providers) {
    if (provider.apiKey && provider.apiKey.startsWith('GOOGLE_API_KEY')) {
      provider.apiKey = process.env.GOOGLE_API_KEY;
      
      // Initialize Google Generative AI with the API key
      if (provider.name === 'gemini' && provider.enabled) {
        console.log(`[${new Date().toISOString()}] 🔧 Initializing Google Generative AI with API key: ${provider.apiKey.substring(0, 5)}...`);
        console.log(`[${new Date().toISOString()}] 🔧 Using model: ${provider.model || "gemini-pro"}`);
        try {
          genAI = new GoogleGenerativeAI(provider.apiKey);
          model = genAI.getGenerativeModel({ model: provider.model || "gemini-pro" });
          console.log(`[${new Date().toISOString()}] ✅ Successfully initialized Google Generative AI model`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Failed to initialize Google Generative AI model:`, error.message);
        }
      }
    } else if (provider.apiKey && provider.apiKey.startsWith('OPENAI_API_KEY')) {
      provider.apiKey = process.env.OPENAI_API_KEY;
    }
  }
  
  // Check if at least one provider has a valid API key
  const validProviders = config.providers.filter(p => p.enabled && p.apiKey && p.apiKey.trim() !== '');
  if (validProviders.length === 0) {
    console.error("❌ No valid API keys found for enabled providers.");
    console.error("Please set GOOGLE_API_KEY or OPENAI_API_KEY in your environment variables.");
    process.exit(1);
  }
  
  // Initialize quota tracker
  quotaTracker = new QuotaTracker(configManager);
  
  // Initialize health monitor
  healthMonitor = new HealthMonitor(config.providers, configManager);
  
  // Initialize AI service manager
  aiServiceManager = new AIServiceManager(configManager, quotaTracker, healthMonitor);
  
  // Start periodic health checks
  healthMonitor.startPeriodicHealthChecks(config.monitoring?.healthCheckInterval || 30000);
  
  console.log(`[${new Date().toISOString()}] 🎯 AI quota management system initialized with ${validProviders.length} provider(s)`);
  
} catch (error) {
  console.error("❌ Failed to initialize AI quota management system:", error.message);
  process.exit(1);
}

// Health check endpoints
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Phone query parser service is running" });
});

app.get("/parse-query", (req, res) => {
  res.json({ status: "ok", message: "Phone query parser service is running" });
});

// Util: Clean JSON formatting from Gemini output
function cleanJsonResponse(text) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  try {
    JSON.parse(cleaned); // Check if it’s valid
    return cleaned;
  } catch {
    return text;
  }
}

// Main query parser using AI Service Manager
async function parseQuery(query) {
  try {
    console.log(`[${new Date().toISOString()}] 🔹 Processing query with AI Service Manager: "${query}"`);
    
    // Use AIServiceManager to handle the query with fallback support
    const result = await aiServiceManager.parseQuery(query);
    
    console.log(`[${new Date().toISOString()}] ✅ Successfully processed query with source: ${result.source}`);
    return result;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error processing query:`, error.message);
    
    // Return a fallback response for any unexpected errors
    return {
      type: "chat",
      data: "Sorry, I'm having trouble processing your request right now. Please try again in a moment.",
      source: "error_fallback",
      error: error.message
    };
  }
}

// POST endpoint to generate AI summary
app.post("/", async (req, res) => {
  const { prompt } = req.body;
  const requestId = Math.random().toString(36).substring(7);

  console.log(`[${new Date().toISOString()}] 🟡 [${requestId}] Incoming summary request`);
  console.log(`[${new Date().toISOString()}] 🔹 [${requestId}] Request body keys: ${Object.keys(req.body)}`);
  console.log(`[${new Date().toISOString()}] 🔹 [${requestId}] Prompt length: ${prompt ? prompt.length : 0} characters`);

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    console.warn(`[${new Date().toISOString()}] ⚠️ [${requestId}] Invalid prompt provided`);
    return res.status(400).json({ 
      error: "A valid prompt string is required.",
      requestId: requestId
    });
  }

  try {
    console.log(`[${new Date().toISOString()}] 🔹 [${requestId}] Sending to Gemini AI...`);
    console.log(`[${new Date().toISOString()}] 🔹 [${requestId}] Prompt preview: "${prompt.substring(0, 200)}..."`);
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();
    const duration = Date.now() - startTime;

    console.log(`[${new Date().toISOString()}] ✅ [${requestId}] Generated summary in ${duration}ms`);
    console.log(`[${new Date().toISOString()}] 🔹 [${requestId}] Summary length: ${summary.length} characters`);
    console.log(`[${new Date().toISOString()}] 🔹 [${requestId}] Summary preview: "${summary.substring(0, 150)}..."`);
    
    res.json({ 
      summary, 
      result: summary,
      requestId: requestId,
      processingTime: duration
    });
  } catch (error) {
    const duration = Date.now() - (req.startTime || Date.now());
    console.error(`[${new Date().toISOString()}] ❌ [${requestId}] Failed to generate summary after ${duration}ms`);
    console.error(`[${new Date().toISOString()}] ❌ [${requestId}] Error type: ${error.name}`);
    console.error(`[${new Date().toISOString()}] ❌ [${requestId}] Error message: ${error.message}`);
    
    // Provide more specific error responses based on error type
    if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
      console.error(`[${new Date().toISOString()}] ❌ [${requestId}] Authentication error with Gemini API`);
      res.status(503).json({ 
        error: "AI service authentication failed. Please contact support.",
        requestId: requestId,
        type: "authentication_error"
      });
    } else if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('rate')) {
      console.error(`[${new Date().toISOString()}] ❌ [${requestId}] Rate limit or quota exceeded`);
      res.status(429).json({ 
        error: "AI service is experiencing high usage. Please try again in a moment.",
        requestId: requestId,
        type: "rate_limit_error"
      });
    } else if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      console.error(`[${new Date().toISOString()}] ❌ [${requestId}] Request timeout`);
      res.status(504).json({ 
        error: "AI service request timed out. Please try again.",
        requestId: requestId,
        type: "timeout_error"
      });
    } else {
      console.error(`[${new Date().toISOString()}] ❌ [${requestId}] Unexpected error:`, error.stack);
      res.status(500).json({ 
        error: "Internal server error occurred while generating summary",
        requestId: requestId,
        type: "internal_error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

app.post("/parse-query", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim() === "") {
    return res.status(400).json({ error: "A valid query string is required." });
  }

  try {
    console.log(`[${new Date().toISOString()}] 🟡 Incoming query: "${query}"`);
    const result = await parseQuery(query);
    console.log(`[${new Date().toISOString()}] ✅ Parsed result:`, result);
    res.json(result);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Failed to process query:`,
      error
    );
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('\n🔄 Gracefully shutting down...');
  
  if (healthMonitor) {
    healthMonitor.cleanup();
  }
  
  if (quotaTracker) {
    quotaTracker.cleanup();
  }
  
  console.log('✅ Cleanup completed');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
  
  if (healthMonitor) {
    healthMonitor.cleanup();
  }
  
  if (quotaTracker) {
    quotaTracker.cleanup();
  }
  
  console.log('✅ Cleanup completed');
  process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 ePick Gemini AI API running on http://localhost:${PORT}`);
  console.log(`🎯 AI quota management system active with fallback support`);
});
