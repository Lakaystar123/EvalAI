const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const Tesseract = require('tesseract.js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Set default environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Debug logging for API key
console.log('API Key Debug:');
console.log('1. Raw API Key:', process.env.GEMINI_API_KEY);
console.log('2. API Key Length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log('3. API Key Type:', typeof process.env.GEMINI_API_KEY);
console.log('4. API Key Contains Spaces:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.includes(' ') : false);

// Validate environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

// Validate API key format
if (process.env.GEMINI_API_KEY.trim() === '') {
  console.error('Error: GEMINI_API_KEY is empty');
  process.exit(1);
}

const app = express();

// Configure CORS with larger payload size
app.use(cors({
  maxAge: 86400, // 24 hours
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

// Increase payload size limits
app.use(express.json({ 
  limit: '50mb',
  extended: true 
}));
app.use(express.urlencoded({ 
  limit: '50mb',
  extended: true 
}));

// Initialize Gemini API
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (error) {
  console.error('Error initializing Gemini API:', error.message);
  process.exit(1);
}

// Text extraction endpoint using Tesseract OCR
app.post('/api/extract-text', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    if (!mimeType || !mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Convert base64 to buffer for Tesseract
    const imageBuffer = Buffer.from(image, 'base64');

    // Perform OCR using Tesseract
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng', // language
      {
        logger: m => console.log(m),
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%^&*()_+-=[]{}|;:"\'<>/ ',
      }
    );

    const extractedText = result.data.text.trim();

    if (!extractedText || extractedText.length === 0) {
      return res.status(400).json({ error: 'No text could be extracted from the image' });
    }

    res.json({ text: extractedText });
  } catch (error) {
    console.error('Error extracting text:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to extract text from image',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Answer comparison endpoint using Gemini
app.post('/api/compare-answers', async (req, res) => {
  try {
    const { model, student } = req.body;
    
    if (!model || !student) {
      return res.status(400).json({ error: 'Both model and student answers are required' });
    }

    console.log('Comparing answers:');
    console.log('Model Answer:', model);
    console.log('Student Answer:', student);

    const genModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are an expert teacher evaluating a student's answer. Compare the model answer with the student's answer and provide a detailed evaluation.

Model Answer: ${model}

Student Answer: ${student}

Please evaluate based on these criteria:
1. Content Accuracy (0-3 points)
   - Key concepts and facts
   - Correctness of information
   - Understanding of the topic

2. Completeness (0-2 points)
   - Coverage of required points
   - Depth of explanation
   - Missing elements

3. Clarity and Organization (0-2 points)
   - Structure and flow
   - Language clarity
   - Logical presentation

4. Technical Accuracy (0-3 points)
   - Use of correct terminology
   - Technical precision
   - Application of concepts

IMPORTANT: You must respond with ONLY a valid JSON object in the following format, with no additional text or explanation:
{
  "score": <number between 0 and 10>,
  "feedback": {
    "contentAccuracy": "<brief feedback about content accuracy>",
    "completeness": "<brief feedback about completeness>",
    "clarity": "<brief feedback about clarity and organization>",
    "technicalAccuracy": "<brief feedback about technical accuracy>"
  },
  "suggestions": [
    "<suggestion 1>",
    "<suggestion 2>",
    "<suggestion 3>"
  ]
}`;

    console.log('Sending request to Gemini API...');
    const result = await genModel.generateContent(prompt);
    
    console.log('Received response from Gemini API');
    const response = await result.response;
    const responseText = response.text().trim();
    console.log('Raw response:', responseText);

    try {
      // Try to find JSON in the response if there's any additional text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      const evaluation = JSON.parse(jsonString);
      console.log('Parsed evaluation:', evaluation);

      // Validate the evaluation structure
      if (typeof evaluation.score !== 'number' || 
          !evaluation.feedback || 
          typeof evaluation.feedback !== 'object' ||
          !evaluation.suggestions || 
          !Array.isArray(evaluation.suggestions)) {
        throw new Error('Invalid evaluation structure received from model');
      }

      // Ensure all required fields are present
      const requiredFeedbackFields = ['contentAccuracy', 'completeness', 'clarity', 'technicalAccuracy'];
      for (const field of requiredFeedbackFields) {
        if (!evaluation.feedback[field] || typeof evaluation.feedback[field] !== 'string') {
          throw new Error(`Missing or invalid feedback field: ${field}`);
        }
      }

      // Ensure score is within valid range
      if (evaluation.score < 0 || evaluation.score > 10) {
        throw new Error('Score must be between 0 and 10');
      }

      res.json(evaluation);
    } catch (parseError) {
      console.error('Error parsing model response:', parseError);
      console.error('Raw response that failed to parse:', responseText);
      throw new Error('Failed to parse model response: ' + parseError.message);
    }
  } catch (error) {
    console.error('Error comparing answers:', error);
    if (error.message && error.message.includes('API key')) {
      return res.status(401).json({ 
        error: 'Invalid or missing API key. Please check your Gemini API key configuration.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    res.status(500).json({ 
      error: error.message || 'Failed to compare answers',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('Server Configuration:');
  console.log('-------------------');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Gemini API Key Status: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not Configured'}`);
  console.log(`API Key Length: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0} characters`);
  console.log('-------------------');
}); 