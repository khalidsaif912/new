const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, '_tmp_chrome_out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const url = 'https://khalidsaif912.github.io/new/docs/home.html?v=20260807p&ideas=1&cb=' + Date.now();
const htmlOut = path.join(outDir, 'dump.html');
const shot = path.join(outDir, 'shot.png');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=420,900',
  '--virtual-time-budget=5000',
  '--dump-dom',
  url
];
const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '', err = '';
child.stdout.on('data', (d) => (out += d.toString()));
child.stderr.on('data', (d) => (err += d.toString()));
child.on('close', (code) => {
  fs.writeFileSync(htmlOut, out, 'utf8');
  const hasOpen = /id="ideasPromptSheetInline"[^>]*class="[^"]*is-open/.test(out) || /ideasPromptSheetInline" class="is-open"/.test(out);
  const hasFab = out.includes('id="ideasFab"');
  const display = (out.match(/id="ideasPromptSheetInline"[^>]*>/) || [])[0];
  console.log('exit', code);
  console.log('dumpBytes', out.length);
  console.log('hasFab', hasFab);
  console.log('sheetTag', display);
  console.log('hasIsOpenClass', hasOpen || out.includes('ideas-sheet-open'));
  console.log('htmlClass', (out.match(/<html[^>]*>/) || [])[0]);
  console.log('stderrTail', err.slice(-500));
});
