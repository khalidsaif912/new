"""Training-style full names must get Arabic honorifics and AL- family joining."""

from __future__ import annotations

from roster_app.name_i18n import short_form_keys, transliterate_name


def test_transliterate_mr_title_and_al_join() -> None:
    ar = transliterate_name("Mr. BADAR YOUSUF NASSER AL BUSAIDI")
    assert ar.startswith("السيد ")
    assert "بدر" in ar
    assert "البوسعيدي" in ar
    assert "ال بوسعيدي" not in ar


def test_transliterate_miss_and_hyphen_al() -> None:
    ar = transliterate_name("Miss. HANAN HASSAN NASSER AL TOUQI")
    assert ar.startswith("الآنسة ")
    assert "حنان" in ar
    assert "التوقي" in ar

    ar2 = transliterate_name("Mr. QASIM ALI KHAMIS AL-AJMI")
    assert ar2.startswith("السيد ")
    assert "العجمي" in ar2


def test_short_form_keys() -> None:
    keys = short_form_keys("ADIL MOHAMMAD SABEET AL ORAIMI")
    assert "ADIL AL ORAIMI" in keys
