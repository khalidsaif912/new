const https = require('https');
const fs = require('fs');
const path = process.env.TEMP + '/live_index.html';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    }).on('error', reject);
  });
}

(async () => {
  const url = 'https://khalidsaif912.github.io/new/docs/?t=' + Date.now();
  const r = await get(url);
  fs.writeFileSync(path, r.body);
  console.log('status', r.status, 'len', r.body.length);
  console.log('cache', r.headers['cache-control'] || r.headers['age'] || '');

  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, i = 0, bad = 0;
  while ((m = re.exec(r.body))) {
    const src = (m[0].match(/src="([^"]+)"/) || [])[1];
    if (src) {
      console.log('ext', src.slice(0, 100));
      continue;
    }
    const code = m[1];
    if (!code || !code.trim()) continue;
    i++;
    try {
      new Function(code);
      console.log('OK inline', i, code.length);
    } catch (e) {
      bad++;
      console.log('BAD inline', i, e.message);
    }
  }
  console.log('bad count', bad);
  console.log('V5', r.body.includes('rosterIdeasDoneV5'));
  console.log('try {{', r.body.includes('try {{'));
  console.log('ideas open force', r.body.includes('tryOpen()'));

  // Check relative site-visits
  const sv = await get('https://khalidsaif912.github.io/new/docs/site-visits.js?v=20260807b');
  console.log('site-visits', sv.status, sv.body.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
