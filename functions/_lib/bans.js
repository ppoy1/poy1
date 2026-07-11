// Shared helpers for the website's own account-ban list. Separate from
// anything Discord-side (a Discord ban/kick is unrelated) - this only
// blocks a Discord account from getting a new session (checked at OAuth
// login) or using an already-issued one (checked again at the key
// portal/action endpoints, since sessions can live up to 7 days).

const KV_KEY = "banned_accounts";

export async function readBans(kv) {
  const raw = await kv.get(KV_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function isBanned(kv, discordId) {
  const bans = await readBans(kv);
  return !!bans[discordId];
}

export async function banAccount(kv, discordId, { reason, banned_by } = {}) {
  const bans = await readBans(kv);
  bans[discordId] = {
    reason: reason || "",
    banned_by: banned_by || "",
    banned_at: new Date().toISOString(),
  };
  await kv.put(KV_KEY, JSON.stringify(bans));
}

export async function unbanAccount(kv, discordId) {
  const bans = await readBans(kv);
  delete bans[discordId];
  await kv.put(KV_KEY, JSON.stringify(bans));
}
