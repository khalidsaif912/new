const fs = require('fs');
const h = fs.readFileSync(process.env.TEMP + '/dom3.html', 'utf8');
const srcs = [...h.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map((m) => m[1]);
console.log('script srcs count', srcs.length);
console.log(srcs.slice(0, 50).join('\n'));
console.log('count applyLang', (h.match(/function applyLang/g) || []).length);
let p = 0,
  i = 0;
while ((p = h.indexOf('function applyLang', p)) >= 0 && i < 3) {
  const block = h.slice(p, p + 4500);
  console.log(
    '--- applyLang',
    i,
    'at',
    p,
    'wipe?',
    block.includes('footer.innerHTML=h'),
    'doNot?',
    block.includes('do NOT rewrite'),
    'labelId?',
    block.includes('footerLastUpdatedLabel')
  );
  p++;
  i++;
}
const bodyStart = h.indexOf('<body');
const firstScript = h.indexOf('<script', bodyStart);
const bodyHtml = h.slice(bodyStart, firstScript > 0 ? firstScript : bodyStart + 50000);
console.log('body-before-script host?', bodyHtml.includes('siteVisitsHost'));
const f = h.match(/class="footer">[\s\S]{0,900}/);
console.log('rendered footer:\n', f && f[0]);
console.log('len', h.length);
console.log('id=siteVisitsHost count', (h.match(/id="siteVisitsHost"/g) || []).length);
console.log('home-ui-force loaded?', h.includes('home-ui-force') || h.includes('__homeUiForceBooted'));
