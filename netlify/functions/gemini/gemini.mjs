// netlify/functions/gemini.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Allow': 'POST' }
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const prompt = requestBody.prompt;
    
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing prompt parameter' })
      };
    }

    const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    // Make the API call to Gemini
    const response = await axios.post(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });
    
    // Return the response
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
  } catch (error) {
    console.error('Error proxying to Gemini API:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process request',
        message: error.message 
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};