// POST /api/admin/actions/submit - the owner approves/denies a pending
// Savings withdrawal from the admin panel. Strictly admin-role only (a
// client session can never reach this, unlike the shared /api/actions
// queue) - the bot picks this up on its own poll and runs the exact same
// logic as the equivalent Discord /accept or /deny command.

import { verifySession } from "../../../_lib/session.js";
import { validateAdminActionSubmission, enqueueAdminAction } from "../../../_lib/adminActions.js";

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

  const validationError = validateAdminActionSubmission(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const entry = await enqueueAdminAction(env.POYBANK_KV, {
    type: body.type,
    request_id: body.request_id,
    admin_discord_id: session.discord_id,
  });

  return Response.json({ ok: true, action: entry });
}
