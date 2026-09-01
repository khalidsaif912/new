const https = require('https');
function get(u) {
  return new Promise((res, rej) => {
    const req = https.get(u, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', 'User-Agent': 'Mozilla/5.0' }
    }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res({ status: r.statusCode, url: u, final: r.headers.location || u, headers: r.headers, body: d, len: d.length }));
    });
    req.on('error', rej);
  });
}
const urls = [
  'https://khalidsaif912.github.io/new/',
  'https://khalidsaif912.github.io/new/docs/',
  'https://khalidsaif912.github.io/new/docs/home.html',
  'https://khalidsaif912.github.io/new/docs/index.html',
  'https://khalidsaif912.github.io/roster-site/',
  'https://khalidsaif912.github.io/roster-site/docs/home.html',
  'https://khalidsaif912.github.io/'
];
(async () => {
  for (const u of urls) {
    try {
      const r = await get(u);
      const title = (r.body.match(/<title>[^<]*/i) || [])[0] || '';
      const hasIdeas = r.body.includes('ideasPromptSheetInline');
      const hasFab = r.body.includes('ideasFab');
      const v = (r.body.match(/v20260807[a-z]/) || [])[0] || '';
      const doneKey = (r.body.match(/rosterIdeasDoneV\d+/) || [])[0] || '';
      console.log(JSON.stringify({
        u, status: r.status, title: title.slice(0, 60), hasIdeas, hasFab, v, doneKey, len: r.len
      }));
    } catch (e) {
      console.log(JSON.stringify({ u, err: String(e.message || e) }));
    }
  }
})();
