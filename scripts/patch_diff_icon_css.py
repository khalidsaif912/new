#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = """    img[data-roster-icon="diff"] {
      border: none;
      outline: none;
      background: transparent;
    }
"""
NEEDLE = "    .chipVal .roster-icon, .chipVal .chipIcon {"


def main() -> None:
    n = 0
    for path in ROOT.joinpath("docs").rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        if 'data-roster-icon="diff"' not in text:
            continue
        if 'img[data-roster-icon="diff"]' in text:
            continue
        idx = text.find(NEEDLE)
        if idx == -1:
            continue
        end = text.find("}", idx)
        end = text.find("\n", end) + 1
        path.write_text(text[:end] + CSS + text[end:], encoding="utf-8", newline="\n")
        n += 1
    print(f"css injected into {n} files")


if __name__ == "__main__":
    main()
