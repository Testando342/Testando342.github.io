require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API proxy endpoint
app.post('/api/gemini', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    const response = await axios.post(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Gemini API:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message 
    });
  }
});

// Serve static files if needed
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

