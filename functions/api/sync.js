// POST /api/sync - the bot pushes its periodic read-only data snapshot here.
// This is the only way data gets INTO Cloudflare; the site never reaches
// back into the bot's VPS.

import { getSnapshotShapeErrors } from "../_lib/kv.js";

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

  const errors = getSnapshotShapeErrors(body);
  if (errors.length) {
    return new Response(`Rejected: ${errors.join("; ")}`, { status: 400 });
  }

  await env.POYBANK_KV.put("snapshot", JSON.stringify(body));
  return Response.json({ ok: true, synced_at: body.synced_at });
}
