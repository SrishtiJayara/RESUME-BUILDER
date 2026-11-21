export async function incrementVisitCount() {
  const headers = {};
  if (process.env.COUNTER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.COUNTER_API_KEY}`;
  }

  const url = "https://api.counterapi.dev/v2/srishtis-team-6311/first-counter-6311/up";
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || payload?.message;
    const error = new Error(message || `Counter API error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const count = Number(payload?.value ?? payload?.data?.value ?? payload?.data);
  if (!Number.isFinite(count)) {
    const error = new Error("Counter API returned an invalid visit count");
    error.status = 502;
    throw error;
  }

  return count;
}
