// POST /api/actions/ack - the bot calls this after processing pending
// actions, so they're removed from the queue and never processed twice.
// Body: { "ids": ["<action id>", ...] }

import { ackActions } from "../../_lib/actions.js";

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

  if (!Array.isArray(body.ids)) {
    return new Response("ids must be an array", { status: 400 });
  }

  const remaining = await ackActions(env.POYBANK_KV, body.ids);
  return Response.json({ ok: true, remaining });
}
