// Minimal hand-rolled shape validation for the snapshot the bot pushes to
// /api/sync. This is defense-in-depth (the bearer secret is the real gate) -
// it exists so a bug in the bot's payload construction fails loudly with a
// 400 instead of silently corrupting the site's only data source.

export function getSnapshotShapeErrors(body) {
  const errors = [];
  if (!body || typeof body !== "object") {
    return ["body must be a JSON object"];
  }
  if (typeof body.synced_at !== "string") errors.push("synced_at must be a string");
  if (typeof body.account_links !== "object" || body.account_links === null) {
    errors.push("account_links must be an object");
  }
  if (typeof body.clients !== "object" || body.clients === null) {
    errors.push("clients must be an object");
  }
  if (!Array.isArray(body.loans)) errors.push("loans must be an array");
  if (!Array.isArray(body.pending_withdrawals)) errors.push("pending_withdrawals must be an array");
  if (typeof body.summary !== "object" || body.summary === null) {
    errors.push("summary must be an object");
  }
  return errors;
}

export async function readSnapshot(kv) {
  const raw = await kv.get("snapshot");
  return raw ? JSON.parse(raw) : null;
}

// Same account_links reverse-index lookup already inlined at the OAuth
// callback and account/status - pulled out here so other features (like
// Ventures) can resolve a poster's Minecraft IGN without duplicating it.
export function ignForDiscordId(snapshot, discordId) {
  return snapshot?.account_links?.[discordId] || null;
}

// Applies an immediate, optimistic adjustment to the cached snapshot's
// balance for one client, so the portal reflects a submitted action right
// away instead of waiting for the bot's next sync (~60s after it actually
// processes the action). This is a display convenience only - the bot's
// own local files remain the sole source of truth, and its next snapshot
// push overwrites this with the real, authoritative number regardless.
// Only ever called for action types where the effect on the balance is
// fully known at submission time (no owner approval gate, no external fact
// like an in-game payment still needing to be matched).
export async function applyOptimisticBalanceDelta(kv, ign, { depositDelta = 0, savingsDelta = 0 }) {
  const snapshot = await readSnapshot(kv);
  const ignLower = (ign || "").toLowerCase();
  const client = snapshot?.clients?.[ignLower];
  if (!client) return null;

  const newDeposit = (parseFloat(client.deposit_balance) || 0) + depositDelta;
  const newSavings = (parseFloat(client.savings_balance) || 0) + savingsDelta;
  client.deposit_balance = newDeposit.toFixed(2);
  client.savings_balance = newSavings.toFixed(2);

  await kv.put("snapshot", JSON.stringify(snapshot));
  return { deposit_balance: client.deposit_balance, savings_balance: client.savings_balance };
}
