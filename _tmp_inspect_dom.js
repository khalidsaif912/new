const fs = require('fs');
const html = fs.readFileSync(process.env.TEMP + '/footer-dom.html', 'utf8');
console.log('dump len', html.length);

const markers = [
  "footer.innerHTML=h",
  "do NOT rewrite footer",
  'id="siteVisitsHost"',
  "siteVisitsHost",
  "function applyLang",
  "Visitors today",
  "زوار اليوم"
];
for (const m of markers) {
  let c = 0, p = 0, positions = [];
  while ((p = html.indexOf(m, p)) >= 0) {
    c++;
    if (positions.length < 6) positions.push(p);
    p += m.length;
  }
  console.log(JSON.stringify(m), 'count=', c, 'pos=', positions.join(','));
}

// Find script sources near the OLD footer.innerHTML block
const p = html.indexOf('footer.innerHTML=h');
if (p >= 0) {
  const before = html.lastIndexOf('<script', p);
  const afterSrc = html.slice(before, before + 200);
  console.log('script open near wipe:', afterSrc.replace(/\s+/g, ' ').slice(0, 200));
  // also look 5000 chars before for hints
  console.log('context 300 before wipe:\n', html.slice(p - 300, p + 200));
}

// Footer element in body as rendered
const f = html.match(/class="footer">[\s\S]{0,1200}/);
console.log('RENDERED FOOTER:\n', f && f[0]);
