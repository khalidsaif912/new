#!/usr/bin/env python3
"""Move ME12 employees from Other shift cards into Morning within existing roster HTML."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MORNING_STATUS_COLOR = "#92400e"

SHIFT_BODY_RE = re.compile(
    r'(<div class="shiftBody">)\s*(.*?)\s*(</div>\s*</details>)',
    re.S,
)


def _emp_status_is_me12(row_html: str) -> bool:
    return bool(re.search(r'<span class="empStatus"[^>]*>\s*ME12\s*</span>', row_html, re.I))


def _extract_emp_rows(body_html: str) -> list[str]:
    return re.findall(
        r'<div class="empRow[^"]*"[^>]*>.*?</div>',
        body_html,
        re.S,
    )


def _strip_alt_class(row: str) -> str:
    return re.sub(r"\s*empRowAlt", "", row)


def _set_alt_class(row: str, alt: bool) -> str:
    row = _strip_alt_class(row)
    if alt:
        row = row.replace('class="empRow"', 'class="empRow empRowAlt"', 1)
    return row


def _morning_status_style(row: str) -> str:
    return re.sub(
        r'<span class="empStatus" style="[^"]*;">',
        f'<span class="empStatus" style="color:{MORNING_STATUS_COLOR};">',
        row,
        count=1,
    )


def _update_shift_count(card_html: str, count: int) -> str:
    return re.sub(
        r'(<span class="shiftCount"[^>]*>)\d+(</span>)',
        rf"\g<1>{count}\2",
        card_html,
        count=1,
    )


def _replace_shift_body(card_html: str, rows: list[str]) -> str:
    rebuilt = ""
    for i, row in enumerate(rows):
        rebuilt += _set_alt_class(row, i % 2 == 1)
    m = SHIFT_BODY_RE.search(card_html)
    if not m:
        return card_html
    new_card = card_html[: m.start(2)] + rebuilt + card_html[m.start(3) :]
    return _update_shift_count(new_card, len(rows))


def fix_shift_stack(stack_html: str) -> tuple[str, bool]:
    other_m = re.search(
        r'(<details class="shiftCard" data-shift="Other"[^>]*>.*?</details>)',
        stack_html,
        re.S,
    )
    if not other_m:
        return stack_html, False

    other_card = other_m.group(1)
    other_body_m = SHIFT_BODY_RE.search(other_card)
    if not other_body_m:
        return stack_html, False

    rows = _extract_emp_rows(other_body_m.group(2))
    me12_rows = [r for r in rows if _emp_status_is_me12(r)]
    if not me12_rows:
        return stack_html, False

    morning_m = re.search(
        r'(<details class="shiftCard" data-shift="Morning"[^>]*>.*?</details>)',
        stack_html,
        re.S,
    )
    if not morning_m:
        return stack_html, False

    morning_card = morning_m.group(1)
    morning_body_m = SHIFT_BODY_RE.search(morning_card)
    if not morning_body_m:
        return stack_html, False

    morning_rows = _extract_emp_rows(morning_body_m.group(2))
    new_morning_rows = morning_rows + [_morning_status_style(_strip_alt_class(r)) for r in me12_rows]
    new_morning_card = _replace_shift_body(morning_card, new_morning_rows)

    remaining_other = [r for r in rows if r not in me12_rows]
    new_stack = stack_html.replace(morning_card, new_morning_card, 1)

    if remaining_other:
        new_other_card = _replace_shift_body(other_card, remaining_other)
        new_stack = new_stack.replace(other_card, new_other_card, 1)
    else:
        new_stack = new_stack.replace(other_card, "", 1)
        new_stack = re.sub(r"\n\s*\n\s*\n", "\n\n", new_stack)

    return new_stack, True


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if ">ME12<" not in text:
        return False

    parts = re.split(r'(<div class="shiftStack">)', text)
    if len(parts) < 3:
        return False

    changed = False
    out = [parts[0]]
    i = 1
    while i < len(parts):
        if parts[i] != '<div class="shiftStack">':
            out.append(parts[i])
            i += 1
            continue
        if i + 1 >= len(parts):
            out.append(parts[i])
            break
        fixed_body, stack_changed = fix_shift_stack(parts[i + 1])
        changed = changed or stack_changed
        out.append(parts[i])
        out.append(fixed_body)
        i += 2

    new_text = "".join(out)
    if changed and new_text != text:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> int:
    targets = sorted(DOCS.rglob("index.html"))
    updated = 0
    for p in targets:
        if fix_file(p):
            updated += 1
            print(p.relative_to(ROOT))
    print(f"Updated {updated} file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
