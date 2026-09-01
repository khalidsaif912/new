const fs = require('fs');
const d = fs.readFileSync('_tmp_chrome_out/dump.html', 'utf8');
console.log('includes visitsFloatDock', d.includes('visitsFloatDock'));
console.log('includes FloatDock', d.includes('FloatDock'));
console.log('includes siteVisitsDay', d.includes('siteVisitsDay'));
console.log('includes wrap class', d.includes('class="wrap"'));
// Compare: source title vs dump title - fetch what script alters title
const home = fs.readFileSync('docs/home.html', 'utf8');
console.log('source title', (home.match(/<title>[^<]+/) || [])[0]);
console.log('source has ideas before wrap', home.indexOf('ideasPromptSheetInline') < home.indexOf('class="wrap"'));

// Maybe dump is from import page now?
console.log('has Operation Roster August', d.includes('Operation Roster August'));
console.log('has myScheduleBtn', d.includes('myScheduleBtn'));
console.log('script srcs sample', [...d.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => m[1]).slice(0, 40));
