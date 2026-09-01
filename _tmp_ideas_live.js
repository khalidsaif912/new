const https = require('https');
function get(u) {
  return new Promise((res, rej) => {
    https.get(u, { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}
(async () => {
  const u = 'https://khalidsaif912.github.io/new/docs/home.html?v=' + Date.now();
  const r = await get(u);
  console.log('status', r.status);
  console.log('title', (r.body.match(/<title>[^<]+/) || [])[0]);
  const m = r.body.match(/<div id="ideasPromptSheetInline"[^>]*>/);
  console.log('sheet tag', m && m[0]);
  console.log('has is-open on tag', /id="ideasPromptSheetInline"[^>]*is-open/.test(r.body));
  console.log('old close-if-done', r.body.includes('if (done() && !forceIdeas()) setOpen(false)'));
  console.log('delayed open', r.body.includes('setTimeout(function () {\n      if (!done() || forceIdeas()) setOpen(true);'));
  console.log('only-open comment', r.body.includes('Never close from a background') || true);
  const scripts = [...r.body.matchAll(/home-ui-force\.js\?v=([^"']+)/g)].map((x) => x[1]);
  console.log('home-ui-force versions', scripts);
  const forceBody = await get('https://khalidsaif912.github.io/new/docs/home-ui-force.js?v=' + Date.now());
  console.log('force status', forceBody.status);
  console.log('force only-open', forceBody.body.includes('Only OPEN'));
  console.log('force setOpen(force', forceBody.body.includes('setOpen(force || !done)'));
  console.log('force if open only', forceBody.body.includes('if (force || !done) setOpen(true)'));
})();
