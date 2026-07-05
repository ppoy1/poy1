// Calls Aurum Markets' documented external pricer API (see
// https://markets-app-nine.vercel.app/pricer/api) when AURUM_PRICER_API_KEY
// is configured. This is a bonus data source, never a hard dependency - any
// failure (missing key, no match, rate limit, Aurum downtime) returns null
// so the caller falls back to the local zone-median estimate instead.

const AURUM_BASE = "https://markets-app-nine.vercel.app";

export async function fetchAurumEstimate(apiKey, propertyId) {
  if (!apiKey || !propertyId) return null;
  try {
    const res = await fetch(`${AURUM_BASE}/api/pricer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ mode: "external-estimate", propertyId }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data || null;
  } catch {
    return null;
  }
}
