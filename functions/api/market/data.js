// GET /api/market/data - public, no login required. Serves the real estate
// market index built from DemocracyCraft's #realestate forum.

import { readMarketSnapshot } from "../../_lib/kv.js";

export async function onRequestGet({ env }) {
  const snapshot = await readMarketSnapshot(env.POYBANK_KV);
  if (!snapshot) {
    return Response.json({ error: "No market data synced yet - try again shortly" }, { status: 503 });
  }
  return Response.json(snapshot);
}
