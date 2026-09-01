const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = path.join(os.tmpdir(), 'chrome-ideas-test-' + Date.now());
fs.mkdirSync(profile, { recursive: true });

// 1) Serve from local file:// of the exact network-fetched HTML
const localHtml = path.join(__dirname, '_tmp_chrome_out', 'node_body.html');
const fileUrl = 'file:///' + localHtml.replace(/\\/g, '/');

function dump(url, label, extra = []) {
  return new Promise((resolve) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--user-data-dir=' + profile + '-' + label,
      ...extra,
      '--dump-dom',
      url
    ];
    const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.on('close', () => {
      console.log('===', label, '===');
      console.log('url', url.slice(0, 80));
      console.log('len', out.length);
      console.log('title', (out.match(/<title>[^<]+/) || [])[0]);
      console.log('ideas', out.includes('ideasPromptSheetInline'));
      console.log('fab', out.includes('ideasFab'));
      console.log('body', out.slice(out.indexOf('<body'), out.indexOf('<body') + 160).replace(/\s+/g, ' '));
      resolve(out);
    });
  });
}

(async () => {
  await dump(fileUrl, 'file-nojs', ['--disable-javascript']);
  await dump(fileUrl, 'file-js', ['--virtual-time-budget=4000']);
  const netUrl = 'https://khalidsaif912.github.io/new/docs/home.html?v=20260807p&cb=' + Date.now();
  await dump(netUrl, 'net-nojs', ['--disable-javascript']);
  await dump(netUrl, 'net-js', ['--virtual-time-budget=5000']);
})();
