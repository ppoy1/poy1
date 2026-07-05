// GET /auth/discord/callback - Discord redirects here with a `code`. We
// exchange it server-side (the Client Secret never reaches the browser),
// look up the linked Minecraft IGN from the bot's synced account_links,
// and set a signed session cookie.

import { createSessionCookie } from "../../_lib/session.js";
import { readSnapshot } from "../../_lib/kv.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
  });
  if (!tokenResp.ok) {
    const detail = await tokenResp.text();
    return new Response(`Discord token exchange failed: ${detail}`, { status: 502 });
  }
  const { access_token } = await tokenResp.json();

  const userResp = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userResp.ok) {
    return new Response("Discord user lookup failed", { status: 502 });
  }
  const discordUser = await userResp.json();

  const snapshot = await readSnapshot(env.POYBANK_KV);
  const ign = snapshot?.account_links?.[discordUser.id];

  if (env.OWNER_DISCORD_ID && discordUser.id === env.OWNER_DISCORD_ID) {
    const cookie = await createSessionCookie(
      env.SESSION_SECRET,
      { role: "admin", discord_id: discordUser.id, username: discordUser.username, ign: ign || null },
      60 * 60 * 24 * 7 // 7 days
    );
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin.html", "Set-Cookie": cookie },
    });
  }

  if (!ign) {
    const dest = new URL("/not-linked.html", request.url);
    dest.searchParams.set("discord_id", discordUser.id);
    dest.searchParams.set("discord_username", discordUser.username || "");
    return Response.redirect(dest, 302);
  }

  const cookie = await createSessionCookie(
    env.SESSION_SECRET,
    { role: "client", discord_id: discordUser.id, ign },
    60 * 60 * 24 * 7 // 7 days
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/portal.html",
      "Set-Cookie": cookie,
    },
  });
}
