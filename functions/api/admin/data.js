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

  return Response.json({ ...snapshot, admin_username: session.username || "Owner", activity });
}
