// POST /api/business-ideas/comment - beta, owner-only for now. Adds a
// message to an idea's discussion thread (async, not live chat).

import { verifySession } from "../../_lib/session.js";
import { addComment } from "../../_lib/businessIdeas.js";

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

  const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!ideaId || !text || text.length > 1000) {
    return Response.json({ error: "A message (1-1000 characters) is required." }, { status: 400 });
  }

  const result = await addComment(env.POYBANK_KV, ideaId, {
    authorDiscordId: session.discord_id,
    authorUsername: session.username || "Unknown",
    text,
  });
  if (result.error === "not_found") {
    return Response.json({ error: "Idea not found." }, { status: 404 });
  }

  return Response.json({ ok: true, idea: result.idea });
}
