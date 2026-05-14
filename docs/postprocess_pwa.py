from pathlib import Path

# Matches generate_and_send.py ROSTER_PWA_HEAD_SNIPPET: resolves manifest for GitHub Pages + /roster-site/
HEAD_INJECT = """
  <meta name="theme-color" content="#1e40af">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <script>
  (function () {
    function siteRoot() {
      if (location.protocol === 'file:') return '';
      var path = location.pathname || '/';
      if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
      if (location.hostname && location.hostname.endsWith('github.io')) {
        var segs = path.split('/').filter(Boolean);
        if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
        return segs.length ? '/' + segs[0] : '';
      }
      return '';
    }
    var p = siteRoot();
    var base = location.origin + p + (p && p.charAt(p.length - 1) !== '/' ? '/' : '');
    if (!p) base = location.origin + '/';
    var pv = '11';
    var imp = (location.pathname || '').indexOf('/import/') !== -1;
    var man = base + (imp ? 'import/manifest.json' : 'manifest.json') + '?v=' + pv;
    var mlinks = document.querySelectorAll('link[rel="manifest"]');
    var link = mlinks.length ? mlinks[0] : null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = man;
    for (var i = 1; i < mlinks.length; i++) mlinks[i].remove();
    var touch = document.querySelector('link[rel="apple-touch-icon"][data-pwa-touch="1"]');
    if (!touch) {
      touch = document.createElement('link');
      touch.rel = 'apple-touch-icon';
      touch.setAttribute('data-pwa-touch', '1');
      document.head.appendChild(touch);
    }
    touch.href = base + 'assets/icons/flight.png';
  })();
  </script>
"""

BODY_INJECT = """
<script src="install-pwa.js?v=11" defer></script>
"""


def patch_html_file(path: Path):
    html = path.read_text(encoding="utf-8")
    if 'rel="manifest"' not in html and 'siteRoot()' not in html and "</head>" in html:
        html = html.replace("</head>", HEAD_INJECT + "\n</head>")
    if "install-pwa.js" not in html and "</body>" in html:
        html = html.replace("</body>", BODY_INJECT + "\n</body>")
    path.write_text(html, encoding="utf-8")
    print(f"Patched: {path}")


def main():
    docs = Path("docs")
    for path in docs.rglob("*.html"):
        patch_html_file(path)


if __name__ == "__main__":
    main()
