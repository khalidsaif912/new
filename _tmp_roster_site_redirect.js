const https = require('https');
function get(u) {
  return new Promise((res, rej) => {
    https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}
(async () => {
  const r = await get('https://khalidsaif912.github.io/roster-site/');
  console.log('status', r.status);
  console.log(r.body.slice(0, 2500));
  const r2 = await get('https://khalidsaif912.github.io/roster-site/index.html');
  console.log('--- index ---');
  console.log(r2.body.slice(0, 2500));
  // Compare raw from both repos for home if exists
  for (const repo of ['new', 'roster-site']) {
    try {
      const raw = await get('https://raw.githubusercontent.com/khalidsaif912/' + repo + '/main/docs/home.html');
      console.log(repo, 'docs/home.html', raw.status, 'len', raw.body.length, 'title', (raw.body.match(/<title>[^<]+/)||[])[0], 'ideasFab', raw.body.includes('ideasFab'), 'ideasPrompt', raw.body.includes('ideasPromptSheetInline'));
    } catch (e) {
      console.log(repo, 'error', e.message);
    }
  }
  for (const repo of ['new', 'roster-site']) {
    try {
      const raw = await get('https://raw.githubusercontent.com/khalidsaif912/' + repo + '/main/home.html');
      console.log(repo, 'root home.html', raw.status, 'len', raw.body.length);
    } catch (e) {
      console.log(repo, 'root home', e.message);
    }
  }
})();
