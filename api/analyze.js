const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { resumeText } = req.body;
  if (!resumeText) return res.status(400).json({ error: "resumeText required" });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are an expert resume analyst. Return ONLY valid JSON, no markdown." },
        { role: "user", content: `Analyze this resume and return JSON with: score (0-100), summary, strengths[], weaknesses[], sections{contact,summary,experience,education,skills each with score+feedback}, keywords[], atsScore (0-100).\n\nResume:\n${resumeText}` },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });
    const raw = completion.choices[0].message.content;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
