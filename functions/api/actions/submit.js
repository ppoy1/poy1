// POST /api/actions/submit - a logged-in client requests a withdrawal or
// claims an in-game deposit. This just enqueues the request; the bot picks
// it up on its next poll and does the real work with its own credentials.

import { verifySession } from "../../_lib/session.js";
import { validateActionSubmission, enqueueAction } from "../../_lib/actions.js";

export async function onRequestPost({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || (session.role !== "client" && session.role !== "admin") || !session.ign) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateActionSubmission(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const entry = await enqueueAction(env.POYBANK_KV, {
    type: body.type,
    discord_id: session.discord_id,
    ign: session.ign,
    amount: body.amount,
    account_type: body.account_type,
  });

  return Response.json({ ok: true, action: entry });
}
