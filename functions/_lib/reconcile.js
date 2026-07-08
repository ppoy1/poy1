// Shared helpers for the "processed_withdrawals" queue - NOT a request for
// the bot to do something (unlike pending_actions/admin_pending_actions),
// but a record of something the website ALREADY did directly against the
// real Treasury API. The bot polls this to bring its own local bookkeeping
// (client_accounts.json) in line with money that has already moved, so its
// balances, history, and interest math all stay correct - it must never
// call the Treasury API again for these, only update its own records.

const KV_KEY = "processed_withdrawals";

export async function readProcessedWithdrawals(kv) {
  const raw = await kv.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeProcessedWithdrawals(kv, entries) {
  await kv.put(KV_KEY, JSON.stringify(entries));
}

export async function recordProcessedWithdrawal(kv, { ign, amount, discord_id, txn }) {
  const entries = await readProcessedWithdrawals(kv);
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const entry = {
    id,
    ign,
    amount: String(amount),
    discord_id,
    txn: txn ?? null,
    created_at: new Date().toISOString(),
  };
  entries.push(entry);
  await writeProcessedWithdrawals(kv, entries);
  return entry;
}

export async function ackProcessedWithdrawals(kv, ids) {
  const entries = await readProcessedWithdrawals(kv);
  const idSet = new Set(ids);
  const remaining = entries.filter((e) => !idSet.has(e.id));
  await writeProcessedWithdrawals(kv, remaining);
  return remaining.length;
}
