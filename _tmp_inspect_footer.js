const https = require('https');
const fs = require('fs');
const local = fs.readFileSync('docs/home.html', 'utf8');

function inspect(label, d) {
  console.log('===', label, 'len', d.length);
  console.log('h.replace Last Updated', d.includes("h.replace('Last Updated"));
  console.log('do NOT rewrite', d.includes('do NOT rewrite footer'));
  console.log('footer.innerHTML=h', /footer\.innerHTML\s*=\s*h/.test(d));
  console.log('siteVisitsHost static', d.includes('id="siteVisitsHost"'));
  let pos = 0, n = 0;
  while ((pos = d.indexOf('footer.innerHTML', pos)) >= 0 && n < 8) {
    console.log('footer.innerHTML@', pos, JSON.stringify(d.slice(Math.max(0, pos - 60), pos + 100)));
    pos++;
    n++;
  }
  const needle = 'var footer=document.querySelector';
  let i = 0, p = 0;
  while ((p = d.indexOf(needle, p)) >= 0 && i < 5) {
    console.log('--- footer query @', p, '---');
    console.log(d.slice(p, p + 700));
    p++;
    i++;
  }
}

inspect('local', local);

https.get('https://khalidsaif912.github.io/new/docs/home.html?v=20260807d&t=' + Date.now(), (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', () => inspect('live', d));
}).on('error', (e) => console.error(e));
