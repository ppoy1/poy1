// GET /api/portal/data - returns only the logged-in client's own slice of
// the synced snapshot: their account balances and their loans.

import { verifySession } from "../../_lib/session.js";
import { readSnapshot } from "../../_lib/kv.js";

export async function onRequestGet({ request, env }) {
  const session = await verifySession(env.SESSION_SECRET, request.headers.get("Cookie"));
  if (!session || (session.role !== "client" && session.role !== "admin") || !session.ign) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const snapshot = await readSnapshot(env.POYBANK_KV);
  if (!snapshot) {
    return Response.json({ error: "No data synced yet - try again shortly" }, { status: 503 });
  }

  const ignLower = session.ign.toLowerCase();
  const account = snapshot.clients[ignLower] || {
    display_name: session.ign,
    deposit_balance: "0",
    savings_balance: "0",
    history: [],
  };
  const loans = (snapshot.loans || []).filter(
    (l) => (l.minecraft_ign || "").toLowerCase() === ignLower
  );

  return Response.json({
    ign: session.ign,
    account,
    loans,
    synced_at: snapshot.synced_at,
    is_admin: session.role === "admin",
  });
}
