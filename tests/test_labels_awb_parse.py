"""Parser tests for SATS Labels AWB shipment lookup."""
from __future__ import annotations

import re
from pathlib import Path

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "smartkargo_awb_91017328684.html"


def grab_label(html: str, label_id: str) -> str:
    match = re.search(rf'id="{re.escape(label_id)}"[^>]*>([^<]*)', html, flags=re.I)
    return match.group(1).strip() if match else ""


def parse_smartkargo_html(html: str) -> dict[str, str]:
    dest = grab_label(html, "lblDestination").upper()
    origin = grab_label(html, "lblOrigin").upper()
    pcs = re.sub(r"[^\d]", "", grab_label(html, "lblPcs"))
    wt_match = re.search(r"[\d.]+", grab_label(html, "lblGrossWt").replace(",", ""))
    weight = str(round(float(wt_match.group(0)))) if wt_match else ""
    return {"dest": dest, "origin": origin, "pcs": pcs, "weight": weight}


def parse_smartkargo_text(text: str) -> dict[str, str]:
    html_parsed = parse_smartkargo_html(text)
    if any(html_parsed.values()):
        return html_parsed
    row = re.search(
        r"\|\s*([A-Z]{3})\s*\|\s*([A-Z]{3})\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*Kgs",
        text,
        flags=re.I,
    )
    if row:
        return {
            "origin": row.group(1),
            "dest": row.group(2),
            "pcs": row.group(3),
            "weight": str(round(float(row.group(4)))),
        }
    return {"dest": "", "origin": "", "pcs": "", "weight": ""}


def test_parse_fixture_svo_shipment() -> None:
    html = FIXTURE.read_text(encoding="latin-1")
    parsed = parse_smartkargo_html(html)
    assert parsed["dest"] == "SVO"
    assert parsed["origin"] == "MCT"
    assert parsed["pcs"] == "1"
    assert parsed["weight"] == "24"


def test_parse_empty_html_has_no_fields() -> None:
    parsed = parse_smartkargo_html("<html><body>no shipment</body></html>")
    assert parsed == {"dest": "", "origin": "", "pcs": "", "weight": ""}


def test_parse_jina_markdown_table() -> None:
    text = """
| Status | Station | Dest | Pcs | Weight | Flight# |
| Booked [C] | MCT | SVO | 1 | 24.00 Kgs | WY183 |
"""
    parsed = parse_smartkargo_text(text)
    assert parsed["origin"] == "MCT"
    assert parsed["dest"] == "SVO"
    assert parsed["pcs"] == "1"
    assert parsed["weight"] == "24"


def test_live_smartkargo_lookup_for_sample_awb() -> None:
    import urllib.request

    url = "https://omanair.smartkargo.com/FrmAWBTracking.aspx?AWBPrefix=910&AWBno=17328684"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=25) as res:
        html = res.read().decode("latin-1", errors="replace")
    parsed = parse_smartkargo_html(html)
    assert parsed["origin"] == "MCT"
    assert parsed["dest"]
    assert parsed["pcs"]
    assert parsed["weight"]


def test_live_cors_proxy_returns_shipment_html() -> None:
    import urllib.request

    url = (
        "https://proxy.cors.sh/https://omanair.smartkargo.com/"
        "FrmAWBTracking.aspx?AWBPrefix=910&AWBno=17328684"
    )
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://khalidsaif912.github.io",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as res:
        html = res.read().decode("latin-1", errors="replace")
        assert res.headers.get("Access-Control-Allow-Origin") in ("*", "https://khalidsaif912.github.io")
    parsed = parse_smartkargo_html(html)
    assert parsed["origin"] == "MCT"
    assert parsed["dest"] == "SVO"
    assert parsed["pcs"] == "1"
    assert parsed["weight"] == "24"
