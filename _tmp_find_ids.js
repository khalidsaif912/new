const fs = require('fs');
const d = fs.readFileSync('_tmp_chrome_out/dump.html', 'utf8');
// locations of key ids
for (const id of ['visitsFloatDock', 'siteVisitsHost', 'ideasPromptSheetInline', 'ideasFab', 'wrap', 'chg-card', 'rosterPhoneSheet']) {
  const i = d.indexOf('id="' + id + '"');
  console.log(id, i);
  if (i >= 0) console.log(d.slice(Math.max(0, i - 80), i + 120).replace(/\s+/g, ' '));
}
// count body direct-like structure: search for fixed elements after </div wrap
const bodyEnd = d.lastIndexOf('</body>');
console.log('end body slice last 2000 chars of body region:');
console.log(d.slice(bodyEnd - 2500, bodyEnd).replace(/\s+/g, ' ').slice(-800));
// Check if title was rewritten by JS in source
console.log('document.title assignments? source check separately');
