// POST /api/account/open - a Discord-logged-in but not-yet-linked user
// claims a Minecraft IGN and agrees to the ToS. Only enqueues the claim -
// the bot is what actually verifies it (a fresh in-game payment from that
// IGN) and creates the real account_links entry. Requires the "unlinked"
// session role specifically (not client/admin) - a signed session set by
// the OAuth callback itself, not a spoofable query param.

import { verifySession } from "../../_lib/session.js";
import { enqueueAccountOpening } from "../../_lib/accountOpening.js";

export async function onRequestPost({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || session.role !== "unlinked") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ign = typeof body.minecraft_ign === "string" ? body.minecraft_ign.trim() : "";
  if (!ign || ign.length > 32) {
    return Response.json({ error: "Enter a valid Minecraft IGN." }, { status: 400 });
  }
  if (body.agree !== true) {
    return Response.json({ error: "You must agree to the Terms of Service." }, { status: 400 });
  }

  const entry = await enqueueAccountOpening(env.POYBANK_KV, {
    discord_id: session.discord_id,
    discord_username: session.username,
    minecraft_ign: ign,
  });

  return Response.json({ ok: true, entry });
}
