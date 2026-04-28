// Cloudflare Pages Function — dynamic /products.json
// Fetches the live products.json from the GitHub repo on every request,
// so changes saved in the admin appear instantly on the live site.

export async function onRequest({ env, request }) {
  const repo   = env.GITHUB_REPO   || 'xalad366-spec/sexi-pr-website';
  const branch = env.GITHUB_BRANCH || 'main';
  const pat    = env.GITHUB_PAT;

  if (!pat) {
    return jsonError(500, 'Missing GITHUB_PAT env var on the Pages project');
  }

  try {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/products.json?ref=${branch}`;
    const res = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'sexi-pages-fn',
      },
      // Edge cache the GitHub response briefly so we don't hammer the API
      cf: { cacheTtl: 30, cacheEverything: true },
    });

    if (!res.ok) {
      const txt = await res.text();
      return jsonError(res.status, `GitHub fetch failed: ${txt.slice(0, 200)}`);
    }

    const body = await res.text();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Browser caches for 0s — always revalidate at the edge.
        // Edge caches for 30s (set above) so most requests don't hit GitHub.
        'Cache-Control': 'public, max-age=0, s-maxage=30, must-revalidate',
        'X-Source': 'github-live',
      },
    });
  } catch (e) {
    return jsonError(500, `Worker error: ${e.message || e}`);
  }
}

function jsonError(status, message) {
  return new Response(
    JSON.stringify({ products: [], error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
