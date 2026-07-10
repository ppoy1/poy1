// POST /api/business-ideas/delete - owner only (the admin session role is
// the owner in this beta). Lets the owner remove any post as a moderation
// tool, regardless of who posted it - unlike set-status, there's no
// per-post author check here on purpose.

import { verifySession } from "../../_lib/session.js";
import { deleteBusinessIdea } from "../../_lib/businessIdeas.js";

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
  if (!id) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await deleteBusinessIdea(env.POYBANK_KV, id);
  if (result.error === "not_found") {
    return Response.json({ error: "Idea not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
