// POST /api/admin/login - single shared-password login for the owner.

import { createSessionCookie } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!env.ADMIN_PASSWORD || body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  const cookie = await createSessionCookie(env.SESSION_SECRET, { role: "admin" }, 60 * 60 * 12); // 12h
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}
