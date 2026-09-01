const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk('docs');
let filesChanged = 0;
for (const f of files) {
  let t = fs.readFileSync(f, 'utf8');
  const orig = t;
  t = t.replace(/site-visits\.js\?v=[^"'&\s]+/g, 'site-visits.js?v=20260807r');
  t = t.replace(/ideas-prompt\.js\?v=[^"'&\s]+/g, 'ideas-prompt.js?v=20260807r');
  t = t.replace(/home-ui-force\.js\?v=[^"'&\s]+/g, 'home-ui-force.js?v=20260807r');
  t = t.replace(/change-alert\.js\?v=20260728c/g, 'change-alert.js?v=20260807r');
  t = t.replace(/v20260807q/g, 'v20260807r');
  t = t.replace(/20260807q/g, '20260807r');
  if (t !== orig) {
    fs.writeFileSync(f, t);
    filesChanged++;
  }
}
console.log('filesChanged', filesChanged);
