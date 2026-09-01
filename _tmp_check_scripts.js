const fs = require('fs');
const h = fs.readFileSync('docs/index.html', 'utf8');
const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let m, i = 0, bad = 0;
while ((m = re.exec(h))) {
  const src = (m[0].match(/src="([^"]+)"/) || [])[1];
  if (src) continue;
  const code = m[1];
  if (!code || !code.trim()) continue;
  i++;
  try {
    new Function(code);
  } catch (e) {
    bad++;
    console.log('BAD', i, e.message);
  }
}
console.log('inline scripts checked', i, 'bad', bad);
console.log('static modal', h.includes('id="ideasPromptSheetInline"') && h.includes('class="is-open"'));
console.log('visits dock', h.includes('visitsFloatDock'));
console.log('old V5 script gone', !h.includes('rosterIdeasDoneV5'));
console.log('V6', h.includes('rosterIdeasDoneV6'));
console.log('try {{', h.includes('try {{'));
