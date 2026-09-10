"""Ticker + banner clients must cache Mantle data and stop 4s polling."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TICKER = (ROOT / "docs/holiday-ticker.js").read_text(encoding="utf-8")
STORE = (ROOT / "docs/banner-store.js").read_text(encoding="utf-8")
CHANGER = (ROOT / "docs/banner-changer.js").read_text(encoding="utf-8")
SNIPPETS = (ROOT / "scripts/roster_cta_snippets.py").read_text(encoding="utf-8")
MODERATE = (ROOT / "docs/ticker-board/moderate.html").read_text(encoding="utf-8")
INDEX = (ROOT / "docs/index.html").read_text(encoding="utf-8")


def test_ticker_no_longer_polls_every_four_seconds():
    assert "document.hidden ? 20000 : 4000" not in TICKER
    assert "setTimeout(pollMessages, 4000)" not in TICKER
    assert "POLL_VISIBLE_MS = 180000" in TICKER
    assert "nextPollDelay" in TICKER
    assert "RosterMantle" in TICKER


def test_ticker_keeps_last_good_store_and_images_on_disk():
    assert "rosterTickerStoreV1" in TICKER
    assert "rosterTickerImgCacheV1" in TICKER
    assert "lastStoreFromNetwork" in TICKER
    assert "if (removed && lastStoreFromNetwork)" in TICKER
    assert "readFullStore(true)" in TICKER


def test_banner_store_uses_overlay_cache_and_refuses_blind_saves():
    assert "rosterBannerOverlayV1" in STORE
    assert "rosterBannerImgCacheV1" in STORE
    assert 'if (!overlayFetchOk) throw new Error("overlay-offline")' in STORE or (
        "if (!overlayFetchOk) throw new Error('overlay-offline')" in STORE
    )
    assert "RosterMantle" in STORE


def test_banner_changer_does_not_fallback_custom_to_static_path():
    assert "if (/^custom:/i.test(String(name || ''))) return '';" in CHANGER
    assert "BANNER_STORE_VER = '20260910a'" in CHANGER


def test_pages_load_busted_script_versions():
    assert "holiday-ticker.js?v=20260910a" in SNIPPETS
    assert "banner-store.js?v=20260910a" in SNIPPETS
    assert "banner-changer.js?v=20260910a" in SNIPPETS
    assert "holiday-ticker.js?v=20260910a" in INDEX
    assert "banner-store.js?v=20260910a" in INDEX
    assert "holiday-ticker.js?v=20260814r" not in INDEX


def test_moderate_board_uses_ticker_cache():
    assert "rosterTickerStoreV1" in MODERATE
    assert "rosterTickerImgCacheV1" in MODERATE
    assert "readStore(true)" in MODERATE
