// Shared helpers for the "pending_account_openings" queue - a self-serve
// website signup (claimed Minecraft IGN + ToS agreement) waiting on the
// bot to verify it. Verification requires a real, fresh in-game payment
// from the claimed IGN to the firm (settled after requested_at) - this is
// deliberately NOT just "trust whatever IGN they typed" (unlike the
// Discord /create-tos and self-serve OpenAccountModal flows, which do
// trust the typed IGN outright) - the payment is what actually proves the
// website user controls that Minecraft account, since only its real owner
// can send money from it in-game.

const KV_KEY = "pending_account_openings";

export async function readPendingAccountOpenings(kv) {
  const raw = await kv.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writePendingAccountOpenings(kv, entries) {
  await kv.put(KV_KEY, JSON.stringify(entries));
}

export async function findPendingAccountOpening(kv, discordId) {
  const entries = await readPendingAccountOpenings(kv);
  return entries.find((e) => e.discord_id === discordId) || null;
}

export async function enqueueAccountOpening(kv, { discord_id, discord_username, minecraft_ign }) {
  const entries = await readPendingAccountOpenings(kv);
  // One pending attempt per Discord account at a time - resubmitting just
  // replaces the old attempt (e.g. they mistyped their IGN) rather than
  // piling up duplicates the bot would otherwise check redundantly.
  const remaining = entries.filter((e) => e.discord_id !== discord_id);
  const entry = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    discord_id,
    discord_username,
    minecraft_ign,
    requested_at: new Date().toISOString(),
  };
  remaining.push(entry);
  await writePendingAccountOpenings(kv, remaining);
  return entry;
}

export async function ackAccountOpenings(kv, ids) {
  const entries = await readPendingAccountOpenings(kv);
  const idSet = new Set(ids);
  const remaining = entries.filter((e) => !idSet.has(e.id));
  await writePendingAccountOpenings(kv, remaining);
  return remaining.length;
}
