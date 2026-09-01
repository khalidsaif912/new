const { spawnSync } = require('child_process');
const fs = require('fs');
const profile = process.env.TEMP + '/chrome-net-' + Date.now();
fs.mkdirSync(profile, { recursive: true });
const debugLog = process.env.TEMP + '/chrome-net.log';
const url = 'https://khalidsaif912.github.io/new/docs/?cb=' + Date.now();
const r = spawnSync(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + profile,
    '--enable-logging=stderr',
    '--log-level=0',
    '--virtual-time-budget=5000',
    '--dump-dom',
    url
  ],
  { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 }
);
fs.writeFileSync(process.env.TEMP + '/dom-n2.html', r.stdout || '');
const d = r.stdout || '';
console.log('V6 in dump', d.includes('rosterIdeasDoneV6'));
console.log('ideas', d.includes('ideasPromptSheetInline'));
console.log('body start', d.slice(d.indexOf('<body'), d.indexOf('<body') + 180));
// find resource urls in stderr
const lines = (r.stderr || '').split(/\r?\n/).filter((l) => /docs/i.test(l) && /GET|200|status/i.test(l));
console.log('net lines', lines.slice(0, 20).join('\n'));
