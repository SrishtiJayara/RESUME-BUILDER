const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, jobTitle, experience, skills, education, summary } = req.body;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are an expert resume writer. Return ONLY valid JSON." },
        { role: "user", content: `Generate a professional resume for:\nName: ${name}\nJob Title: ${jobTitle}\nExperience: ${experience}\nSkills: ${skills}\nEducation: ${education}\n${summary ? `Context: ${summary}` : ""}\n\nReturn JSON with: professionalSummary, experienceBullets[], skillsFormatted[], educationFormatted, resumeText` },
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
