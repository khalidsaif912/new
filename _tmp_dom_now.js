const { spawnSync } = require('child_process');
const fs = require('fs');
const profile = process.env.TEMP + '/chrome-fresh2-' + Date.now();
fs.mkdirSync(profile, { recursive: true });
const out = process.env.TEMP + '/dom-now.html';
const url = 'https://khalidsaif912.github.io/new/docs/?v=eff05d9&cb=' + Date.now();
const r = spawnSync(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + profile,
    '--virtual-time-budget=8000',
    '--dump-dom',
    url
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
);
fs.writeFileSync(out, r.stdout || '');
const d = r.stdout || '';
console.log('stderr last', (r.stderr || '').slice(-150));
console.log('len', d.length);
const i = d.indexOf('<body');
console.log(d.slice(i, i + 220));
console.log('ideas idx', d.indexOf('ideasPromptSheetInline'));
console.log('is-open el', /id="ideasPromptSheetInline"[^>]*is-open/.test(d));
console.log('V6', d.includes('rosterIdeasDoneV6'));
console.log('visitsFloat', d.includes('visitsFloatDock'));
console.log('chg-card', d.includes('chg-card'));
// computed presence of style
console.log('ideasStaticCss', d.includes('ideasStaticCss'));
