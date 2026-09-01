const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, d, headers: res.headers }));
      })
      .on('error', reject);
  });
}
(async () => {
  const sv = await get(
    'https://khalidsaif912.github.io/new/docs/site-visits.js?v=20260807e&t=' + Date.now()
  );
  const p = process.env.TEMP + '/sv-live.js';
  fs.writeFileSync(p, sv.d);
  try {
    execSync('node --check "' + p + '"', { stdio: 'pipe' });
    console.log('site-visits live syntax OK', 'len', sv.d.length, 'status', sv.status);
  } catch (e) {
    console.log('site-visits live SYNTAX FAIL');
    console.log(String(e.stderr || e.message).slice(0, 400));
  }
  console.log('fixed if ideas', /if \(\/\\\/ideas/.test(sv.d));
  console.log('orphan', /var detail = '';\s*\n\s*\} else if/.test(sv.d));

  const home = await get(
    'https://khalidsaif912.github.io/new/docs/home.html?v=20260807e&t=' + Date.now()
  );
  console.log(
    'home host',
    home.d.includes('id="siteVisitsHost"'),
    'visits ver',
    (home.d.match(/site-visits\.js\?v=[^\s"']+/) || [])[0],
    'no wipe',
    !home.d.includes('footer.innerHTML=h')
  );
})();
