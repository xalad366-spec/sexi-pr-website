// Cloudflare Pages Function for /auth/callback
// Implements Decap CMS OAuth handshake correctly:
//   popup → opener: "authorizing:github"
//   opener → popup: "authorizing:github" (ack)
//   popup → opener: "authorization:github:success:{token,provider}"

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
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

function htmlPostMessage(ok, payload) {
  const status = ok ? 'success' : 'error';
  const finalMsg = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const finalMsgJson = JSON.stringify(finalMsg);
  const titleText = ok ? 'autenticacion completa' : 'autenticacion fallida';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>sexi admin auth</title>
<style>
html,body{margin:0;padding:0;background:#000;color:#fff;
font-family:'Helvetica Rounded Bold',Helvetica,Arial,sans-serif;letter-spacing:-0.015em;min-height:100vh}
.wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{text-align:center;max-width:420px}
h1{font-size:24px;letter-spacing:-0.04em;margin:0 0 8px;color:#FF1A8C;text-transform:lowercase}
p{color:#aaa;font-size:13px;margin:0;line-height:1.5}
.log{margin-top:18px;font-family:monospace;font-size:11px;color:#666;text-align:left;
background:#0d0d0d;padding:10px;border-radius:6px;max-height:200px;overflow:auto}
</style></head>
<body><div class="wrap"><div class="card">
<h1>${titleText}</h1>
<p>Sincronizando con el panel...</p>
<div class="log" id="log"></div>
</div></div>
<script>
(function(){
  var FINAL_MSG = ${finalMsgJson};
  var logEl = document.getElementById('log');
  function log(s){ try{ logEl.textContent += s + '\\n'; }catch(_){} }

  if (!window.opener) {
    log('ERROR: no window.opener — abre este flujo desde el admin.');
    return;
  }

  // Decap handshake protocol:
  //  1) popup tells opener "authorizing:github"
  //  2) opener echoes "authorizing:github" back as ack
  //  3) popup sends final auth message
  var sentFinal = false;

  function sendFinal() {
    if (sentFinal) return;
    sentFinal = true;
    try { window.opener.postMessage(FINAL_MSG, '*'); log('-> sent final auth msg'); } catch(e) { log('postMessage error: ' + e); }
  }

  window.addEventListener('message', function(ev){
    log('<- ' + (typeof ev.data === 'string' ? ev.data.slice(0, 80) : '[non-string]'));
    if (ev.data === 'authorizing:github') {
      sendFinal();
    }
  }, false);

  // Initiate the handshake
  try {
    window.opener.postMessage('authorizing:github', '*');
    log('-> sent authorizing:github (handshake init)');
  } catch(e) { log('init error: ' + e); }

  // Re-init every 300ms in case Decap's listener wasn't ready on first try.
  // Stop after final is sent or 6 seconds elapsed.
  var attempts = 0;
  var iv = setInterval(function(){
    attempts++;
    if (sentFinal || attempts > 20) { clearInterval(iv); return; }
    try { window.opener.postMessage('authorizing:github', '*'); } catch(_){}
  }, 300);

  // Close after 4 seconds — long enough for the handshake on slow networks
  setTimeout(function(){
    try { window.close(); } catch(_){}
  }, 4000);
})();
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
