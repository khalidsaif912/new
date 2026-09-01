const https = require('https');
const fs = require('fs');
function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(d));
      })
      .on('error', reject);
  });
}
(async () => {
  const live = await get(
    'https://khalidsaif912.github.io/new/docs/home.html?v=20260807d&t=' + Date.now()
  );
  const srcs = [...live.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map((m) => m[1]);
  console.log('LIVE static script srcs:', srcs.length);
  srcs.forEach((s) => console.log(' ', s));
  console.log(
    'live has wipe applyLang?',
    live.includes('footer.innerHTML=h'),
    'host static?',
    live.includes('id="siteVisitsHost"'),
    'addScript visits?',
    live.includes("site-visits.js?v=")
  );
  // check if addScript includes site-visits
  const add = live.match(/addScript\([^\)]+site-visits[^\)]+\)/g);
  console.log('addScript site-visits matches', add);

  const local = fs.readFileSync('docs/home.html', 'utf8');
  console.log(
    'local len',
    local.length,
    'live len',
    live.length,
    'diff',
    local.length - live.length
  );
  // compare a unique hash string near footer
  const marker = 'site-visits.js?v=';
  console.log('local versions:', local.match(/site-visits\.js\?v=[^\"'\s]+/g));
  console.log('live versions:', live.match(/site-visits\.js\?v=[^\"'\s]+/g));
  console.log('local holiday:', local.match(/holiday-ticker\.js\?v=[^\"'\s]+/g));
  console.log('live holiday:', live.match(/holiday-ticker\.js\?v=[^\"'\s]+/g));
})();
