// POST /api/business-ideas/create - beta, owner-only for now.

import { verifySession } from "../../_lib/session.js";
import { createBusinessIdea } from "../../_lib/businessIdeas.js";

const VALID_TAGS = ["partners", "investment", "advice"];

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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const lookingFor = Array.isArray(body.lookingFor) ? body.lookingFor.filter((t) => VALID_TAGS.includes(t)) : [];

  if (!title || title.length > 100) {
    return Response.json({ error: "Title is required (max 100 characters)." }, { status: 400 });
  }
  if (!description || description.length > 2000) {
    return Response.json({ error: "Description is required (max 2000 characters)." }, { status: 400 });
  }
  if (!lookingFor.length) {
    return Response.json({ error: "Pick at least one thing you're looking for." }, { status: 400 });
  }

  const idea = await createBusinessIdea(env.POYBANK_KV, {
    title,
    description,
    lookingFor,
    authorDiscordId: session.discord_id,
    authorUsername: session.username || "Unknown",
  });

  return Response.json({ ok: true, idea });
}
