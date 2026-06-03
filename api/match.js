import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { resumeText, jobDescription } = req.body;
  if (!resumeText || !jobDescription)
    return res.status(400).json({ error: "resumeText and jobDescription required" });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are an expert at matching resumes to job descriptions. Return ONLY valid JSON." },
        { role: "user", content: `Analyze how well this resume matches the job description.

Resume:
${resumeText}

Job Description:
${jobDescription}

Return JSON with:
- matchScore: number 0-100
- verdict: string ("Strong Match" | "Good Match" | "Partial Match" | "Weak Match")
- matchedKeywords: string[]
- missingKeywords: string[]
- matchedRequirements: string[]
- missingRequirements: string[]
- recommendations: string[] (3-5 specific actions)
- coverLetterHint: string (1 paragraph tailored cover letter opener)` },
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
