#!/usr/bin/env python3
"""Patch generated import HTML pages with saved-employee department pinning."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_DIR = ROOT / "docs" / "import"

OLD_REORDER_FN = """  function reorderImportDepartments() {
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    if (!cards.length) return;
    var parent = cards[0].parentElement;
    if (!parent) return;
    var bottom = document.querySelector('.importBottom');

    function getName(card) {
      var t = card.querySelector('.deptTitle');
      return (t && t.textContent ? t.textContent : '').trim().toLowerCase();
    }

    var desired = [
      'supervisors',
      'documentation',
      'import checkers',
      'release control',
      'import operators',
      'flight dispatch (import)',
      'flight dispatch (export)'
    ];

    desired.forEach(function(dep) {
      var card = cards.find(function(c) { return getName(c) === dep; });
      if (card) {
        if (bottom) parent.insertBefore(card, bottom);
        else parent.appendChild(card);
      }
    });
  }
"""

NEW_REORDER_BLOCK = """  var IMPORT_DEPT_ORDER = [
    'supervisors',
    'documentation',
    'import checkers',
    'release control',
    'import operators',
    'flight dispatch (import)',
    'flight dispatch (export)'
  ];

  function deptTitleNorm(card) {
    var t = card.querySelector('.deptTitle');
    return (t && t.textContent ? t.textContent : '').trim().toLowerCase();
  }

  function findDeptCardByName(deptName) {
    var target = String(deptName || '').trim().toLowerCase();
    if (!target) return null;
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    return cards.find(function(c) { return deptTitleNorm(c) === target; }) || null;
  }

  function pinDepartmentCardFirst(deptName) {
    var card = findDeptCardByName(deptName);
    if (!card) return false;
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    if (!cards.length || cards[0] === card) return true;
    var parent = card.parentElement;
    if (parent) parent.insertBefore(card, cards[0]);
    return true;
  }

  function reorderImportDepartments(preferredDept) {
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    if (!cards.length) return;
    var parent = cards[0].parentElement;
    if (!parent) return;
    var bottom = document.querySelector('.importBottom');
    var preferred = String(preferredDept || '').trim().toLowerCase();

    if (preferred) {
      pinDepartmentCardFirst(preferred);
      cards = Array.from(document.querySelectorAll('.deptCard'));
    }

    var order = IMPORT_DEPT_ORDER.slice();
    if (preferred && order.indexOf(preferred) === -1) {
      order.unshift(preferred);
    }

    order.forEach(function(dep) {
      if (preferred && dep === preferred) return;
      var card = cards.find(function(c) { return deptTitleNorm(c) === dep; });
      if (card) {
        if (bottom) parent.insertBefore(card, bottom);
        else parent.appendChild(card);
      }
    });

    if (preferred) pinDepartmentCardFirst(preferred);
  }

  function applySavedEmployeeDepartmentFirst() {
    var empId = localStorage.getItem('importSavedEmpId');
    if (!empId) {
      reorderImportDepartments();
      return;
    }
    var base = (function() {
      if (typeof getSiteRootUrl === 'function') return getSiteRootUrl();
      var p = location.pathname || '';
      if (p.indexOf('/roster-site/') !== -1) return location.origin + '/roster-site';
      if (location.hostname && location.hostname.endsWith('github.io')) {
        var segs = p.split('/').filter(Boolean);
        if (segs.length >= 2 && segs[1] === 'docs') return location.origin + '/' + segs[0] + '/docs';
        return location.origin + (segs.length ? '/' + segs[0] : '');
      }
      return location.origin + '/';
    })();
    fetch(base + '/import/schedules/' + encodeURIComponent(empId) + '.json')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (d && d.department) reorderImportDepartments(d.department);
        else reorderImportDepartments();
      })
      .catch(function() { reorderImportDepartments(); });
  }
"""

STORAGE_LISTENER = """
  window.addEventListener('storage', function(e) {
    if (e.key === 'importSavedEmpId' && typeof applySavedEmployeeDepartmentFirst === 'function') {
      applySavedEmployeeDepartmentFirst();
    }
  });
"""

INIT_PREFIX = """  window.reorderImportDepartments = reorderImportDepartments;
  window.applySavedEmployeeDepartmentFirst = applySavedEmployeeDepartmentFirst;

  applySavedEmployeeDepartmentFirst();
  syncImportHeaderDate();
"""

OLD_INIT_VARIANTS = [
    """  reorderImportDepartments();
  syncImportHeaderDate();
  syncImportShiftDetailsOpen();

  // Keep footer "Last Updated" fresh on page load.""",
    """  reorderImportDepartments();
  syncImportHeaderDate();

  // Keep footer "Last Updated" fresh on page load.""",
]

NEW_INIT_VARIANTS = [
    INIT_PREFIX
    + """  syncImportShiftDetailsOpen();
"""
    + STORAGE_LISTENER
    + """
  // Keep footer "Last Updated" fresh on page load.""",
    INIT_PREFIX + STORAGE_LISTENER + """
  // Keep footer "Last Updated" fresh on page load.""",
]

OLD_WELCOME_TAIL = """      if (chip && nameEl) {
        nameEl.textContent = d.name.split(' ')[0];
        chip.classList.add('visible');
      }
    })
    .catch(function() {});"""

NEW_WELCOME_TAIL = """      if (chip && nameEl) {
        nameEl.textContent = d.name.split(' ')[0];
        chip.classList.add('visible');
      }
      if (d.department && typeof window.reorderImportDepartments === 'function') {
        window.reorderImportDepartments(d.department);
      }
    })
    .catch(function() {});"""

OLD_SUPERVISORS = """/* ===== Import UX fixes ===== */
(function() {
  // Keep Supervisors at top even for previously generated card order.
  var cards = Array.from(document.querySelectorAll('.deptCard'));
  if (cards.length) {
    var supCard = cards.find(function(card) {
      var t = card.querySelector('.deptTitle');
      var name = (t && t.textContent ? t.textContent : '').trim().toLowerCase();
      return name === 'supervisors' || name === 'المشرفون';
    });
    if (supCard && cards[0] !== supCard) {
      var parent = supCard.parentElement;
      if (parent) parent.insertBefore(supCard, cards[0]);
    }
  }

  // Sync header date with active page date (same behavior style as export)."""

NEW_SUPERVISORS = """/* ===== Import UX fixes ===== */
(function() {
  // Sync header date with active page date (same behavior style as export)."""


def patch_file(path: Path) -> str | None:
    text = path.read_text(encoding="utf-8")
    if "applySavedEmployeeDepartmentFirst" in text:
        return None
    if OLD_REORDER_FN not in text:
        return "missing old reorder fn"
    text = text.replace(OLD_REORDER_FN, NEW_REORDER_BLOCK, 1)
    init_patched = False
    for old_init, new_init in zip(OLD_INIT_VARIANTS, NEW_INIT_VARIANTS):
        if old_init in text:
            text = text.replace(old_init, new_init, 1)
            init_patched = True
            break
    if not init_patched:
        return "missing old init"
    if OLD_WELCOME_TAIL in text:
        text = text.replace(OLD_WELCOME_TAIL, NEW_WELCOME_TAIL, 1)
    if OLD_SUPERVISORS in text:
        text = text.replace(OLD_SUPERVISORS, NEW_SUPERVISORS, 1)
    path.write_text(text, encoding="utf-8", newline="\n")
    return "patched"


def main() -> int:
    updated = 0
    skipped = 0
    errors: list[str] = []
    for path in sorted(IMPORT_DIR.rglob("index.html")):
        if path == IMPORT_DIR / "index.html":
            continue
        if path.parent.name == "fallback":
            continue
        result = patch_file(path)
        if result == "patched":
            updated += 1
        elif result is None:
            skipped += 1
        else:
            errors.append(f"{path.relative_to(ROOT)}: {result}")
    print(f"patched={updated} skipped={skipped} errors={len(errors)}")
    for err in errors[:20]:
        print(err)
    if len(errors) > 20:
        print(f"... and {len(errors) - 20} more")
  # March and other legacy pages lack embedded reorder JS; warnings only.
    return 0


if __name__ == "__main__":
    sys.exit(main())
