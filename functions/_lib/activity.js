// Lightweight "who's actually using the site" tracker for the admin
// Overview tab - not a security or money-moving concern, just a UI metric,
// so this deliberately skips any locking: an occasional lost update under
// concurrent requests just means one visit doesn't register, and the same
// client's next request seconds later corrects it. Not worth the
// complexity given the stakes here.

const KV_KEY = "activity_log";
const ACTIVE_NOW_WINDOW_MS = 5 * 60 * 1000;
const ACTIVE_TODAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_USERS = 500; // safety cap so a very old log can't grow unbounded

export async function recordActivity(kv, discordId) {
  if (!discordId) return;
  const raw = await kv.get(KV_KEY);
  const log = raw ? JSON.parse(raw) : {};
  log[discordId] = new Date().toISOString();

  const entries = Object.entries(log);
  if (entries.length > MAX_TRACKED_USERS) {
    // Drop the oldest entries first - keeps the log bounded without ever
    // dropping someone who's actually still recently active.
    entries.sort((a, b) => a[1].localeCompare(b[1]));
    const trimmed = Object.fromEntries(entries.slice(entries.length - MAX_TRACKED_USERS));
    await kv.put(KV_KEY, JSON.stringify(trimmed));
  } else {
    await kv.put(KV_KEY, JSON.stringify(log));
  }
}

export async function getActivityCounts(kv) {
  const raw = await kv.get(KV_KEY);
  const log = raw ? JSON.parse(raw) : {};
  const now = Date.now();
  let activeNow = 0;
  let activeToday = 0;
  for (const iso of Object.values(log)) {
    const seenAt = new Date(iso).getTime();
    if (Number.isNaN(seenAt)) continue;
    const age = now - seenAt;
    if (age <= ACTIVE_NOW_WINDOW_MS) activeNow++;
    if (age <= ACTIVE_TODAY_WINDOW_MS) activeToday++;
  }
  return { active_now: activeNow, active_today: activeToday };
}
