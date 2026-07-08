// GET /api/reconcile/pending - the bot polls this (every ~60s) to learn
// about Deposit withdrawals the website already paid out directly via the
// Treasury API, so it can update its own local balance/history records.
// It must NOT call the Treasury API again for these - the money already
// moved; this is bookkeeping-only.

import { readProcessedWithdrawals } from "../../_lib/reconcile.js";

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!env.WEBSITE_SYNC_SECRET || authHeader !== `Bearer ${env.WEBSITE_SYNC_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const entries = await readProcessedWithdrawals(env.POYBANK_KV);
  return Response.json({ entries });
}
