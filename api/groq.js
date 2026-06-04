export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, maxTokens = 600 } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: Math.min(Number(maxTokens) || 600, 2048),
    });
    res.json({ success: true, content: completion.choices[0].message.content });
  } catch (err) {
    console.error("groq error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
}
