// POST /api/account/open - a Discord-logged-in but not-yet-linked user
// agrees to the ToS to start account verification. No Minecraft IGN is
// collected here - the bot discovers it from whoever actually sends the
// verification payment (see _lib/accountOpening.js) and creates the real
// account_links entry. Requires the "unlinked" session role specifically
// (not client/admin) - a signed session set by the OAuth callback itself,
// not a spoofable query param.

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

  if (body.agree !== true) {
    return Response.json({ error: "You must agree to the Terms of Service." }, { status: 400 });
  }

  const entry = await enqueueAccountOpening(env.POYBANK_KV, {
    discord_id: session.discord_id,
    discord_username: session.username,
  });

  return Response.json({ ok: true, entry });
}
