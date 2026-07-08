// GET /api/account/pending - the bot polls this for account-opening claims
// awaiting verification. Bearer-secret gated, same as every other bot-facing
// endpoint - never reachable by a browser session.

import { readPendingAccountOpenings } from "../../_lib/accountOpening.js";

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!env.WEBSITE_SYNC_SECRET || authHeader !== `Bearer ${env.WEBSITE_SYNC_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const entries = await readPendingAccountOpenings(env.POYBANK_KV);
  return Response.json({ entries });
}
