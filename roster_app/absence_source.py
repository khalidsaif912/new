"""Resolve the unauthorized-leave Excel source for CI / process_absence.

Root contract (same idea as ``ROSTER_UPLOADS/latest.xlsx``):

1. Power Automate **overwrites** one stable OneDrive path every month
   (never Create a new uniquely-named workbook / UniqueId).
2. POST ``repository_dispatch`` ``absence-report-updated``.
3. CI downloads that stable path (guest ``?ga=1``), optionally seeded from
   ``EXPORT_EXCEL_URL``.

Stable paths are always tried **before** any ``:x:`` UniqueId share
(``ABSENCE_EXCEL_URL``). UniqueId links die when a new file is shared; stable
paths do not.
"""

from __future__ import annotations

from urllib.parse import urlparse

from roster_app.cache_io import (
    _personal_site_from_share,
    _add_or_replace_query_param,
    absence_sibling_urls,
)

# Canonical filenames Power Automate must overwrite in place.
STABLE_ABSENCE_NAMES = (
    "absence-report.xlsb",
    "absence-report.xlsx",
)

# Folders under /Documents/ that may hold the stable file.
STABLE_ABSENCE_FOLDERS = (
    "ROSTER_UPLOADS",
    "AbsenceReports",
    "ABSENCE_UPLOADS",
)


def stable_absence_urls_from_export(export_url: str) -> list[str]:
    """Build guest file URLs next to the working roster share."""
    export_url = (export_url or "").strip()
    if not export_url:
        return []

    out: list[str] = []
    seen: set[str] = set()

    def add(url: str) -> None:
        u = (url or "").strip()
        if not u or u in seen:
            return
        seen.add(u)
        out.append(u)

    personal = _personal_site_from_share(export_url)
    if personal:
        for folder in STABLE_ABSENCE_FOLDERS:
            for name in STABLE_ABSENCE_NAMES:
                add(_add_or_replace_query_param(f"{personal}/Documents/{folder}/{name}", "ga", "1"))

    # Also guess siblings from whatever path EXPORT_EXCEL_URL currently resolves to.
    for sib in absence_sibling_urls(export_url):
        add(sib)

    # If EXPORT is already a direct /personal/.../latest.xlsx URL, prefer same folder.
    path = urlparse(export_url).path or ""
    if path.lower().endswith(("/latest.xlsx", "/latest.xlsb")):
        parent = path.rsplit("/", 1)[0]
        origin = f"{urlparse(export_url).scheme}://{urlparse(export_url).netloc}"
        for name in STABLE_ABSENCE_NAMES:
            add(_add_or_replace_query_param(f"{origin}{parent}/{name}", "ga", "1"))

    return out


def resolve_absence_source_urls(
    *,
    absence_url: str = "",
    export_url: str = "",
    payload_url: str = "",
) -> list[str]:
    """Ordered download targets: stable paths, then dispatch payload, then secret."""
    out: list[str] = []
    seen: set[str] = set()

    def add(url: str) -> None:
        u = (url or "").strip()
        if not u or u in seen:
            return
        seen.add(u)
        out.append(u)

    for u in stable_absence_urls_from_export(export_url):
        add(u)

    # Fresh share from Power Automate client_payload (new UniqueId this run only).
    add(payload_url)

    # Repo secret ABSENCE_EXCEL_URL — secondary; may be a :x: guest link.
    add(absence_url)

    return out
