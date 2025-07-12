const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
app.use(cors());
app.use(express.json());

// Check if GOOGLE_API_KEY is available
if (!process.env.GOOGLE_API_KEY) {
  console.error("❌ GOOGLE_API_KEY is missing in your .env file.");
  process.exit(1);
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
    const prompt = `You are a powerful and versatile smart assistant for ePick, a smartphone recommendation platform.
Your job is to detect the user's intent and respond with a JSON object.

Classify the intent as one of the following:
- "recommendation": Suggest phones based on filters (price, camera, battery, etc.)
- "qa": Answer specific technical questions about smartphones
- "comparison": Compare multiple phones with insights
- "chat": Friendly conversations, jokes, greetings, small talk

RESPONSE FORMAT:
{
  "type": "recommendation" | "qa" | "comparison" | "chat",
  "data": {...} // JSON object for recommendation, string for others
}

Examples:
- "best phones under 30000 BDT" → { "type": "recommendation", "data": { "max_price": 30000 } }
- "Does Galaxy A55 support 5G?" → { "type": "qa", "data": "Yes, Galaxy A55 supports 5G." }
- "Compare POCO X6 vs Redmi Note 13 Pro" → { "type": "comparison", "data": "POCO X6 is better for performance..." }
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

    return parsed;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error parsing Gemini response:`,
      error
    );
    return {
      type: "chat",
      data: "Sorry, I couldn’t understand that. Can you please rephrase your question?",
    };
  }
}

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
