const https = require('https');
function get(u) {
  return new Promise((res, rej) => {
    https.get(u, { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res({ status: r.statusCode, body: d, headers: r.headers }));
    }).on('error', rej);
  });
}
(async () => {
  const u = 'https://khalidsaif912.github.io/new/docs/home.html?v=' + Date.now();
  const r = await get(u);
  console.log('status', r.status);
  console.log('title', (r.body.match(/<title>[^<]+/) || [])[0]);
  const sheet = (r.body.match(/id="ideasPromptSheetInline"[^>]*>/) || [])[0];
  console.log('sheet', sheet);
  console.log('DONE_KEY v7', r.body.includes('rosterIdeasDoneV7'));
  console.log('forceHide', r.body.includes('function forceHide'));
  console.log('tryOpen', r.body.includes('function tryOpen'));
  console.log('home-ui', (r.body.match(/home-ui-force\.js\?v=([^"']+)/) || [])[1]);
  // Extract ideas IIFE snippet for sanity
  const i = r.body.indexOf('window.__rosterIdeasPromptBooted');
  console.log('booted idx', i);
  console.log('shouldShow block', r.body.includes('if (done()) return false'));
  console.log('legacy v6 gate', r.body.includes("localStorage.getItem('rosterIdeasDoneV6')"));
  const forceJs = await get('https://khalidsaif912.github.io/new/docs/home-ui-force.js?v=' + Date.now());
  console.log('force ideas code gone', !forceJs.body.includes('ensureIdeas'));
  console.log('force ideas setOpen', forceJs.body.includes('function setOpen'));
})().catch((e) => console.error(e));
