// POST /api/actions/submit - a logged-in client requests a withdrawal or
// claims an in-game deposit. This enqueues the request for the bot to
// actually carry out with its own credentials - but for the action types
// where the effect on Deposit is fully known up front (no owner approval
// gate, no external fact to verify first), it also applies an optimistic
// balance update immediately, so the portal reflects it right away instead
// of waiting for the bot's next ~60s poll. The bot's own processing and
// next snapshot push remain the real, authoritative source of truth
// regardless - this is purely an instant-feeling display convenience.

import { verifySession } from "../../_lib/session.js";
import { validateActionSubmission, enqueueAction, hasPendingAction } from "../../_lib/actions.js";
import { readSnapshot, applyOptimisticBalanceDelta } from "../../_lib/kv.js";

const OPTIMISTIC_TYPES = new Set(["withdraw_deposit"]);

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

  if (await hasPendingAction(env.POYBANK_KV, session.discord_id)) {
    return Response.json(
      { error: "You already have a request being processed - please wait for it to finish before submitting another." },
      { status: 429 }
    );
  }

  const isOptimistic = OPTIMISTIC_TYPES.has(body.type);
  const amount = isOptimistic ? parseFloat(body.amount) : null;

  if (isOptimistic) {
    const snapshot = await readSnapshot(env.POYBANK_KV);
    const client = snapshot?.clients?.[session.ign.toLowerCase()];
    const available = client ? parseFloat(client.deposit_balance) || 0 : 0;
    if (amount > available) {
      return Response.json(
        { error: `Insufficient Deposit balance (has $${available.toFixed(2)}, requested $${amount.toFixed(2)})` },
        { status: 400 }
      );
    }
  }

  // withdraw_deposit used to pay out directly from here (bypassing the
  // bot's queue) whenever a Treasury credential was configured, so it felt
  // instant instead of waiting for the bot's ~60s poll. Removed: this ran
  // as a second, independent payout path alongside Discord's /withdraw,
  // and both could pass their own balance check before either knew about
  // the other's in-flight withdrawal - real double-payouts happened this
  // way (see the 2026-07-10 incident). The bot's queue is the only place
  // Deposit withdrawals get authorized now, so only one process can ever
  // act on a given balance at a time.
  const entry = await enqueueAction(env.POYBANK_KV, {
    type: body.type,
    discord_id: session.discord_id,
    ign: session.ign,
    amount: body.amount,
    account_type: body.account_type,
  });

  if (isOptimistic) {
    await applyOptimisticBalanceDelta(env.POYBANK_KV, session.ign, { depositDelta: -amount });
  }

  return Response.json({ ok: true, action: entry });
}
