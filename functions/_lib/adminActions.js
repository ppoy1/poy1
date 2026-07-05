// Shared helpers for the "admin_pending_actions" queue - the owner-only
// counterpart to _lib/actions.js. Kept as a completely separate queue (and
// a separate, admin-only-gated submit endpoint) so a client-role session
// can never reach an owner action, even in principle.

const KV_KEY = "admin_pending_actions";
const VALID_TYPES = ["accept_savings_withdrawal", "deny_savings_withdrawal"];

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
  const requestId = Number(body.request_id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return "request_id must be a positive integer";
  }
  return null;
}

export async function enqueueAdminAction(kv, { type, request_id, admin_discord_id }) {
  const actions = await readPendingAdminActions(kv);
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const entry = {
    id,
    type,
    request_id: Number(request_id),
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
