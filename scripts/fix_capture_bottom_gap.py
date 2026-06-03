#!/usr/bin/env python3
"""Remove extra bottom gap in department capture snapshots."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD_MEASURE = """function measureCaptureWrapHeight(wrap) {
  if (!wrap) return 800;
  var measured = Math.ceil(wrap.scrollHeight || wrap.offsetHeight || 0);
  var dept = wrap.querySelector('.deptCard');
  if (!dept) return Math.max(measured + 24, 400);
  var rowCount = dept.querySelectorAll('.empRow').length;
  var shiftCount = dept.querySelectorAll('.shiftCardFlat, .shiftCard, details.shiftCard').length;
  var banner = wrap.querySelector('.captureBannerHeader');
  var bannerH = banner ? 120 : 0;
  var estimate = bannerH + 200 + (shiftCount * 50) + (rowCount * 40);
  return Math.max(measured, estimate) + 32;
}"""

NEW_MEASURE = """function measureCaptureWrapHeight(wrap) {
  if (!wrap) return 400;
  var total = 0;
  Array.from(wrap.children).forEach(function(child) {
    if (child.getAttribute && child.getAttribute('data-capture-style') === '1') return;
    var rect = child.getBoundingClientRect();
    if (rect.height <= 0) return;
    var st = window.getComputedStyle(child);
    var mb = parseFloat(st.marginBottom) || 0;
    var mt = parseFloat(st.marginTop) || 0;
    total += rect.height + mb + mt;
  });
  var wrapSt = window.getComputedStyle(wrap);
  var pad = (parseFloat(wrapSt.paddingTop) || 0) + (parseFloat(wrapSt.paddingBottom) || 0);
  var sum = Math.ceil(total + pad);
  if (sum > 80) return sum + 2;
  return Math.ceil(wrap.scrollHeight || wrap.offsetHeight || 0) + 2;
}"""

OLD_BLOCK = """    if (isDepartment) {
      captureHeight = measureCaptureWrapHeight(wrap);
      wrap.style.minHeight = captureHeight + 'px';
      wrap.style.height = 'auto';
    }"""

NEW_BLOCK = """    if (isDepartment) {
      captureHeight = measureCaptureWrapHeight(wrap);
    }"""

OLD_PAD = "    wrap.style.padding = '14px';"
NEW_PAD = "    wrap.style.padding = isDepartment ? '10px 12px 6px' : '14px';"

OLD_MB = "  clone.style.marginBottom = '10px';"
NEW_MB = "  clone.style.marginBottom = '6px';"


def main() -> None:
    n = 0
    for path in sorted(ROOT.joinpath("docs").rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        orig = text
        if OLD_MEASURE in text:
            text = text.replace(OLD_MEASURE, NEW_MEASURE, 1)
        if OLD_BLOCK in text:
            text = text.replace(OLD_BLOCK, NEW_BLOCK, 1)
        if OLD_PAD in text and NEW_PAD not in text:
            text = text.replace(OLD_PAD, NEW_PAD, 1)
        if OLD_MB in text:
            text = text.replace(OLD_MB, NEW_MB, 1)
        if text != orig:
            path.write_text(text, encoding="utf-8")
            n += 1
    print(f"patched {n} file(s)")


if __name__ == "__main__":
    main()
