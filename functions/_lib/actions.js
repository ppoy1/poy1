// Shared helpers for the "pending_actions" queue. This is how the website
// asks the bot to actually do something (withdraw, claim a deposit) without
// the bot ever accepting an inbound connection: the client's browser writes
// a request here, and the bot polls this same queue on its own schedule and
// processes requests locally using its own secrets/API access.

const KV_KEY = "pending_actions";
const VALID_TYPES = [
  "withdraw_deposit",
  "withdraw_savings",
  "claim_deposit",
];
const VALID_CLAIM_ACCOUNT_TYPES = ["Deposit", "Savings", "Loan"];
const AMOUNT_REQUIRED_TYPES = ["withdraw_deposit", "withdraw_savings"];

export async function readPendingActions(kv) {
  const raw = await kv.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

// One in-flight request per client at a time - stops someone from
// stacking up multiple withdrawals/claims (by mashing the button or
// calling the API directly, bypassing the frontend's own disable-while-
// submitting guard) before the bot has processed the first one.
export async function hasPendingAction(kv, discordId) {
  const actions = await readPendingActions(kv);
  return actions.some((a) => a.discord_id === discordId);
}

// Separate from hasPendingAction - that only blocks a second withdrawal
// while the first is still queued/unprocessed. This blocks rapid-fire
// withdrawals even once each one has already gone through, so a client
// can submit at most one every 2 minutes no matter how fast the bot
// processes them. Shared across withdraw_deposit and withdraw_savings
// (one cooldown per client, not per account type).
const WITHDRAWAL_COOLDOWN_SECONDS = 120;

export async function secondsUntilWithdrawalAllowed(kv, discordId) {
  const lastIso = await kv.get(`withdrawal_cooldown:${discordId}`);
  if (!lastIso) return 0;
  const elapsedMs = Date.now() - new Date(lastIso).getTime();
  const remaining = WITHDRAWAL_COOLDOWN_SECONDS - Math.floor(elapsedMs / 1000);
  return remaining > 0 ? remaining : 0;
}

export async function recordWithdrawalTime(kv, discordId) {
  await kv.put(`withdrawal_cooldown:${discordId}`, new Date().toISOString(), {
    expirationTtl: WITHDRAWAL_COOLDOWN_SECONDS,
  });
}

async function writePendingActions(kv, actions) {
  await kv.put(KV_KEY, JSON.stringify(actions));
}

export function validateActionSubmission(body) {
  if (!body || typeof body !== "object") return "body must be a JSON object";
  if (!VALID_TYPES.includes(body.type)) {
    return `type must be one of: ${VALID_TYPES.join(", ")}`;
  }
  if (AMOUNT_REQUIRED_TYPES.includes(body.type)) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "amount must be a positive number";
    }
  }
  if (body.type === "claim_deposit") {
    if (!VALID_CLAIM_ACCOUNT_TYPES.includes(body.account_type)) {
      return `account_type must be one of: ${VALID_CLAIM_ACCOUNT_TYPES.join(", ")}`;
    }
  }
  return null;
}

export async function enqueueAction(kv, { type, discord_id, ign, amount, account_type }) {
  const actions = await readPendingActions(kv);
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const entry = {
    id,
    type,
    discord_id,
    ign,
    created_at: new Date().toISOString(),
    status: "pending",
  };
  if (amount !== undefined) entry.amount = String(amount);
  if (account_type !== undefined) entry.account_type = account_type;
  actions.push(entry);
  await writePendingActions(kv, actions);
  return entry;
}

// Removes acked entries (by id) from the pending list - called by the bot
// once it has processed them (success or failure; the bot's own Discord
// notifications / staff channel posts carry the outcome, this queue is
// intentionally not a full audit trail).
export async function ackActions(kv, ids) {
  const actions = await readPendingActions(kv);
  const idSet = new Set(ids);
  const remaining = actions.filter((a) => !idSet.has(a.id));
  await writePendingActions(kv, remaining);
  return remaining.length;
}
