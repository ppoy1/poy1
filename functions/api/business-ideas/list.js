// GET /api/business-ideas/list - beta, owner-only for now.

import { verifySession } from "../../_lib/session.js";
import { readBusinessIdeas } from "../../_lib/businessIdeas.js";

export async function onRequestGet({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const ideas = await readBusinessIdeas(env.POYBANK_KV);
  return Response.json({ ideas });
}
