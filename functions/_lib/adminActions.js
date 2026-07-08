// Shared helpers for the "admin_pending_actions" queue - the owner-only
// counterpart to _lib/actions.js. Kept as a completely separate queue (and
// a separate, admin-only-gated submit endpoint) so a client-role session
// can never reach an owner action, even in principle.

const KV_KEY = "admin_pending_actions";
const VALID_TYPES = [
  "accept_savings_withdrawal",
  "deny_savings_withdrawal",
  "add_loan_entry",
  "remove_loan",
  "add_late_fine",
  "loan_change",
];

export async function readPendingAdminActions(kv) {
  const raw = await kv.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writePendingAdminActions(kv, actions) {
  await kv.put(KV_KEY, JSON.stringify(actions));
}

export function validateAdminActionSubmission(body) {
  if (!body || typeof body !== "object") return "body must be a JSON object";
  if (!VALID_TYPES.includes(body.type)) {
    return `type must be one of: ${VALID_TYPES.join(", ")}`;
  }

  if (body.type === "accept_savings_withdrawal" || body.type === "deny_savings_withdrawal") {
    const requestId = Number(body.request_id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return "request_id must be a positive integer";
    }
    return null;
  }

  // The remaining loan-management types all key on the borrower's IGN
  // (not a Discord user/ID) - the website has no live Discord member list
  // to pick from, and every loan ledger entry already carries minecraft_ign.
  if (!body.minecraft_ign || typeof body.minecraft_ign !== "string") {
    return "minecraft_ign is required";
  }

  if (body.type === "add_loan_entry") {
    if (!body.borrower_name || typeof body.borrower_name !== "string") return "borrower_name is required";
    if (!(Number(body.amount) > 0)) return "amount must be greater than 0";
    if (!(Number(body.weekly_payment) > 0)) return "weekly_payment must be greater than 0";
    if (!body.payday || typeof body.payday !== "string") return "payday is required";
  } else if (body.type === "add_late_fine") {
    if (!(Number(body.late_days) > 0)) return "late_days must be greater than 0";
  } else if (body.type === "loan_change") {
    if (!(Number(body.new_total_owed) > 0)) return "new_total_owed must be greater than 0";
  }
  // remove_loan needs nothing beyond minecraft_ign, already checked above.
  return null;
}

export async function enqueueAdminAction(kv, { admin_discord_id, ...payload }) {
  const actions = await readPendingAdminActions(kv);
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const entry = {
    id,
    ...payload,
    admin_discord_id,
    created_at: new Date().toISOString(),
  };
  actions.push(entry);
  await writePendingAdminActions(kv, actions);
  return entry;
}

export async function ackAdminActions(kv, ids) {
  const actions = await readPendingAdminActions(kv);
  const idSet = new Set(ids);
  const remaining = actions.filter((a) => !idSet.has(a.id));
  await writePendingAdminActions(kv, remaining);
  return remaining.length;
}
