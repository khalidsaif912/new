const fs = require('fs');
const d = fs.readFileSync(process.env.TEMP + '/dom-fresh.html', 'utf8');
const markers = [
  'rosterIdeasDoneV6',
  'rosterIdeasDoneV5',
  'ideasPromptSheetInline',
  'visitsFloatDock',
  'site-visits.js?v=20260807b',
  'site-visits.js?v=20260807a',
  'siteVisitsHost',
  '__inlineVisitsFilled',
  'try {{',
  'footerLastUpdatedLabel',
  'Duty Roster'
];
markers.forEach((m) => console.log(m, d.includes(m)));
// first script src
const s = d.match(/<script[^>]+src="([^"]+)"/g);
console.log('first scripts', (s || []).slice(0, 8));
console.log('last 300', d.slice(-300));
