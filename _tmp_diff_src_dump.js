const fs = require('fs');
const d = fs.readFileSync('_tmp_chrome_out/net_again.html', 'utf8');
const headEnd = d.indexOf('</head>');
console.log(d.slice(0, Math.min(headEnd + 20, 4000)));
console.log('--- search refresh ---');
console.log('refresh', d.includes('refresh'));
console.log('base href', (d.match(/<base[^>]+>/i) || [])[0]);
// Compare first 500 chars of source vs dump after normalize
const src = fs.readFileSync('_tmp_chrome_out/node_body.html', 'utf8');
console.log('src first title', src.slice(src.indexOf('<title'), src.indexOf('<title')+80));
console.log('dump first title', d.slice(d.indexOf('<title'), d.indexOf('<title')+80));
console.log('src has ·', src.includes('·'));
console.log('dump has ·', d.includes('·'));
// Is dump a totally different home - compare dept strings unique?
console.log('src ideasStaticCss', src.includes('ideasStaticCss'));
console.log('dump ideasStaticCss', d.includes('ideasStaticCss'));
console.log('src char length', src.length, 'dump', d.length);
// find first difference after stripping script contents roughly
function rough(s) {
  return s.replace(/<script[\s\S]*?<\/script>/gi, '<script/>').replace(/\s+/g, ' ').slice(0, 3000);
}
const rs = rough(src), rd = rough(d);
let i = 0;
while (i < rs.length && i < rd.length && rs[i] === rd[i]) i++;
console.log('first diff at', i);
console.log('src around', rs.slice(i - 40, i + 80));
console.log('dump around', rd.slice(i - 40, i + 80));
