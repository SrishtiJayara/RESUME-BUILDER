import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// Helper: call Groq
async function callGroq(systemPrompt, userPrompt) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });
  return completion.choices[0].message.content;
}

app.post("/api/groq", async (req, res) => {
  const { prompt, maxTokens = 600 } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: Math.min(Number(maxTokens) || 600, 2048),
    });

    res.json({
      success: true,
      content: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Groq error:", error);
    const status = error.status || 500;
    const message = error.error?.error?.message || error.message || "Failed to generate AI response";
    res.status(status).json({ error: message });
  }
});

// Analyze Resume
app.post("/api/analyze", async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText) return res.status(400).json({ error: "resumeText required" });

  try {
    const raw = await callGroq(
      `You are an expert resume analyst. Analyze resumes and return ONLY valid JSON, no markdown.`,
      `Analyze this resume and return a JSON object with:
- score: number 0-100
- summary: string (2-3 sentence overall assessment)
- strengths: string[] (top 3-4 strengths)
- weaknesses: string[] (top 3-4 weaknesses)
- sections: object with keys "contact","summary","experience","education","skills" each having { score: number, feedback: string }
- keywords: string[] (important keywords found)
- atsScore: number 0-100 (ATS compatibility)

Resume:
${resumeText}`
    );

    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

// Improve Resume
app.post("/api/improve", async (req, res) => {
  const { resumeText, focusArea } = req.body;
  if (!resumeText) return res.status(400).json({ error: "resumeText required" });

  try {
    const raw = await callGroq(
      `You are an expert resume writer. Improve resumes while keeping them authentic.`,
      `Improve this resume${focusArea ? ` focusing on the ${focusArea} section` : ""}. Return ONLY the improved resume text, no explanations.

Resume:
${resumeText}`
    );

    res.json({ improvedResume: raw });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to improve resume" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
