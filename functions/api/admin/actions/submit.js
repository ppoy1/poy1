// POST /api/admin/actions/submit - the owner approves/denies a pending
// Savings withdrawal from the admin panel. Strictly admin-role only (a
// client session can never reach this, unlike the shared /api/actions
// queue).
//
// accept_savings_withdrawal gets the same instant-Treasury-payout
// treatment as a client's Deposit withdrawal, when DC_TREASURY_TOKEN is
// configured and the request's Savings balance (per the last synced
// snapshot) still looks sufficient: pay out directly, record it for the
// bot to reconcile into its own pending_withdrawals.json/
// client_accounts.json, and never fall through to the queue afterward
// (same "never attempt-then-fallback" rule as withdraw_deposit in
// api/actions/submit.js - avoids any chance of paying it twice). If the
// request can't be found in the snapshot, or its balance now looks
// insufficient, or the token isn't configured, this falls through to the
// unchanged queued path below, which lets the bot's own logic (including
// its correct auto-deny-on-insufficient-funds) handle it exactly as
// before. deny_savings_withdrawal never has a real-money instant path
// (nothing to pay out) and always goes through the queue.

import { verifySession } from "../../../_lib/session.js";
import { validateAdminActionSubmission, enqueueAdminAction } from "../../../_lib/adminActions.js";
import { readSnapshot, applyOptimisticBalanceDelta } from "../../../_lib/kv.js";
import { executeTreasuryPayout } from "../../../_lib/treasury.js";
import { recordProcessedSavingsApproval } from "../../../_lib/reconcile.js";

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

  if (body.type === "accept_savings_withdrawal" && env.DC_TREASURY_TOKEN) {
    const snapshot = await readSnapshot(env.POYBANK_KV);
    const pendingReq = snapshot?.pending_withdrawals?.find((w) => w.id === Number(body.request_id));
    const amount = pendingReq ? parseFloat(pendingReq.amount) : NaN;
    const client = pendingReq ? snapshot?.clients?.[pendingReq.ign.toLowerCase()] : null;
    const available = client ? parseFloat(client.savings_balance) || 0 : 0;

    if (pendingReq && amount <= available) {
      const idempotencyKey = `website-instant-savings-accept:${body.request_id}`;
      const result = await executeTreasuryPayout(
        env.DC_TREASURY_TOKEN,
        pendingReq.ign,
        amount,
        idempotencyKey,
        "Approved Savings Account withdrawal - Poy Enterprises (via website)"
      );

      if (!result.success) {
        const message = result.ambiguous
          ? `Couldn't confirm whether this went through - please check before retrying. (${result.error})`
          : result.error;
        return Response.json({ error: message }, { status: 502 });
      }

      await applyOptimisticBalanceDelta(env.POYBANK_KV, pendingReq.ign, { savingsDelta: -amount });
      await recordProcessedSavingsApproval(env.POYBANK_KV, {
        request_id: Number(body.request_id),
        ign: pendingReq.ign,
        amount,
        admin_discord_id: session.discord_id,
        txn: result.txn,
      });

      return Response.json({ ok: true, instant: true });
    }
    // No matching pending request, or its balance no longer looks
    // sufficient - fall through to the queue untouched.
  }

  const entry = await enqueueAdminAction(env.POYBANK_KV, {
    type: body.type,
    request_id: body.request_id,
    admin_discord_id: session.discord_id,
  });

  return Response.json({ ok: true, action: entry });
}
