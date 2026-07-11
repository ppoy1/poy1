// POST /api/admin/ban-account - ban or unban a Discord account from the
// website. Callable either by the owner's admin session (banning by hand
// from the dashboard) or by the bot itself via WEBSITE_SYNC_SECRET (so
// /close-account on Discord can propagate a ban without needing a browser
// session at all).

import { verifySession } from "../../_lib/session.js";
import { banAccount, unbanAccount } from "../../_lib/bans.js";

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const isBotSync = env.WEBSITE_SYNC_SECRET && authHeader === `Bearer ${env.WEBSITE_SYNC_SECRET}`;

  if (!isBotSync) {
    const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
    if (!session || session.role !== "admin") {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const discordId = String(body.discord_id || "");
  if (!discordId) {
    return Response.json({ error: "discord_id is required" }, { status: 400 });
  }

  if (body.action === "unban") {
    await unbanAccount(env.POYBANK_KV, discordId);
    return Response.json({ ok: true, banned: false });
  }

  await banAccount(env.POYBANK_KV, discordId, {
    reason: body.reason || "",
    banned_by: isBotSync ? "bot" : "admin",
  });
  return Response.json({ ok: true, banned: true });
}
