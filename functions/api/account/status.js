// GET /api/account/status - lets not-linked.html poll whether a submitted
// claim is still waiting on the bot, has been linked (success - the bot
// found the fresh in-game payment and completed it), or was never
// submitted. Deliberately doesn't expose a distinct "rejected" state - the
// bot only ever completes or leaves an entry pending (see poll_account_
// openings_task in bot.py), so "not pending and not linked" always means
// either it hasn't been submitted yet or the payment hasn't arrived.

import { verifySession } from "../../_lib/session.js";
import { readSnapshot } from "../../_lib/kv.js";
import { findPendingAccountOpening } from "../../_lib/accountOpening.js";

export async function onRequestGet({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || session.role !== "unlinked") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const snapshot = await readSnapshot(env.POYBANK_KV);
  const linkedIgn = snapshot?.account_links?.[session.discord_id];
  if (linkedIgn) {
    return Response.json({ status: "linked", ign: linkedIgn });
  }

  const pending = await findPendingAccountOpening(env.POYBANK_KV, session.discord_id);
  if (pending) {
    return Response.json({
      status: "pending",
      ign: pending.minecraft_ign,
      verification_amount: pending.verification_amount,
      requested_at: pending.requested_at,
    });
  }

  return Response.json({ status: "none" });
}
