const fs = require('fs');
const d = fs.readFileSync(process.env.TEMP + '/dom5.html', 'utf8');
console.log('len', d.length);
const m = d.match(/<div id="ideasPromptSheetInline"[^>]*>/);
console.log('el', m && m[0]);
console.log('visitsFloat', d.includes('visitsFloatDock'));
console.log('chg-card', d.includes('id="chg-card"'));
console.log('ideas-sheet-open on html', /<html[^>]*ideas-sheet-open/.test(d));
console.log('ideas idx', d.indexOf('ideasPromptSheetInline'));
console.log('chg idx', d.indexOf('chg-card'));
const i = d.indexOf('id="visitsFloatDock"');
console.log(i > 0 ? d.slice(i, i + 350) : 'no dock element');
const j = d.indexOf('class="is-open"');
console.log('is-open count', (d.match(/is-open/g) || []).length);
// check if display rules still there
console.log('css is-open rule', d.includes('#ideasPromptSheetInline.is-open{display:flex!important}'));
