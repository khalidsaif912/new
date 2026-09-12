"""Banner snapshot writes GitHub files and never wipes overlay on failure."""

from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from mantle_overlay_snapshot import (  # noqa: E402
    apply_overlay_to_manifest,
    custom_filename,
    data_url_to_bytes,
)


def test_data_url_decodes_to_bytes():
    raw = data_url_to_bytes(
        "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    )
    assert raw
    assert raw[:3] == b"\xff\xd8\xff" or raw.startswith(b"\xff\xd8")


def test_custom_filename_from_id():
    assert custom_filename("by411jhlz") == "custom-by411jhlz.jpg"
    assert custom_filename("custom:by411jhlz") == "custom-by411jhlz.jpg"
    assert custom_filename("../evil") is None


def test_apply_overlay_archives_removed_and_keeps_custom(tmp_path: Path):
    docs = tmp_path / "docs"
    banners = docs / "assets" / "banners"
    banners.mkdir(parents=True)
    (banners / "banner2.jpg").write_bytes(b"x")
    (banners / "banner5.jpg").write_bytes(b"x")
    (banners / "manifest.json").write_text(
        json.dumps(
            {
                "banners": ["banner2.jpg", "banner5.jpg"],
                "layouts": {"banner5.jpg": {"position": "50% 50%"}},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    apply_overlay_to_manifest(
        docs,
        {
            "removed": ["banner5.jpg"],
            "custom": [
                {
                    "id": "by411jhlz",
                    "key": "custom:by411jhlz",
                    "layout": {"position": "40% 40%"},
                }
            ],
        },
    )
    manifest = json.loads((banners / "manifest.json").read_text(encoding="utf-8"))
    assert "banner5.jpg" not in manifest["banners"]
    assert "banner2.jpg" in manifest["banners"]
    assert "custom:by411jhlz" in manifest["banners"]
    assert (banners / "banner5.jpg").is_file()
    assert manifest["layouts"]["custom:by411jhlz"]["position"] == "40% 40%"
    assert "banner5.jpg" not in manifest["layouts"]


def test_snapshot_keeps_overlay_on_http_429(tmp_path, monkeypatch):
    import urllib.error
    from mantle_overlay_snapshot import snapshot_banner_overlay

    docs = tmp_path / "docs"
    banners = docs / "assets" / "banners"
    banners.mkdir(parents=True)
    overlay = {"removed": ["banner5.jpg"], "custom": [], "at": 1}
    (banners / "overlay.json").write_text(json.dumps(overlay), encoding="utf-8")
    (banners / "manifest.json").write_text(
        json.dumps({"banners": ["banner2.jpg"], "layouts": {}}), encoding="utf-8"
    )

    def boom(*_a, **_k):
        raise urllib.error.HTTPError("https://example.invalid", 429, "rate", hdrs=None, fp=None)

    monkeypatch.setattr("mantle_overlay_snapshot._fetch_json", boom)
    snapshot_banner_overlay(docs)
    data = json.loads((banners / "overlay.json").read_text(encoding="utf-8"))
    assert data["removed"] == ["banner5.jpg"]
