const { spawnSync } = require('child_process');
const fs = require('fs');
const profile = process.env.TEMP + '/chrome-nocache-' + Date.now();
fs.mkdirSync(profile, { recursive: true });
const url = 'https://khalidsaif912.github.io/new/docs/?nocache=' + Date.now();
const r = spawnSync(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--disable-http-cache',
    '--disk-cache-size=1',
    '--media-cache-size=1',
    '--user-data-dir=' + profile,
    '--virtual-time-budget=6000',
    '--dump-dom',
    url
  ],
  { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 }
);
const d = r.stdout || '';
fs.writeFileSync(process.env.TEMP + '/dom-nocache.html', d);
console.log('len', d.length);
console.log('V6', d.includes('rosterIdeasDoneV6'));
console.log('ideas', d.includes('ideasPromptSheetInline'));
console.log('body', d.slice(d.indexOf('<body'), d.indexOf('<body') + 200));
const out = process.env.TEMP + '/shot-nocache.png';
const r2 = spawnSync(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--disable-http-cache',
    '--disk-cache-size=1',
    '--user-data-dir=' + profile + '2',
    '--window-size=390,844',
    '--hide-scrollbars',
    '--screenshot=' + out,
    '--virtual-time-budget=5000',
    url
  ],
  { encoding: 'utf8' }
);
console.log('shot', fs.existsSync(out) ? fs.statSync(out).size : 0, (r2.stderr || '').slice(-120));
