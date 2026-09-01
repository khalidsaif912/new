const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');

function get(u, headers) {
  return new Promise((res, rej) => {
    https.get(u, { headers }, (r) => {
      let d = Buffer.alloc(0);
      r.on('data', (c) => { d = Buffer.concat([d, c]); });
      r.on('end', () => res({
        status: r.statusCode,
        headers: r.headers,
        body: d.toString('utf8'),
        bytes: d.length
      }));
    }).on('error', rej);
  });
}

const url = 'https://khalidsaif912.github.io/new/docs/home.html?v=20260807p&cb=' + Date.now();

(async () => {
  const nodeUA = await get(url, {
    'User-Agent': 'node-fetch-test',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });
  const chromeUA = await get(url, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Accept': 'text/html,application/xhtml+xml'
  });

  function summary(label, r) {
    console.log('---', label, '---');
    console.log('status', r.status, 'bytes', r.bytes);
    console.log('cache', r.headers['cache-control'], 'cf', r.headers['cf-cache-status'] || r.headers['x-cache'] || r.headers['age']);
    console.log('title', (r.body.match(/<title>[^<]+/) || [])[0]);
    console.log('ideas', r.body.includes('ideasPromptSheetInline'));
    console.log('fab', r.body.includes('ideasFab'));
    console.log('v20260807p', r.body.includes('v20260807p'));
    console.log('body open snippet', r.body.slice(r.body.indexOf('<body'), r.body.indexOf('<body') + 180).replace(/\s+/g, ' '));
  }
  summary('node UA', nodeUA);
  summary('chrome UA', chromeUA);

  // also raw github
  const raw = await get('https://raw.githubusercontent.com/khalidsaif912/new/main/docs/home.html', {
    'User-Agent': 'Mozilla/5.0',
    'Cache-Control': 'no-cache'
  });
  summary('raw github', raw);

  fs.writeFileSync('_tmp_chrome_out/node_body.html', nodeUA.body);
  fs.writeFileSync('_tmp_chrome_out/chrome_ua_body.html', chromeUA.body);
})();
