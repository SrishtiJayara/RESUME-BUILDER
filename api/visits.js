import { incrementVisitCount } from "../backend/visits.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const count = await incrementVisitCount();
    return res.status(200).json({ count });
  } catch (error) {
    console.error("Visit counter error:", error);
    return res.status(error.status || 502).json({ error: error.message });
  }
}
