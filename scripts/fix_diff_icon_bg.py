#!/usr/bin/env python3
"""Remove solid black background from diff-calendar.png (web-sized RGBA)."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets" / "icons" / "diff-calendar.png"
SRC = OUT  # overwrite in place; read first


def remove_black_bg(img: Image.Image, threshold: int = 38) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        return r <= threshold and g <= threshold and b <= threshold

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(*px[x, y]) and not visited[y][x]:
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(*px[x, y]) and not visited[y][x]:
                visited[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_bg(*px[nx, ny]):
                visited[ny][nx] = True
                q.append((nx, ny))
    return img


def main() -> None:
    raw = Image.open(SRC)
    # 256px is enough for 30px chips @2x; keeps file small
    sized = raw.convert("RGBA").resize((256, 256), Image.Resampling.LANCZOS)
    out = remove_black_bg(sized)
    out.save(OUT, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
