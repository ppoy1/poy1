// Signed, httpOnly session cookie helpers shared by the client portal
// (role: "client") and the admin dashboard (role: "admin"). Uses Web Crypto
// (crypto.subtle), which is natively available in the Pages Functions
// runtime with no compat flags - unlike Node's `crypto` module.

const encoder = new TextEncoder();

async function getKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export async function createSessionCookie(secret, payload, maxAgeSeconds) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const body = JSON.stringify({ ...payload, exp });
  const bodyB64 = base64url(encoder.encode(body));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyB64));
  const token = `${bodyB64}.${base64url(sig)}`;
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

export async function verifySession(secret, cookieHeader) {
  const match = /(?:^|; )session=([^;]+)/.exec(cookieHeader || "");
  if (!match) return null;
  const [bodyB64, sigB64] = match[1].split(".");
  if (!bodyB64 || !sigB64) return null;

  const key = await getKey(secret);
  let valid;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(sigB64),
      encoder.encode(bodyB64)
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(bodyB64)));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}
