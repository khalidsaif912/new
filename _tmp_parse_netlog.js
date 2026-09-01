const fs = require('fs');
const path = process.argv[2];
const j = JSON.parse(fs.readFileSync(path, 'utf8'));
const events = j.events || [];
// Find response received for home.html
const interesting = [];
for (const e of events) {
  const p = e.params || {};
  const s = JSON.stringify(p);
  if (s.includes('home.html') || s.includes('v20260807') || s.includes('ideasPrompt')) {
    interesting.push({ type: e.type, phase: e.phase, source: e.source && e.source.id, keys: Object.keys(p), snippet: s.slice(0, 300) });
  }
}
console.log('interesting count', interesting.length);
interesting.slice(0, 40).forEach((x, i) => console.log(i, x.type, x.phase, x.keys.join(','), x.snippet.slice(0, 200)));

// Look for URLResponseReceived / byte counts
const types = {};
events.forEach((e) => { types[e.type] = (types[e.type] || 0) + 1; });
console.log('top types', Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0, 20));

// Search any bytes with ideasPrompt in params
let foundIdeasInNet = 0;
let foundTitleP = 0;
for (const e of events) {
  const s = JSON.stringify(e.params || {});
  if (s.includes('ideasPromptSheetInline')) foundIdeasInNet++;
  if (s.includes('v20260807p')) foundTitleP++;
}
console.log('netlog contains ideasPromptSheetInline events', foundIdeasInNet);
console.log('netlog contains v20260807p', foundTitleP);
