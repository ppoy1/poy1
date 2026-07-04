// GET /auth/discord/login - kicks off the Discord OAuth flow.

export async function onRequestGet({ env }) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.DISCORD_CLIENT_ID,
    scope: "identify",
    redirect_uri: env.DISCORD_REDIRECT_URI,
    prompt: "none",
  });
  return Response.redirect(`https://discord.com/api/oauth2/authorize?${params}`, 302);
}
