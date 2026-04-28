// Cloudflare Pages Function — GitHub OAuth proxy for Decap CMS
//
// Routes:
//   GET /auth?provider=github&site_id=...&scope=repo
//        → redirects user to GitHub OAuth authorize
//   GET /auth/callback?code=...&state=...
//        → exchanges code for access token, sends postMessage to opener,
//          closes the popup. Decap reads the token from the message.
//
// Env vars (set on the Cloudflare Pages project):
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Decap initial auth: /auth?provider=github&...
  if (path === '/auth' || path === '/auth/') {
    const provider = url.searchParams.get('provider') || 'github';
    if (provider !== 'github') {
      return new Response('Unsupported provider: ' + provider, { status: 400 });
    }
    const scope = url.searchParams.get('scope') || 'repo,user';
    const githubAuth = new URL('https://github.com/login/oauth/authorize');
    githubAuth.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    githubAuth.searchParams.set('scope', scope);
    githubAuth.searchParams.set('redirect_uri', `${url.origin}/auth/callback`);
    return Response.redirect(githubAuth.toString(), 302);
  }

  // GitHub OAuth callback: /auth/callback?code=...
  if (path === '/auth/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      return htmlPostMessage(false, { provider: 'github', error: 'No code in callback' });
    }
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'sexi-admin-auth-proxy',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return htmlPostMessage(false, {
          provider: 'github',
          error: tokenData.error_description || tokenData.error || 'Token exchange failed',
        });
      }
      return htmlPostMessage(true, { provider: 'github', token: tokenData.access_token });
    } catch (e) {
      return htmlPostMessage(false, { provider: 'github', error: String(e) });
    }
  }

  return new Response('Not found', { status: 404 });
}

// Render the popup HTML that posts the auth result back to Decap (the opener)
// using Decap's expected protocol:
//   "authorization:github:success:{...}"  or  "authorization:github:error:{...}"
// Decap kicks off a handshake by sending "authorizing:github" — we wait for
// that, then reply with the actual payload.
function htmlPostMessage(ok, payload) {
  const status = ok ? 'success' : 'error';
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  // JSON-encode the message string so it's safe to embed in JS
  const messageJson = JSON.stringify(message);

  const titleText = ok ? 'Autenticación completa' : 'Autenticación fallida';
  const bodyText = ok
    ? 'Listo. Esta ventana se cerrará automáticamente.'
    : 'Algo salió mal. Cierra esta ventana e inténtalo de nuevo.';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>sexí · admin · auth</title>
  <style>
    html, body { margin: 0; padding: 0; background: #000; color: #fff;
      font-family: 'Helvetica Rounded Bold', Helvetica, Arial, sans-serif;
      letter-spacing: -0.015em; min-height: 100vh; }
    .wrap { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
    .card { text-align:center; max-width:420px; }
    h1 { font-size: 24px; letter-spacing:-0.04em; margin: 0 0 8px; color: #FF1A8C; text-transform:lowercase; }
    p { color:#aaa; font-size: 13px; margin: 0; line-height: 1.5; }
    .err { color: #ff6b6b; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${titleText.toLowerCase()}</h1>
      <p class="${ok ? '' : 'err'}">${bodyText}</p>
    </div>
  </div>
  <script>
    (function () {
      var msg = ${messageJson};
      function send() {
        try {
          if (window.opener) window.opener.postMessage(msg, '*');
        } catch (_) {}
      }
      // Decap kicks off with "authorizing:github" — reply when received
      window.addEventListener('message', function (ev) {
        if (ev.data === 'authorizing:github') send();
      }, false);
      // Also fire-and-forget: Decap usually accepts the reply either way
      send();
      // Close the popup after a short window
      setTimeout(function () { try { window.close(); } catch (_) {} }, 1200);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
