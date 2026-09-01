const { spawn } = require('child_process');
const fs = require('fs');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'https://khalidsaif912.github.io/new/docs/home.html?v=20260807p&ideas=1&cb=' + Date.now();

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.on('close', () => resolve(out));
  });
}

(async () => {
  const nojs = await run([
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--disable-javascript',
    '--dump-dom', url
  ]);
  fs.writeFileSync('_tmp_chrome_out/nojs.html', nojs);
  console.log('NOJS title', (nojs.match(/<title>[^<]+/) || [])[0]);
  console.log('NOJS ideas', nojs.includes('ideasPromptSheetInline'));
  console.log('NOJS fab', nojs.includes('ideasFab'));
  console.log('NOJS body start', nojs.slice(nojs.indexOf('<body'), nojs.indexOf('<body') + 200));
  console.log('NOJS len', nojs.length);
})();
