// Site-wide maintenance switch - runs before every route. While this file
// exists, the whole site (pages and API alike) returns 503 instead of doing
// anything else. Remove this file and redeploy to bring the site back.
export async function onRequest() {
  return new Response(
    `<!doctype html><html><head><meta charset="UTF-8" /><title>Poy Enterprises - Temporarily Offline</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="font-family:system-ui,sans-serif;background:#05070d;color:#eef2fc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px">
      <div>
        <h1 style="margin:0 0 8px">Poy Enterprises Banking is temporarily offline</h1>
        <p style="color:#8993b8">We're doing maintenance. Please check back shortly.</p>
      </div>
    </body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=UTF-8", "Retry-After": "300" } }
  );
}
