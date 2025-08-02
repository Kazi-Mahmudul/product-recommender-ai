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

// Check if GOOGLE_API_KEY is available
if (!process.env.GOOGLE_API_KEY) {
  console.error("❌ GOOGLE_API_KEY is missing. Please set it in your deployment environment variables.");
  console.error("This can be done in Render dashboard under Environment Variables section.");
  console.error("Or copy the .env file to the gemini_service directory.");
  process.exit(1);
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

console.log(`[${new Date().toISOString()}] 🔹 Initialized Gemini model: gemini-2.0-flash`);

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

// Main Gemini prompt-based parser
async function parseQuery(query) {
  try {
    console.log(`[${new Date().toISOString()}] 🔹 Sending query to Gemini: "${query}"`);
    console.log(`[${new Date().toISOString()}] 🔹 Using API key: ${process.env.GOOGLE_API_KEY ? 'Present' : 'Missing'}`);
    console.log(`[${new Date().toISOString()}] 🔹 API key length: ${process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0}`);
    
    const prompt = `You are a powerful and versatile smart assistant for ePick, a smartphone recommendation platform.
Your job is to detect the user's intent and respond with a JSON object.

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

For other queries:
{
  "type": "qa" | "comparison" | "chat",
  "data": string
}

Examples:
- "best phones under 30000 BDT" → { "type": "recommendation", "filters": { "max_price": 30000 } }
- "phones with good camera under 50000" → { "type": "recommendation", "filters": { "max_price": 50000, "min_camera_score": 7.0 } }
- "Samsung phones with 8GB RAM" → { "type": "recommendation", "filters": { "brand": "Samsung", "min_ram_gb": 8 } }
- "phones with 120Hz refresh rate" → { "type": "recommendation", "filters": { "min_refresh_rate_numeric": 120 } }
- "phones with wireless charging" → { "type": "recommendation", "filters": { "has_wireless_charging": true } }
- "new release phones" → { "type": "recommendation", "filters": { "is_new_release": true } }
- "What is the refresh rate of Galaxy A55?" → { "type": "qa", "data": "I'll check the refresh rate of Galaxy A55 for you." }
- "Compare POCO X6 vs Redmi Note 13 Pro" → { "type": "comparison", "data": "I'll compare POCO X6 and Redmi Note 13 Pro for you." }
- "Hi, how are you?" → { "type": "chat", "data": "I'm great! How can I help you today?" }

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
    const allowedTypes = ["recommendation", "qa", "comparison", "chat"];

    if (!parsed.type || !allowedTypes.includes(parsed.type)) {
      throw new Error(`Unexpected response type: ${parsed.type}`);
    }

    console.log(`[${new Date().toISOString()}] ✅ Successfully parsed response type: ${parsed.type}`);
    return parsed;
    
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error parsing Gemini response:`,
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

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 ePick Gemini AI API running on http://localhost:${PORT}`);
});