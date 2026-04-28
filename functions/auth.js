// Cloudflare Pages Function for /auth — initial OAuth redirect to GitHub
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
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
