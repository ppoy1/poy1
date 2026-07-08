// Shared helpers for the "pending_account_openings" queue - a self-serve
// website signup (claimed Minecraft IGN + ToS agreement) waiting on the
// bot to verify it. Verification requires an in-game payment of a specific,
// randomly-assigned small amount from the claimed IGN to the firm, settled
// after requested_at.
//
// This is NOT just "trust whatever IGN they typed" (unlike the Discord
// /create-tos and self-serve OpenAccountModal flows, which do trust the
// typed IGN outright) - but a fresh payment of ANY amount isn't enough
// either: if someone falsely claims a real player's IGN, and that real
// player happens to send the firm an unrelated, real deposit for their own
// legitimate reasons while the false claim is still pending, "any fresh
// payment" would wrongly treat that coincidence as proof the claimant
// controls the account. Requiring an exact match against a specific,
// randomly-assigned amount (nobody would coincidentally send $1.84 for an
// unrelated reason) closes that - only someone actually seeing this
// specific prompt and deliberately sending that amount will ever satisfy
// it, which requires actually controlling the account.

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
  // piling up duplicates the bot would otherwise check redundantly. Also
  // means a resubmission gets a fresh random amount, which is fine - the
  // old one simply stops being checked for.
  const remaining = entries.filter((e) => e.discord_id !== discord_id);
  // $1.00-$1.98 in whole cents - small enough to be a trivial ask, specific
  // enough that a coincidental unrelated payment matching it is
  // vanishingly unlikely.
  const verification_amount = (1 + Math.floor(Math.random() * 99) / 100).toFixed(2);
  const entry = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    discord_id,
    discord_username,
    minecraft_ign,
    verification_amount,
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
