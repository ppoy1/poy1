// GET /api/admin/actions/pending - the bot polls this (every ~60s) to pick
// up owner actions (accept/deny withdrawal, etc.) submitted from the
// admin panel.

import { readPendingAdminActions } from "../../../_lib/adminActions.js";

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!env.WEBSITE_SYNC_SECRET || authHeader !== `Bearer ${env.WEBSITE_SYNC_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const actions = await readPendingAdminActions(env.POYBANK_KV);
  return Response.json({ actions });
}
