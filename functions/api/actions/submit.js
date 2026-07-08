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
import { validateActionSubmission, enqueueAction } from "../../_lib/actions.js";
import { readSnapshot, applyOptimisticBalanceDelta } from "../../_lib/kv.js";
import { executeTreasuryPayout } from "../../_lib/treasury.js";
import { recordProcessedWithdrawal } from "../../_lib/reconcile.js";

const OPTIMISTIC_TYPES = new Set(["withdraw_deposit", "transfer_deposit_to_savings", "transfer_deposit_to_loan"]);

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

  // Deposit withdrawals are already a no-approval, instant, self-service
  // action (the bot processes them unconditionally, same rule as /withdraw
  // in Discord) - if the Treasury credential is configured here, skip the
  // queue and pay out directly so the real money movement is instant too,
  // not just the displayed balance. Untouched fallback to the normal queued
  // path below if unconfigured. Deliberately never falls back to the queue
  // AFTER attempting a direct payout - see treasury.js's `ambiguous` flag
  // for why (avoids any chance of paying the same withdrawal twice).
  if (body.type === "withdraw_deposit" && env.DC_TREASURY_TOKEN) {
    const idempotencyKey = `website-instant-withdraw:${Date.now()}-${crypto.randomUUID()}`;
    const result = await executeTreasuryPayout(
      env.DC_TREASURY_TOKEN,
      session.ign,
      amount,
      idempotencyKey,
      "Instant Deposit Account withdrawal - Poy Enterprises (via website)"
    );

    if (!result.success) {
      const message = result.ambiguous
        ? `Couldn't confirm whether this went through - please check your balance before retrying, or contact the owner if money seems to be missing. (${result.error})`
        : result.error;
      return Response.json({ error: message }, { status: 502 });
    }

    await applyOptimisticBalanceDelta(env.POYBANK_KV, session.ign, { depositDelta: -amount });
    await recordProcessedWithdrawal(env.POYBANK_KV, {
      ign: session.ign,
      amount,
      discord_id: session.discord_id,
      txn: result.txn,
    });

    return Response.json({ ok: true, instant: true });
  }

  const entry = await enqueueAction(env.POYBANK_KV, {
    type: body.type,
    discord_id: session.discord_id,
    ign: session.ign,
    amount: body.amount,
    account_type: body.account_type,
  });

  if (isOptimistic) {
    if (body.type === "transfer_deposit_to_savings") {
      await applyOptimisticBalanceDelta(env.POYBANK_KV, session.ign, { depositDelta: -amount, savingsDelta: amount });
    } else {
      await applyOptimisticBalanceDelta(env.POYBANK_KV, session.ign, { depositDelta: -amount });
    }
  }

  return Response.json({ ok: true, action: entry });
}
