import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { resumeText, targetRole } = req.body;
  if (!resumeText) return res.status(400).json({ error: "resumeText required" });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are an elite resume coach. Give actionable, specific improvement suggestions. Return ONLY valid JSON." },
        { role: "user", content: `Give detailed improvement suggestions for this resume${targetRole ? ` targeting a ${targetRole} role` : ""}.

Resume:
${resumeText}

Return JSON with:
- overallFeedback: string
- quickWins: Array<{issue: string, fix: string}>
- impactImprovements: Array<{section: string, original: string, improved: string, reason: string}>
- structureAdvice: string[]
- contentAdvice: string[]
- powerWords: string[]
- improvedSummary: string` },
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
}
