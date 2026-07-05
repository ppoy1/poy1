// GET /api/market/estimate?code=C258 - client-portal-only. Estimates a
// price for ANY plot code, not just ones that have actually sold, by
// inferring its zone/district from the code and applying the price index
// built from real closed auctions.

import { verifySession } from "../../_lib/session.js";
import { readMarketSnapshot } from "../../_lib/kv.js";
import { estimateForCode } from "../../_lib/marketAlgorithm.js";

export async function onRequestGet({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || (session.role !== "client" && session.role !== "admin")) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim();
  if (!code) {
    return Response.json({ error: "Missing ?code=" }, { status: 400 });
  }
  const landArea = url.searchParams.get("land");
  const x = url.searchParams.get("x");
  const z = url.searchParams.get("z");

  const snapshot = await readMarketSnapshot(env.POYBANK_KV);
  if (!snapshot) {
    return Response.json({ error: "No market data synced yet - try again shortly" }, { status: 503 });
  }

  return Response.json(estimateForCode(code, snapshot, { landArea, x, z }));
}
