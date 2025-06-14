const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Check if GOOGLE_API_KEY is available
if (!process.env.GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY is not set in environment variables');
  process.exit(1);
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Phone query parser service is running' });
});

// Health check endpoint for Render
app.get('/parse-query', (req, res) => {
  res.json({ status: 'ok', message: 'Phone query parser service is running' });
});

function cleanJsonResponse(text) {
  // Remove markdown code block formatting if present
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

async function parseQuery(query) {
  try {
    const prompt = `You are an intelligent assistant that converts phone search queries into structured JSON filters.
    Return ONLY a JSON object with the following optional fields:
    {
      "min_performance_score": number,  // 0-100 scale
      "min_display_score": number,      // 0-100 scale
      "min_camera_score": number,       // 0-100 scale
      "min_security_score": number,      // 0-100 scale
      "min_battery_score": number, // 0-100 scale
      "max_price": number,             // in BDT
      "min_ram_gb": number,               // in GB
      "brand": string,                 // brand name like Samsung, Apple, etc.
      "limit": number                  // number of results to return
    }
    Only include fields that are relevant to the query.
    Do not include any markdown formatting or additional text.
    
    For example:
    - "phones under 20,000 BDT" -> {"max_price": 20000}
    - "good camera phones" -> {"min_camera_score": 80}
    - "fast phones with good battery" -> {"min_performance_score": 80, "min_battery_score": 60}
    - "phones with 8GB RAM" -> {"min_ram_gb": 8}
    - "Samsung phones" -> {"brand": "Samsung"}
    - "5 Samsung phones" -> {"brand": "Samsung", "limit": 5}
    - "best 3 phones with good camera" -> {"min_camera_score": 85, "limit": 3}
    
    Query: ${query}`;

    try {
      const result = await model.generateContent({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      });
      
      const response = await result.response;
      const text = response.text();
      const cleanedText = cleanJsonResponse(text);
      
      // Parse the JSON response
      try {
        const filters = JSON.parse(cleanedText);
        return filters;
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.error('Raw response:', text);
        console.error('Cleaned response:', cleanedText);
        throw new Error('Failed to parse Gemini response');
      }
    } catch (apiError) {
      console.error('Google AI API Error:', apiError);
      if (apiError.message.includes('404')) {
        throw new Error('Invalid model name or API version. Please check the model configuration.');
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Error in parseQuery:', error);
    throw error;
  }
}

app.post('/parse-query', async (req, res) => {
  try {
    console.log('Received query request:', req.body);
    const { query } = req.body;
    
    if (!query) {
      console.error('No query provided in request');
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('Processing query:', query);
    const filters = await parseQuery(query);
    console.log('Parsed filters:', filters);
    
    res.json({ filters });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      details: error.message || 'Unknown error'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Phone query parser service running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('GOOGLE_API_KEY available:', !!process.env.GOOGLE_API_KEY);
});