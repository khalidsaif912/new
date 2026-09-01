const fs = require('fs');
const d = fs.readFileSync('_tmp_chrome_out/dump.html', 'utf8');
console.log('len', d.length);
console.log('title', (d.match(/<title>[^<]+/) || [])[0]);
console.log('ideasPrompt count', (d.match(/ideasPrompt/g) || []).length);
console.log('ideasFab', d.includes('ideasFab'));
console.log('v20260807 matches', d.match(/v20260807[a-z]?/g));
console.log('visitsFloatDock', d.includes('visitsFloatDock'));
console.log('siteVisitsHost', d.includes('siteVisitsHost'));
const bi = d.indexOf('<body');
console.log('body idx', bi);
console.log(d.slice(bi, bi + 1200));
// find first child after body - look for <div
const afterBody = d.slice(bi, bi + 5000);
console.log('first 20 tags after body open:');
const tags = [...afterBody.matchAll(/<\/?[a-zA-Z0-9#-]+/g)].slice(0, 40).map((m) => m[0]);
console.log(tags.join(' '));
