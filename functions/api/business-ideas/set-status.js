// POST /api/business-ideas/set-status - beta, owner-only for now. Lets the
// poster mark their own idea closed (found what they were looking for) or
// reopen it.

import { verifySession } from "../../_lib/session.js";
import { setBusinessIdeaStatus } from "../../_lib/businessIdeas.js";

export async function onRequestPost({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status === "closed" || body.status === "open" ? body.status : "";
  if (!id || !status) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await setBusinessIdeaStatus(env.POYBANK_KV, id, status, session.discord_id);
  if (result.error === "not_found") {
    return Response.json({ error: "Idea not found." }, { status: 404 });
  }
  if (result.error === "forbidden") {
    return Response.json({ error: "You can only update your own posts." }, { status: 403 });
  }

  return Response.json({ ok: true, idea: result.idea });
}
