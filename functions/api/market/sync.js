// POST /api/market/sync - the bot pushes its real estate market index here,
// built from the DemocracyCraft #realestate forum's closed auctions. Same
// bearer-secret convention as /api/sync.

import { getMarketSnapshotShapeErrors } from "../../_lib/kv.js";

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!env.WEBSITE_SYNC_SECRET || authHeader !== `Bearer ${env.WEBSITE_SYNC_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const errors = getMarketSnapshotShapeErrors(body);
  if (errors.length) {
    return new Response(`Rejected: ${errors.join("; ")}`, { status: 400 });
  }

  await env.POYBANK_KV.put("market_snapshot", JSON.stringify(body));
  return Response.json({ ok: true, generated_at: body.generated_at, sales: body.sales.length });
}
