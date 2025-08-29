const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// Check if GOOGLE_API_KEY is available with enhanced validation
if (!process.env.GOOGLE_API_KEY) {
  console.error("❌ GOOGLE_API_KEY is missing. Please set it in your Cloud Run environment variables.");
  console.error("This can be done in Google Cloud Console under Cloud Run service configuration.");
  console.error("Environment Variables section: GOOGLE_API_KEY=your_api_key");
  process.exit(1);
}

// Validate API key format
const apiKey = process.env.GOOGLE_API_KEY;
if (apiKey.length < 20 || !apiKey.startsWith('AIza')) {
  console.error("❌ GOOGLE_API_KEY appears to be invalid. Please check the API key format.");
  console.error("Expected format: AIzaSy... (should start with 'AIza' and be at least 20 characters)");
  process.exit(1);
}

console.log(`✅ Google API Key validated: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`🔹 API Key length: ${apiKey.length} characters`);

// Initialize Google Generative AI with enhanced configuration
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Use the paid tier model as configured
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH", 
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
});

console.log(`[${new Date().toISOString()}] 🔹 Initialized Gemini model: gemini-2.0-flash with enhanced configuration`);

// Enhanced health check endpoints for Cloud Run
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Phone query parser service is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  const healthCheck = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      gemini_api: process.env.GOOGLE_API_KEY ? 'configured' : 'missing'
    }
  };
  
  res.status(200).json(healthCheck);
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

// Enhanced contextual query detection with more sophisticated pattern matching
function detectContextualQuery(query) {
  const phonePatterns = [
    /iPhone\s+\d+(?:\s+Pro(?:\s+Max)?)?/gi,
    /Samsung\s+Galaxy\s+[A-Z]\d+(?:\s+\w+)*/gi,
    /Galaxy\s+[A-Z]\d+(?:\s+\w+)*/gi,
    /Xiaomi\s+\w+(?:\s+\w+)*/gi,
    /Redmi\s+\w+(?:\s+\w+)*/gi,
    /POCO\s+\w+(?:\s+\w+)*/gi,
    /OnePlus\s+\w+(?:\s+\w+)*/gi,
    /(Oppo|Vivo|Realme|Nothing|Google)\s+\w+(?:\s+\w+)*/gi,
    /Motorola\s+\w+(?:\s+\w+)*/gi,
    /Nokia\s+\w+(?:\s+\w+)*/gi,
    /Sony\s+\w+(?:\s+\w+)*/gi,
    /Asus\s+\w+(?:\s+\w+)*/gi
  ];
  
  const contextualKeywords = [
    'vs', 'versus', 'compare', 'comparison', 'against', 'better than',
    'worse than', 'superior to', 'compared to', 'than', 'from',
    'like', 'similar to', 'alternative to', 'instead of',
    'replacement for', 'upgrade from', 'cheaper than', 'more expensive than',
    'different from', 'other than', 'rather than', 'in place of'
  ];
  
  // Extract phone names
  const phoneMatches = [];
  phonePatterns.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      phoneMatches.push(...matches);
    }
  });
  
  // Check for contextual keywords
  const hasContextualKeywords = contextualKeywords.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
  
  // Determine query type based on more nuanced patterns
  const hasComparison = /\b(vs|versus|compare|comparison|against|difference)\b/i.test(query);
  const hasAlternative = /\b(similar|alternative|like|instead|different|other than|rather than|in place of)\b/i.test(query);
  const hasRelational = /\b(better|worse|cheaper|expensive|superior|inferior|faster|slower|larger|smaller)\s+than\b/i.test(query);
  const hasBudgetConstraint = /\b(under|below|less than|max|maximum|budget|affordable|cheap|cheapest)\b/i.test(query);
  const hasFeatureFocus = /\b(camera|battery|display|screen|ram|storage|performance|processor|chipset|gps|bluetooth|waterproof|5g)\b/i.test(query);
  
  return {
    isContextual: phoneMatches.length > 0 && (hasContextualKeywords || phoneMatches.length > 1),
    phoneReferences: phoneMatches,
    hasComparison: hasComparison,
    hasAlternative: hasAlternative,
    hasRelational: hasRelational,
    hasBudgetConstraint: hasBudgetConstraint,
    hasFeatureFocus: hasFeatureFocus,
    queryType: determineQueryType(query, hasComparison, hasAlternative, hasRelational, hasBudgetConstraint, hasFeatureFocus)
  };
}

// Determine the specific type of query for more targeted responses
function determineQueryType(query, hasComparison, hasAlternative, hasRelational, hasBudgetConstraint, hasFeatureFocus) {
  const lowerQuery = query.toLowerCase();
  
  if (hasComparison) return "comparison";
  if (hasAlternative) return "alternative";
  if (hasRelational) return "relational";
  if (hasBudgetConstraint && hasFeatureFocus) return "budget_feature";
  if (hasBudgetConstraint) return "budget";
  if (hasFeatureFocus) return "feature";
  
  // Check for specific question patterns
  if (/\b(what|how|does|is|are)\b/.test(lowerQuery)) return "qa";  
  if (/\b(recommend|suggest|best|top|good)\b/.test(lowerQuery)) return "recommendation";
  if (/\b(specs|specifications|full details|details)\b/.test(lowerQuery)) return "drill_down";
  
  return "general";
}

// Main Gemini prompt-based parser with enhanced error handling
async function parseQuery(query, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  try {
    console.log(`[${new Date().toISOString()}] 🔹 Sending query to Gemini (attempt ${retryCount + 1}/${maxRetries + 1}): "${query}"`);
    console.log(`[${new Date().toISOString()}] 🔹 Using API key: ${process.env.GOOGLE_API_KEY ? 'Present' : 'Missing'}`);
    console.log(`[${new Date().toISOString()}] 🔹 API key length: ${process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0}`);
    
    // Detect if this is a contextual query
    const contextInfo = detectContextualQuery(query);
    console.log(`[${new Date().toISOString()}] 🔹 Contextual analysis:`, contextInfo);
    
    const prompt = `You are an exceptionally intelligent, adaptive, and conversational AI assistant for Peyechi, a smartphone recommendation platform in Bangladesh. Think of yourself as a highly knowledgeable human expert who can understand any phone-related query, no matter how it's phrased.

🧠 YOUR INTELLIGENCE MODEL:
You should respond like a human expert would - understanding context, nuance, and implied meaning rather than just looking for exact keyword matches. Your goal is to be helpful, friendly, and genuinely useful.

CORE PRINCIPLES:
1. You are a smart human expert, not a rigid program
2. You can understand context and implied meaning
3. You can handle any phone-related query, even unusual ones
4. You adapt your response based on what the user really needs
5. You're familiar with the Bangladesh mobile phone market

CONTEXT AWARENESS:
🎯 DETECTED QUERY TYPE: ${contextInfo.queryType}
${contextInfo.isContextual ? `
🎯 CONTEXTUAL QUERY DETECTED!
- Phone references found: ${contextInfo.phoneReferences.join(', ')}
- Has comparison intent: ${contextInfo.hasComparison}
- Has alternative intent: ${contextInfo.hasAlternative}
- Has relational intent: ${contextInfo.hasRelational}
- Has budget constraint: ${contextInfo.hasBudgetConstraint}
- Has feature focus: ${contextInfo.hasFeatureFocus}
` : ''}

YOUR EXPERTISE:
You deeply understand:
1. Technical specifications and their real-world impact
2. How different features matter for different use cases
3. Market positioning and value propositions
4. Bangladesh-specific factors (price sensitivity, network compatibility, availability)
5. User behavior and what people actually care about

INTELLIGENT RESPONSE APPROACH:
For ANY phone-related query, regardless of how it's phrased:
1. First, understand what the user is really asking for
2. Think about their underlying needs and context
3. Consider the Bangladesh market realities
4. Then provide the most helpful response in the appropriate JSON format

RESPONSE FORMATS:
- "recommendation": For suggesting phones based on needs
- "qa": For answering questions or providing information
- "comparison": For comparing devices
- "drill_down": For detailed technical information
- "chat": For friendly conversation

PHONE FEATURES YOU CAN FILTER ON:
- Basic: name, brand, model, price, price_original, price_category
- Display: display_type, screen_size_numeric, display_resolution, ppi_numeric, refresh_rate_numeric, screen_protection, display_brightness, aspect_ratio, hdr_support, display_score
- Performance: chipset, cpu, gpu, ram, ram_gb, ram_type, internal_storage, storage_gb, storage_type, performance_score
- Camera: camera_setup, primary_camera_resolution, selfie_camera_resolution, primary_camera_video_recording, selfie_camera_video_recording, primary_camera_ois, primary_camera_aperture, selfie_camera_aperture, camera_features, autofocus, flash, settings, zoom, shooting_modes, video_fps, camera_count, primary_camera_mp, selfie_camera_mp, camera_score
- Battery: battery_type, capacity, battery_capacity_numeric, quick_charging, wireless_charging, reverse_charging, has_fast_charging, has_wireless_charging, charging_wattage, battery_score
- Design: build, weight, thickness, colors, waterproof, ip_rating, ruggedness
- Connectivity: network, speed, sim_slot, volte, bluetooth, wlan, gps, nfc, usb, usb_otg, connectivity_score
- Security: fingerprint_sensor, finger_sensor_type, finger_sensor_position, face_unlock, light_sensor, infrared, fm_radio, security_score
- Software: operating_system, os_version, user_interface, status, made_by, release_date, release_date_clean, is_new_release, age_in_months, is_upcoming
- Derived Scores: overall_device_score, performance_score, display_score, camera_score, battery_score, security_score, connectivity_score, is_popular_brand

JSON RESPONSE REQUIREMENTS:
- Always return valid JSON with no markdown formatting
- Include a "type" field (recommendation, qa, comparison, drill_down, chat)
- For recommendation: include "filters" and "reasoning"
- For other types: include "data" and "reasoning"

ADAPTIVE INTELLIGENCE:
You can handle ANY phone-related query by:
1. Understanding the real intent behind the words
2. Adapting your response format to what's most helpful
3. Being creative when exact matches aren't available
4. Asking clarifying questions when needed
5. Providing detailed explanations when appropriate

INTELLIGENT CONTEXTUAL UNDERSTANDING:
Special cases to recognize and handle appropriately:
- Student needs: Balance of performance, battery, and affordability
- Gaming needs: Performance, cooling, battery, and display
- Photography needs: Camera quality, software features
- Budget constraints: Price limits with good value
- Thermal performance: Efficient chipsets, good reviews
- Durability needs: Build quality, water resistance
- Business use: Security, battery, connectivity
- Elderly users: Simple interface, large text, good battery

EXAMPLES OF YOUR FLEXIBLE THINKING:
User: "I need a phone that won't die mid-day" 
Your thinking: They want good battery life. → Recommendation with battery_capacity_numeric filter

User: "My phone is too slow for TikTok" 
Your thinking: They need better performance for social media. → Recommendation with performance_score filter

User: "Which phone won't break my bank?" 
Your thinking: They want affordable options. → Recommendation with max_price filter

User: "I want a phone that's good for everything" 
Your thinking: They want a balanced, well-rounded device. → Recommendation with overall_device_score filter

User: "What's the deal with 5G phones?" 
Your thinking: They're asking for information about 5G technology. → QA response with explanation

User: "I'm a student and need a good phone"
Your thinking: They need a balanced phone with good battery, decent performance, and reasonable price. → Recommendation with balanced filters

User: "Which phone won't heat up during gaming?"
Your thinking: They want good thermal performance for gaming. → Recommendation with performance_score and efficient chipsets

Your main goal is to be genuinely helpful like a knowledgeable friend, not rigid like a computer program. Think through each query and respond in the most useful way possible.

User query: ${query}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text();
    const cleanedText = cleanJsonResponse(rawText);

    console.log(
      `[${new Date().toISOString()}] 🔹 Gemini Raw Response:\n${rawText}`
    );
    console.log(
      `[${new Date().toISOString()}] 🔹 Cleaned JSON Attempt:\n${cleanedText}`
    );

    // Parse and validate response
    const parsed = JSON.parse(cleanedText);
    const allowedTypes = ["recommendation", "qa", "comparison", "drill_down", "chat"];

    if (!parsed.type || !allowedTypes.includes(parsed.type)) {
      throw new Error(`Unexpected response type: ${parsed.type}`);
    }

    console.log(`[${new Date().toISOString()}] ✅ Successfully parsed response type: ${parsed.type}`);
    return parsed;
    
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error parsing Gemini response (attempt ${retryCount + 1}):`,
      error
    );
    console.error(
      `[${new Date().toISOString()}] ❌ Error details:`,
      {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    );
    
    // Check if we should retry
    const shouldRetry = (
      retryCount < maxRetries && 
      (
        error.message.includes('quota') || 
        error.message.includes('limit') || 
        error.message.includes('rate') ||
        error.message.includes('timeout') ||
        error.message.includes('503') ||
        error.message.includes('502') ||
        error.message.includes('500')
      )
    );
    
    if (shouldRetry) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(`[${new Date().toISOString()}] 🔄 Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return parseQuery(query, retryCount + 1);
    }
    
    // Provide more specific error messages based on the error type
    if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
      return {
        type: "chat",
        data: "I'm having trouble with my AI service configuration. Please contact support.",
      };
    } else if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('rate')) {
      return {
        type: "chat",
        data: "I'm experiencing high usage right now. Please try again in a moment.",
      };
    } else if (error.message.includes('JSON') || error.message.includes('parse')) {
      return {
        type: "chat",
        data: "I'm having trouble understanding your request. Could you try rephrasing it?",
      };
    } else {
      return {
        type: "chat",
        data: "Sorry, I couldn't understand that. Can you please rephrase your question?",
      };
    }
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

// POST endpoint to process user query
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

// Graceful shutdown handling for Cloud Run
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] 🔄 Received SIGTERM, shutting down gracefully`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] 🔄 Received SIGINT, shutting down gracefully`);
  process.exit(0);
});

// Start the server - Cloud Run sets PORT environment variable
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Peyechi Gemini AI API running on http://0.0.0.0:${PORT}`);
  console.log(`[${new Date().toISOString()}] 🔹 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[${new Date().toISOString()}] 🔹 Google API Key: ${process.env.GOOGLE_API_KEY ? 'Configured' : 'Missing'}`);
});