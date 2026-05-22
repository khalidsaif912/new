#!/usr/bin/env python3
"""Resize banner image with center crop (no stretch). Usage: resize_banner_cover.py src out [W H]"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def cover_resize(
    img: Image.Image,
    target_w: int,
    target_h: int,
    focus_x: float = 0.5,
    focus_y: float = 0.5,
) -> Image.Image:
    """Scale to cover target box, then crop. focus 0=left/top, 1=right/bottom."""
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = int(round((new_w - target_w) * focus_x))
    top = int(round((new_h - target_h) * focus_y))
    left = max(0, min(left, new_w - target_w))
    top = max(0, min(top, new_h - target_h))
    return resized.crop((left, top, left + target_w, top + target_h))


def main() -> None:
    src = Path(sys.argv[1])
    out = Path(sys.argv[2])
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 400
    focus_x = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
    focus_y = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
    img = Image.open(src).convert("RGB")
    out.parent.mkdir(parents=True, exist_ok=True)
    cover_resize(img, w, h, focus_x, focus_y).save(out, "JPEG", quality=88, optimize=True)
    print(f"saved {out} ({w}x{h}) from {img.size}")


if __name__ == "__main__":
    main()
