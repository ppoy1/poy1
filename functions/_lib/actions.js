// Shared helpers for the "pending_actions" queue. This is how the website
// asks the bot to actually do something (withdraw, claim a deposit) without
// the bot ever accepting an inbound connection: the client's browser writes
// a request here, and the bot polls this same queue on its own schedule and
// processes requests locally using its own secrets/API access.

const KV_KEY = "pending_actions";
const VALID_TYPES = ["withdraw_deposit", "withdraw_savings", "claim_deposit"];
const VALID_CLAIM_ACCOUNT_TYPES = ["Deposit", "Savings", "Loan"];

export async function readPendingActions(kv) {
  const raw = await kv.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writePendingActions(kv, actions) {
  await kv.put(KV_KEY, JSON.stringify(actions));
}

export function validateActionSubmission(body) {
  if (!body || typeof body !== "object") return "body must be a JSON object";
  if (!VALID_TYPES.includes(body.type)) {
    return `type must be one of: ${VALID_TYPES.join(", ")}`;
  }
  if (body.type === "withdraw_deposit" || body.type === "withdraw_savings") {
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
