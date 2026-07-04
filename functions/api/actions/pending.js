// GET /api/actions/pending - the bot polls this (every ~60s) to pick up new
// withdrawal/claim requests submitted from the website.

import { readPendingActions } from "../../_lib/actions.js";

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!env.WEBSITE_SYNC_SECRET || authHeader !== `Bearer ${env.WEBSITE_SYNC_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const actions = await readPendingActions(env.POYBANK_KV);
  return Response.json({ actions });
}
