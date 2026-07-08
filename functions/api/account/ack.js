// POST /api/account/ack - the bot calls this once it's done with an
// account-opening entry, whether it completed verification or the entry
// simply expired (see bot.py's poll_account_openings_task) - either way it
// shouldn't be checked again.

import { ackAccountOpenings } from "../../_lib/accountOpening.js";

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

  const remaining = await ackAccountOpenings(env.POYBANK_KV, body.ids);
  return Response.json({ ok: true, remaining });
}
