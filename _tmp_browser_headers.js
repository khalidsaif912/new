const https = require('https');
const zlib = require('zlib');
const url = 'https://khalidsaif912.github.io/new/docs/home.html?v=20260807p&cb=' + Date.now();

function fetch(headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'];
        try {
          if (enc === 'gzip') buf = zlib.gunzipSync(buf);
          else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
          else if (enc === 'deflate') buf = zlib.inflateSync(buf);
        } catch (e) {
          console.log('decomp err', e.message);
        }
        const body = buf.toString('utf8');
        resolve({
          status: res.statusCode,
          enc,
          headers: res.headers,
          bytes: buf.length,
          title: (body.match(/<title>[^<]+/) || [])[0],
          ideas: body.includes('ideasPromptSheetInline'),
          bodyStart: body.slice(body.indexOf('<body'), body.indexOf('<body') + 120)
        });
      });
    }).on('error', reject);
  });
}

(async () => {
  console.log('plain', await fetch({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  }));
})();
