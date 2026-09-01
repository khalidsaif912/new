const https = require('https');
https.get(
  'https://khalidsaif912.github.io/new/docs/?x=' + Date.now(),
  { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } },
  (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => {
      const i = d.indexOf('<body');
      console.log('status', res.statusCode, 'age', res.headers.age, 'cache', res.headers['cache-control']);
      console.log(d.slice(i, i + 400));
      console.log('has is-open class on sheet', /id="ideasPromptSheetInline" class="is-open"/.test(d));
      console.log('wrap first after body?', /<body>\s*<div class="wrap">/.test(d));
      console.log('has visitsFloatDock', d.includes('visitsFloatDock'));
      console.log('has ideasStaticCss', d.includes('ideasStaticCss'));
      console.log('len', d.length);
    });
  }
).on('error', (e) => console.error(e));
