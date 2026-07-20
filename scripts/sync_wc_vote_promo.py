#!/usr/bin/env python3
"""DEPRECATED: WC vote promo removed. Kept as no-op so old workflows do not re-inject."""

from __future__ import annotations


def main() -> int:
    print("wc-vote-promo removed; nothing to sync")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
