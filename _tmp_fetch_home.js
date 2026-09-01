const https = require('https');
function get(url, headers) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: headers || {} }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, d })
        );
      })
      .on('error', reject);
  });
}
(async () => {
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  for (const [name, h] of [
    ['default', {}],
    ['chrome', { 'User-Agent': ua, Accept: 'text/html' }]
  ]) {
    const r = await get(
      'https://khalidsaif912.github.io/new/docs/home.html?v=20260807d&t=' +
        Date.now(),
      h
    );
    console.log(
      name,
      'status',
      r.status,
      'len',
      r.d.length,
      'age',
      r.headers.age,
      'cache',
      r.headers['cache-control']
    );
    console.log(
      '  rewrite?',
      r.d.includes('do NOT rewrite'),
      'wipe?',
      r.d.includes('footer.innerHTML=h'),
      'host?',
      r.d.includes('id="siteVisitsHost"')
    );
  }
})();
