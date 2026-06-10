from pathlib import Path

# Matches generate_and_send.py ROSTER_PWA_HEAD_SNIPPET: resolves manifest for GitHub Pages + /roster-site/
HEAD_INJECT = """
  <meta name="theme-color" content="#f4354b">
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
    var pv = '14';
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
    touch.href = base + 'assets/icons/icon-192.png';
    try {
      var iOS = /iP(hone|ad|od)/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (iOS && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(r) { r.unregister(); });
        });
      }
    } catch (swIosErr) {}
    try {
      var bn = localStorage.getItem('roster_banner_choice');
      if (bn && /^banner\d+\.jpg$/i.test(bn)) {
        var bUrl = base + 'assets/banners/' + bn;
        if (!document.getElementById('banner-early-style')) {
          var bes = document.createElement('style');
          bes.id = 'banner-early-style';
          bes.textContent =
            'html.roster-banner-early .header,html.roster-banner-early .topbar{background-image:url("' + bUrl.replace(/"/g, '') + '")!important;background-size:cover!important;background-position:62% center!important;background-repeat:no-repeat!important}' +
            'html.roster-banner-early .header::before,html.roster-banner-early .header::after{opacity:0!important}';
          document.head.appendChild(bes);
        }
        if (!document.querySelector('link[data-banner-preload="1"]')) {
          var bp = document.createElement('link');
          bp.rel = 'preload';
          bp.as = 'image';
          bp.href = bUrl;
          bp.setAttribute('data-banner-preload', '1');
          document.head.appendChild(bp);
        }
        document.documentElement.classList.add('roster-banner-early');
      }
    } catch (bannerEarlyErr) {}
  })();
  </script>
"""

BODY_INJECT = """
<script src="install-pwa.js?v=14" defer></script>
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
