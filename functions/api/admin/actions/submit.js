// POST /api/admin/actions/submit - the owner approves/denies a pending
// Savings withdrawal from the admin panel. Strictly admin-role only (a
// client session can never reach this, unlike the shared /api/actions
// queue).
//
// accept_savings_withdrawal used to get the same instant-Treasury-payout
// treatment as a client's Deposit withdrawal (paying out directly from
// here whenever DC_TREASURY_TOKEN was configured, bypassing the bot's
// queue). Removed: this ran as a second, independent payout path
// alongside Discord's /accept for the same request, and both could pass
// their own check before either knew about the other's in-flight
// approval - the exact same class of double-payout race that hit
// withdraw_deposit in api/actions/submit.js on 2026-07-10. Every approval
// now goes through the bot's queue, so only one process can ever act on
// a given request.

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
    ...body,
    admin_discord_id: session.discord_id,
  });

  return Response.json({ ok: true, action: entry });
}
