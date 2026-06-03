// api/groq.js - Serverless Function for Secure API Calls
// Deploy with: Vercel, Netlify, or any serverless platform

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract data from request
  const { prompt, maxTokens = 600 } = req.body;

  // Validate input
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!maxTokens || maxTokens > 2000) {
    return res.status(400).json({ error: 'Invalid maxTokens' });
  }

  // Get API key from environment variable (NEVER expose in client code!)
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    console.error('❌ GROQ_API_KEY environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log("🌐 Calling Groq API with maxTokens:", maxTokens);

    // Call Groq API securely from backend
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    console.log("📡 Groq API Response Status:", response.status);

    // Parse response
    const data = await response.json();

    // Check for errors
    if (!response.ok) {
      const errorMsg = data?.error?.message || `API error ${response.status}`;
      console.error("❌ Groq API Error:", errorMsg);
      return res.status(response.status).json({ error: errorMsg });
    }

    // Success! Return response
    console.log("✅ Groq API Response received successfully");
    const content = data.choices[0].message.content;
    
    return res.status(200).json({ 
      success: true,
      content: content 
    });

  } catch (error) {
    console.error("❌ Backend Error:", error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}