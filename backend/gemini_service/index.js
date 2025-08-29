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
  model: "gemini-2.5-flash-lite",
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

console.log(`[${new Date().toISOString()}] 🔹 Initialized Gemini model: gemini-2.5-flash-lite with enhanced configuration`);

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

// Enhanced contextual query detection
function detectContextualQuery(query) {
  const phonePatterns = [
    /iPhone\s+\d+(?:\s+Pro(?:\s+Max)?)?/gi,
    /Samsung\s+Galaxy\s+[A-Z]\d+(?:\s+\w+)*/gi,
    /Galaxy\s+[A-Z]\d+(?:\s+\w+)*/gi,
    /Xiaomi\s+\w+(?:\s+\w+)*/gi,
    /Redmi\s+\w+(?:\s+\w+)*/gi,
    /POCO\s+\w+(?:\s+\w+)*/gi,
    /OnePlus\s+\w+(?:\s+\w+)*/gi,
    /(Oppo|Vivo|Realme|Nothing|Google)\s+\w+(?:\s+\w+)*/gi
  ];
  
  const contextualKeywords = [
    'vs', 'versus', 'compare', 'comparison', 'against', 'better than',
    'worse than', 'superior to', 'compared to', 'than', 'from',
    'like', 'similar to', 'alternative to', 'instead of',
    'replacement for', 'upgrade from', 'cheaper than', 'more expensive than'
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
  
  return {
    isContextual: phoneMatches.length > 0 && (hasContextualKeywords || phoneMatches.length > 1),
    phoneReferences: phoneMatches,
    hasComparison: /\b(vs|versus|compare|comparison|against)\b/i.test(query),
    hasAlternative: /\b(similar|alternative|like|instead)\b/i.test(query),
    hasRelational: /\b(better|worse|cheaper|expensive|superior|inferior)\s+than\b/i.test(query)
  };
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
    
    const prompt = `You are a friendly, knowledgeable, and conversational AI assistant for Peyechi, a smartphone recommendation platform in Bangladesh.
Your job is to understand the user's intent and respond with a JSON object while being helpful and engaging.

CONTEXTUAL QUERY ENHANCEMENT:
${contextInfo.isContextual ? `
🎯 CONTEXTUAL QUERY DETECTED!
- Phone references found: ${contextInfo.phoneReferences.join(', ')}
- Has comparison intent: ${contextInfo.hasComparison}
- Has alternative intent: ${contextInfo.hasAlternative}
- Has relational intent: ${contextInfo.hasRelational}

For contextual queries, you should:
1. Recognize the specific phones mentioned
2. Understand the relationship being requested (comparison, alternative, better/worse than, etc.)
3. Generate appropriate filters that consider the context of the referenced phones
4. For comparison queries, ensure you capture all phone names for comparison
5. For "better than X" queries, set filters that find phones superior to X in relevant aspects
6. For "cheaper than X" queries, set price filters below the reference phone's price
7. For "similar to X" queries, set filters for phones in similar price/spec range
` : ''}

PERSONALITY GUIDELINES:
- Be conversational and friendly, not robotic
- Show enthusiasm for helping users find the perfect phone
- Use natural language that feels like talking to a knowledgeable friend
- Provide reasoning for recommendations when possible
- Ask clarifying questions when the user's request is ambiguous
- Be encouraging and supportive in your responses

AVAILABLE PHONE FEATURES:
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

Classify the intent as one of the following:
- "recommendation": Suggest phones based on filters (price, camera, battery, etc.)
- "qa": Answer specific technical questions about smartphones
- "comparison": Compare multiple phones with insights
- "drill_down": Power user commands for detailed views (full specs, chart view, feature details)
- "chat": Friendly conversations, jokes, greetings, small talk

RESPONSE FORMAT:
For recommendation queries:
{
  "type": "recommendation",
  "filters": {
    "max_price": number,
    "min_price": number,
    "brand": string,
    "price_category": string,
    "min_ram_gb": number,
    "max_ram_gb": number,
    "min_storage_gb": number,
    "max_storage_gb": number,
    "min_display_score": number,
    "max_display_score": number,
    "min_camera_score": number,
    "max_camera_score": number,
    "min_battery_score": number,
    "max_battery_score": number,
    "min_performance_score": number,
    "max_performance_score": number,
    "min_security_score": number,
    "max_security_score": number,
    "min_connectivity_score": number,
    "max_connectivity_score": number,
    "min_overall_device_score": number,
    "max_overall_device_score": number,
    "min_refresh_rate_numeric": number,
    "max_refresh_rate_numeric": number,
    "min_screen_size_numeric": number,
    "max_screen_size_numeric": number,
    "min_ppi_numeric": number,
    "max_ppi_numeric": number,
    "min_battery_capacity_numeric": number,
    "max_battery_capacity_numeric": number,
    "min_primary_camera_mp": number,
    "max_primary_camera_mp": number,
    "min_selfie_camera_mp": number,
    "max_selfie_camera_mp": number,
    "min_camera_count": number,
    "max_camera_count": number,
    "has_fast_charging": boolean,
    "has_wireless_charging": boolean,
    "is_popular_brand": boolean,
    "is_new_release": boolean,
    "is_upcoming": boolean,
    "display_type": string,
    "camera_setup": string,
    "battery_type": string,
    "chipset": string,
    "operating_system": string,
    "limit": number
  }
}

For drill-down queries:
{
  "type": "drill_down",
  "command": "full_specs" | "chart_view" | "detail_focus",
  "target": string (optional, for detail_focus - e.g., "display", "camera", "battery"),
  "reasoning": string (explain why this drill-down is helpful)
}

For other queries:
{
  "type": "qa" | "comparison" | "chat",
  "data": string (conversational, helpful response with reasoning when appropriate),
  "reasoning": string (optional, explain your thought process)
}

Examples:

BASIC QUERIES:
- "best phones under 30000 BDT" → { "type": "recommendation", "filters": { "max_price": 30000 } }
- "phones with good camera under 50000" → { "type": "recommendation", "filters": { "max_price": 50000, "min_camera_score": 7.0 } }
- "Samsung phones with 8GB RAM" → { "type": "recommendation", "filters": { "brand": "Samsung", "min_ram_gb": 8 } }
- "phones with 120Hz refresh rate" → { "type": "recommendation", "filters": { "min_refresh_rate_numeric": 120 } }
- "phones with wireless charging" → { "type": "recommendation", "filters": { "has_wireless_charging": true } }
- "new release phones" → { "type": "recommendation", "filters": { "is_new_release": true } }

CONTEXTUAL QUERIES (with phone references):
- "phones better than iPhone 14 Pro" → { "type": "recommendation", "filters": { "min_overall_device_score": 9.5, "min_price": 80000 }, "context_phones": ["iPhone 14 Pro"], "context_type": "better_than" }
- "phones cheaper than Samsung Galaxy S23" → { "type": "recommendation", "filters": { "max_price": 70000 }, "context_phones": ["Samsung Galaxy S23"], "context_type": "cheaper_than" }
- "phones with better camera than iPhone 14 Pro" → { "type": "recommendation", "filters": { "min_camera_score": 9.8 }, "context_phones": ["iPhone 14 Pro"], "context_type": "better_camera" }
- "phones similar to OnePlus 11" → { "type": "recommendation", "filters": { "min_price": 45000, "max_price": 65000, "min_ram_gb": 8 }, "context_phones": ["OnePlus 11"], "context_type": "similar_to" }
- "alternatives to Xiaomi 13 Pro" → { "type": "recommendation", "filters": { "min_price": 40000, "max_price": 55000 }, "context_phones": ["Xiaomi 13 Pro"], "context_type": "alternative_to" }
- "phones with better battery than iPhone 14 Pro" → { "type": "recommendation", "filters": { "min_battery_capacity_numeric": 3500, "min_battery_score": 8.0 }, "context_phones": ["iPhone 14 Pro"], "context_type": "better_battery" }

COMPARISON QUERIES:
- "Compare POCO X6 vs Redmi Note 13 Pro" → { "type": "comparison", "data": ["POCO X6", "Redmi Note 13 Pro"], "reasoning": "User wants to compare two specific phone models" }
- "iPhone 14 Pro vs Samsung Galaxy S23 camera quality" → { "type": "comparison", "data": ["iPhone 14 Pro", "Samsung Galaxy S23"], "focus": "camera", "reasoning": "User wants camera-focused comparison between two flagship phones" }
- "Compare OnePlus 11 vs Xiaomi 13 Pro vs Samsung Galaxy S23" → { "type": "comparison", "data": ["OnePlus 11", "Xiaomi 13 Pro", "Samsung Galaxy S23"], "reasoning": "User wants three-way comparison of flagship phones" }

QA QUERIES:
- "What is the refresh rate of Galaxy A55?" → { "type": "qa", "data": "Great question! Let me check the refresh rate of the Galaxy A55 for you. This is important for smooth scrolling and gaming performance.", "reasoning": "User wants specific technical information about a phone's display refresh rate" }
- "Does iPhone 14 Pro have wireless charging?" → { "type": "qa", "data": "Let me check the wireless charging capability of the iPhone 14 Pro for you!", "reasoning": "User wants specific feature information about a phone" }

DRILL-DOWN QUERIES:
- "Show full specs" → { "type": "drill_down", "command": "full_specs", "reasoning": "User wants comprehensive technical details about the recommended phones" }
- "Open chart view" → { "type": "drill_down", "command": "chart_view", "reasoning": "User prefers visual comparison with interactive charts" }
- "Tell me more about the display" → { "type": "drill_down", "command": "detail_focus", "target": "display", "reasoning": "User wants detailed information about display quality and features" }

CHAT QUERIES:
- "Hi, how are you?" → { "type": "chat", "data": "Hi there! I'm doing great and excited to help you find the perfect smartphone! What kind of phone are you looking for today?", "reasoning": "Friendly greeting that transitions to helping with phone recommendations" }

Only return valid JSON — no markdown formatting. User query: ${query}`;

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