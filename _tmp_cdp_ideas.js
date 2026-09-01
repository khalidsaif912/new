const http = require('http');

function get(url) {
  return new Promise((res, rej) => {
    http
      .get(url, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => {
          try {
            res(JSON.parse(d));
          } catch (e) {
            res(d);
          }
        });
      })
      .on('error', rej);
  });
}

(async () => {
  const port = process.env.CDP_PORT || '9334';
  let list = await get(`http://127.0.0.1:${port}/json/list`);
  let target = (Array.isArray(list) ? list : []).find((t) => t.type === 'page');
  if (!target) {
    target = await get(`http://127.0.0.1:${port}/json/new?about:blank`);
  }
  console.log('target', target.url, target.id);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  }
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    }
  };
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Runtime.addBinding', { name: 'pageLog' }).catch(() => {});

  const url =
    'https://khalidsaif912.github.io/new/docs/home.html?v=20260807q&ideas=1&cb=' + Date.now();
  console.log('navigate', url);
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 10000));

  const expr = `(() => {
    const sheet = document.getElementById('ideasPromptSheetInline');
    const fab = document.getElementById('ideasFab');
    return {
      title: document.title,
      booted: !!window.__rosterIdeasPromptBooted,
      api: typeof window.rosterIdeasPrompt,
      sheet: !!sheet,
      open: !!(sheet && sheet.classList.contains('is-open')),
      fab: !!fab,
      display: sheet ? getComputedStyle(sheet).display : null,
      bodyKids: Array.from(document.body.children).slice(0, 15).map(el =>
        el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : '')
      ),
      ideasScripts: Array.from(document.scripts).map(s => s.src).filter(s => /ideas|home-ui|site-visits/.test(s)),
      ready: document.readyState,
      href: location.href
    };
  })()`;

  const ev = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: false
  });
  console.log(JSON.stringify(ev.result && ev.result.value != null ? ev.result.value : ev, null, 2));

  try {
    await send('Browser.close');
  } catch (e) {}
  ws.close();
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
