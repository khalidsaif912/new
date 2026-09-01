const fs = require('fs');
const d = fs.readFileSync('_tmp_chrome_out/net_again.html', 'utf8');
console.log('ideasStaticCss', d.includes('ideasStaticCss'));
console.log('ideasPromptSheetInline STRING count', (d.match(/ideasPromptSheetInline/g) || []).length);
console.log('ideasFab STRING count', (d.match(/ideasFab/g) || []).length);
console.log('id="ideasPromptSheetInline"', d.includes('id="ideasPromptSheetInline"'));
// find where CSS is
const i = d.indexOf('ideasStaticCss');
console.log('context', d.slice(i - 30, i + 200).replace(/\s+/g, ' '));
// where is first mention of ideasPromptSheetInline
const j = d.indexOf('ideasPromptSheetInline');
console.log('first mention at', j);
console.log(d.slice(j - 20, j + 100).replace(/\s+/g, ' '));
// is element stripped: look after body for style tag
const bi = d.indexOf('<body');
const wi = d.indexOf('class="wrap"');
console.log('between body and wrap length', wi - bi);
console.log(d.slice(bi, wi).slice(0, 500));
// Is ideasStaticCss style in HEAD now?
const he = d.indexOf('</head>');
console.log('ideasStaticCss before head end?', d.indexOf('ideasStaticCss') < he);
