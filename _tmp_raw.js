const https = require('https');
https.get('https://raw.githubusercontent.com/khalidsaif912/new/main/docs/index.html', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    console.log('raw status', r.statusCode, 'len', d.length);
    console.log('V6', d.includes('rosterIdeasDoneV6'));
    console.log('is-open', /id="ideasPromptSheetInline" class="is-open"/.test(d));
    console.log('visits', (d.match(/site-visits\.js\?v=([^\s"']+)/) || [])[1]);
    console.log('tryDbl', d.includes('try {{'));
  });
}).on('error', console.error);
