const fs = require('fs');
const { spawnSync } = require('child_process');
const d = fs.readFileSync(process.env.TEMP + '/live2.html', 'utf8');
const m = d.match(/<div id="ideasPromptSheetInline"[^>]*>/);
console.log('element tag', m && m[0]);
console.log('has is-open attr', /id="ideasPromptSheetInline" class="is-open"/.test(d));
console.log('V6', d.includes('rosterIdeasDoneV6'));
const out = process.env.TEMP + '/roster-shot4/b.png';
const fileUrl = 'file:///' + (process.env.TEMP.replace(/\\/g, '/') + '/live2.html');
const r = spawnSync(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--window-size=390,844',
    '--hide-scrollbars',
    '--screenshot=' + out,
    '--virtual-time-budget=4000',
    fileUrl
  ],
  { encoding: 'utf8' }
);
console.log('chrome status', r.status);
console.log('stderr tail', (r.stderr || '').slice(-300));
console.log('shot exists', fs.existsSync(out), fs.existsSync(out) ? fs.statSync(out).size : 0);
