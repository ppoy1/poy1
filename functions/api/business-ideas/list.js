// GET /api/business-ideas/list - beta, owner-only for now.

import { verifySession } from "../../_lib/session.js";
import { readBusinessIdeas } from "../../_lib/businessIdeas.js";
import { readSnapshot, ignForDiscordId } from "../../_lib/kv.js";

export async function onRequestGet({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [ideas, snapshot] = await Promise.all([readBusinessIdeas(env.POYBANK_KV), readSnapshot(env.POYBANK_KV)]);

  // Resolved live from the bank's discord_id->IGN index rather than stored
  // on the idea/comment at post time, so it stays correct even if a player
  // re-links their account, and so it also back-fills posts made before
  // this field existed.
  const withIgns = ideas.map((idea) => ({
    ...idea,
    authorIgn: ignForDiscordId(snapshot, idea.authorDiscordId),
    comments: (idea.comments || []).map((c) => ({ ...c, authorIgn: ignForDiscordId(snapshot, c.authorDiscordId) })),
  }));

  return Response.json({ ideas: withIgns });
}
