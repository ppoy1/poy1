// Site-wide maintenance mode. While this file exists, every request to
// every route (static pages and API alike) gets this page instead of
// whatever it would normally return. Delete this file to bring the site
// back online - no other change needed.

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poy Enterprises - Temporarily Unavailable</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f1115;
    color: #e8e8ea;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    text-align: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .card { max-width: 480px; }
  h1 { font-size: 1.4rem; margin-bottom: 12px; }
  p { color: #a3a3ad; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <h1>Temporarily Unavailable</h1>
    <p>The Poy Enterprises website is offline for maintenance until further notice. Your account and balances are unaffected - please use Discord in the meantime.</p>
  </div>
</body>
</html>`;

export async function onRequest() {
  return new Response(MAINTENANCE_HTML, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
