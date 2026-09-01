const https = require('https');
const fs = require('fs');

function get(ua) {
  return new Promise((resolve, reject) => {
    https.get(
      'https://khalidsaif912.github.io/new/docs/?cb=' + Date.now(),
      {
        headers: {
          'User-Agent': ua,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Accept: 'text/html'
        }
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            age: res.headers.age,
            cf: res.headers['cf-cache-status'] || res.headers['x-cache'] || '',
            len: d.length,
            v6: d.includes('rosterIdeasDoneV6'),
            open: /id="ideasPromptSheetInline" class="is-open"/.test(d),
            visitsVer: (d.match(/site-visits\.js\?v=([^"']+)/) || [])[1],
            tryDbl: d.includes('try {{')
          })
        );
      }
    ).on('error', reject);
  });
}

(async () => {
  const chrome =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const ps = 'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1';
  console.log('chrome', await get(chrome));
  console.log('ps', await get(ps));
  console.log('default-node', await get('node'));
})().catch(console.error);
