// Shared helpers for the "pending_account_openings" queue - a self-serve
// website signup (ToS agreement only) waiting on the bot to verify it and
// discover who submitted it. No Minecraft IGN is collected at signup time
// at all - self-reporting one would be exactly the impersonation risk this
// flow exists to close (anyone could type a real player's name with zero
// proof). Instead, the bot watches for an in-game payment of a specific,
// randomly-assigned small amount settled after requested_at, and whoever
// that payment actually came from becomes the linked identity.
//
// A fresh payment of ANY amount wouldn't be enough on its own: an unrelated
// real payment could coincidentally arrive while a claim is pending, and
// "any fresh payment" would wrongly treat that coincidence as proof of
// identity. Requiring an exact match against a specific, randomly-assigned
// amount (nobody would coincidentally send $1.84 for an unrelated reason)
// closes that - only someone actually seeing this specific prompt and
// deliberately sending that amount will ever satisfy it. See bot.py's
// find_fresh_deposit_by_amount and _is_verification_amount_ambiguous for
// the matching and cross-pool collision-safety logic.

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

export async function enqueueAccountOpening(kv, { discord_id, discord_username }) {
  const entries = await readPendingAccountOpenings(kv);
  // One pending attempt per Discord account at a time - resubmitting just
  // replaces the old attempt rather than piling up duplicates the bot
  // would otherwise check redundantly. Also means a resubmission gets a
  // fresh random amount, which is fine - the old one simply stops being
  // checked for.
  const remaining = entries.filter((e) => e.discord_id !== discord_id);
  // $1.00-$1.98 in whole cents - small enough to be a trivial ask, specific
  // enough that a coincidental unrelated payment matching it is
  // vanishingly unlikely.
  const verification_amount = (1 + Math.floor(Math.random() * 99) / 100).toFixed(2);
  const entry = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    discord_id,
    discord_username,
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
