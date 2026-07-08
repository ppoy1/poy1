// Direct port of PoyBankBot's treasury_get/treasury_post/resolve_player_account/
// execute_treasury_payout (bot.py) - same DemocracyCraft economy API, same
// call sequence, same idempotency-key contract. Kept as a faithful mirror
// on purpose: this is real money movement, and any drift between the two
// implementations is exactly the kind of thing that causes bugs.
//
// Used for two narrow, explicit purposes, both mirroring an existing
// no-further-approval-needed bot action exactly: an instant Deposit
// withdrawal initiated by the account owner themselves (no approval step,
// same as the bot's own instant Deposit withdrawal rule), and an admin's
// approval of an already-pending Savings withdrawal request (the approval
// decision itself still requires the owner - this only skips the ~60s
// wait for the bot to carry out a decision that's already been made).

const DC_ECONOMY_BASE = "https://api.democracycraft.net/economy/api/v1";
const DC_FIRM_NAME = "PoyEnterprises"; // not secret - same value as bot.py's DC_FIRM_NAME

class TreasuryAPIError extends Error {}

async function treasuryFetch(token, path, { method = "GET", params, body, idempotencyKey } = {}) {
  const url = new URL(`${DC_ECONOMY_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (e) {
    throw new TreasuryAPIError(`Network error reaching Treasury API: ${e}`);
  }
  return res;
}

// Returns { success, error, txn }. Never throws - all failure modes are
// reported back for the caller to decide what to tell the client.
export async function executeTreasuryPayout(token, ign, amount, idempotencyKey, memo) {
  let accountRes;
  try {
    accountRes = await treasuryFetch(token, "/accounts/by-player", { params: { name: ign } });
  } catch (e) {
    return { success: false, error: String(e), ambiguous: false };
  }
  if (accountRes.status === 404) {
    return { success: false, error: `Could not find a DemocracyCraft account for ${ign}.`, ambiguous: false };
  }
  if (!accountRes.ok) {
    const body = await accountRes.text().catch(() => "");
    return { success: false, error: `Treasury API error looking up player: ${accountRes.status} ${body.slice(0, 200)}`, ambiguous: false };
  }

  let firmRes;
  try {
    firmRes = await treasuryFetch(token, `/firms/${encodeURIComponent(DC_FIRM_NAME)}`);
  } catch (e) {
    return { success: false, error: String(e), ambiguous: false };
  }
  if (!firmRes.ok) {
    const body = await firmRes.text().catch(() => "");
    return { success: false, error: `Treasury API error looking up firm: ${firmRes.status} ${body.slice(0, 200)}`, ambiguous: false };
  }
  const firmInfo = await firmRes.json();
  const fromAccountId = firmInfo.defaultAccountId;
  if (!fromAccountId) {
    return { success: false, error: "Could not determine the firm's source account (defaultAccountId missing).", ambiguous: false };
  }

  let transferRes;
  try {
    transferRes = await treasuryFetch(token, "/transfers/to-player", {
      method: "POST",
      idempotencyKey,
      body: { fromAccountId, toPlayerName: ign, amount: String(amount), memo },
    });
  } catch (e) {
    // Couldn't confirm whether Treasury actually processed this before the
    // network call failed - never safe to assume "no" here, so this is
    // flagged distinctly from a clean rejection (see submit.js).
    return { success: false, error: String(e), ambiguous: true };
  }
  if (transferRes.status !== 200 && transferRes.status !== 201) {
    const body = await transferRes.text().catch(() => "");
    // A clean HTTP error response means Treasury definitely did NOT apply
    // the transfer (it round-tripped and said no) - safe to treat as a
    // clean failure, not ambiguous.
    return { success: false, error: `Transfer failed: ${transferRes.status} ${body.slice(0, 200)}`, ambiguous: false };
  }

  const txn = await transferRes.json().catch(() => null);
  return { success: true, txn };
}
