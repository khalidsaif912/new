const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chrome =
  process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe';
const dir = path.join(process.env.TEMP, 'c-vfix-' + Date.now());
fs.mkdirSync(dir, { recursive: true });
const out = path.join(process.env.TEMP, 'dom-vfix.html');
const url =
  'https://khalidsaif912.github.io/new/docs/home.html?v=20260807e&r=' + Date.now();
const cmd =
  '"' +
  chrome +
  '" --headless=new --disable-gpu --disable-http-cache --user-data-dir="' +
  dir +
  '" --virtual-time-budget=12000 --dump-dom "' +
  url +
  '"';
try {
  const html = execSync(cmd, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  fs.writeFileSync(out, html);
  const f = html.match(/class="footer">[\s\S]{0,1400}/);
  console.log('host count', (html.match(/id="siteVisitsHost"/g) || []).length);
  console.log('day value present', /id="siteVisitsDay">[^<]+/.test(html));
  const day = html.match(/id="siteVisitsDay">([^<]*)</);
  const month = html.match(/id="siteVisitsMonth">([^<]*)</);
  const total = html.match(/id="siteVisitsTotal">([^<]*)</);
  console.log('counts', day && day[1], month && month[1], total && total[1]);
  console.log('footer snippet:\n', f ? f[0].slice(0, 1100) : 'NONE');
} catch (e) {
  console.log('err', e.message.slice(0, 300));
  if (e.stdout) fs.writeFileSync(out, e.stdout);
}
