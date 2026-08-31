#!/usr/bin/env python3
"""Local SATS Labels server with /api/awb and /api/track proxies."""
from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SMARTKARGO = "https://omanair.smartkargo.com/FrmAWBTracking.aspx"


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


def fetch_smartkargo(prefix: str, serial: str) -> str:
    url = f"{SMARTKARGO}?AWBPrefix={urllib.parse.quote(prefix)}&AWBno={urllib.parse.quote(serial)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; SATS-Labels/1.0)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read().decode("latin-1", errors="replace")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/api/awb":
            awb = re.sub(r"[^\d]", "", (qs.get("awb") or [""])[0])
            prefix = re.sub(r"[^\d]", "", (qs.get("AWBPrefix") or qs.get("prefix") or [""])[0])[:3] or awb[:3]
            serial = re.sub(r"[^\d]", "", (qs.get("AWBno") or qs.get("AWBNumber") or [""])[0])[:8] or awb[3:]
            if len(prefix) != 3 or len(prefix + serial) < 11:
                return self._send(400, json.dumps({"ok": False, "error": "invalid_awb"}).encode(), "application/json")
            serial = (prefix + serial)[3:11]
            try:
                html = fetch_smartkargo(prefix, serial)
                parsed_awb = parse_smartkargo_html(html)
                if not any(parsed_awb.values()):
                    payload = {"ok": False, "error": "not_found", "awb": prefix + serial}
                    return self._send(404, json.dumps(payload).encode(), "application/json")
                payload = {"ok": True, "awb": prefix + serial, "prefix": prefix, **parsed_awb}
                return self._send(200, json.dumps(payload).encode(), "application/json")
            except Exception as exc:  # noqa: BLE001
                payload = {"ok": False, "error": "track_failed", "detail": str(exc)}
                return self._send(502, json.dumps(payload).encode(), "application/json")
        if parsed.path == "/api/track":
            prefix = (qs.get("AWBPrefix") or [""])[0]
            serial = (qs.get("AWBno") or qs.get("AWBNumber") or [""])[0]
            try:
                html = fetch_smartkargo(prefix, serial)
                return self._send(200, html.encode("latin-1", errors="replace"), "text/html; charset=iso-8859-1")
            except Exception as exc:  # noqa: BLE001
                return self._send(502, str(exc).encode(), "text/plain; charset=utf-8")
        return super().do_GET()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"SATS Labels http://{args.host}:{args.port}/#ship", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
