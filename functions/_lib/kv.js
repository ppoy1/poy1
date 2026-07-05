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
