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
let n = 0;
for (const f of walk('docs')) {
  let t = fs.readFileSync(f, 'utf8');
  const o = t;
  t = t.replace(/site-visits\.js\?v=[^"'&\s]+/g, 'site-visits.js?v=20260811a');
  t = t.replace(/ideas-prompt\.js\?v=[^"'&\s]+/g, 'ideas-prompt.js?v=20260811a');
  if (t !== o) {
    fs.writeFileSync(f, t);
    n++;
  }
}
console.log('bumped', n);
