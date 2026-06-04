export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { resumeText, targetRole } = req.body;
  if (!resumeText) return res.status(400).json({ error: "resumeText required" });

  try {
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an elite resume coach. Return ONLY valid JSON." },
        { role: "user", content: `Improve this resume${targetRole ? ` for a ${targetRole} role` : ""}.\n\nResume:\n${resumeText}\n\nReturn JSON with: overallFeedback, quickWins[{issue,fix}], impactImprovements[{section,original,improved,reason}], structureAdvice[], contentAdvice[], powerWords[], improvedSummary` },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });
    const raw = completion.choices[0].message.content;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("improve error:", err);
    res.status(500).json({ error: err.message });
  }
}
