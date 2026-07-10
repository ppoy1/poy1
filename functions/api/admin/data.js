// GET /api/admin/data - the full synced snapshot, unfiltered. Owner-only.

import { verifySession } from "../../_lib/session.js";
import { readSnapshot } from "../../_lib/kv.js";
import { getActivityCounts } from "../../_lib/activity.js";

export async function onRequestGet({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const snapshot = await readSnapshot(env.POYBANK_KV);
  if (!snapshot) {
    return Response.json({ error: "No data synced yet - try again shortly" }, { status: 503 });
  }

  const activity = await getActivityCounts(env.POYBANK_KV);
  const admin_avatar_url = session.avatar
    ? `https://cdn.discordapp.com/avatars/${session.discord_id}/${session.avatar}.png?size=64`
    : null;

  // Redundant with the role check above today (only the owner ever gets
  // role "admin"), but explicit here so admin.js can gate owner-only UI
  // (like deleting any Ventures post) on a clear signal rather than
  // implicitly relying on "this whole page is admin-only" forever.
  return Response.json({ ...snapshot, admin_username: session.username || "Owner", admin_avatar_url, activity, is_owner: true });
}
