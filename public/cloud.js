const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const axios = require('axios');

exports.geminiProxy = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        return res.status(405).send({error: 'Method Not Allowed'});
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
      
      // Construct the request to Gemini API
      const response = await axios.post(
        `${geminiEndpoint}?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: req.body.prompt
                }
              ]
            }
          ]
        }
      );
      
      return res.status(200).send(response.data);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return res.status(500).send({
        error: {
          message: 'Failed to process request'
        }
      });
    }
    const apiKey = functions.config().gemini.apikey;

  });
});