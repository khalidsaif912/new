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

async function evalOn(port, pageUrl, waitMs = 10000) {
  let list = await get(`http://127.0.0.1:${port}/json/list`);
  let target = (Array.isArray(list) ? list : []).find((t) => t.type === 'page');
  if (!target) target = await get(`http://127.0.0.1:${port}/json/new?about:blank`);

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
  // Clear storage so auto-show isn't blocked by prior done/skip.
  await send('Page.navigate', { url: 'about:blank' });
  await new Promise((r) => setTimeout(r, 300));
  await send('Runtime.evaluate', {
    expression: `(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} return true; })()`,
    returnByValue: true
  });

  console.log('navigate', pageUrl);
  await send('Page.navigate', { url: pageUrl });
  await new Promise((r) => setTimeout(r, waitMs));

  const expr = `(() => {
    const sheet = document.getElementById('ideasPromptSheetInline');
    const fab = document.getElementById('ideasFab');
    return {
      title: document.title,
      href: location.href,
      booted: !!window.__rosterIdeasPromptBooted,
      sheet: !!sheet,
      open: !!(sheet && sheet.classList.contains('is-open')),
      fab: !!fab,
      display: sheet ? getComputedStyle(sheet).display : null,
      ideasScripts: Array.from(document.scripts).map(s => s.src).filter(s => /ideas|site-visits/.test(s))
    };
  })()`;
  const ev = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log(JSON.stringify(ev.result && ev.result.value != null ? ev.result.value : ev, null, 2));
  ws.close();
}

(async () => {
  const port = process.env.CDP_PORT || '9335';
  const cb = Date.now();
  await evalOn(
    port,
    `https://khalidsaif912.github.io/new/docs/home.html?v=20260807r&ideas=1&cb=${cb}`,
    12000
  );
  await evalOn(
    port,
    `https://khalidsaif912.github.io/new/docs/date/2026-08-07/?ideas=1&cb=${cb}`,
    10000
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
