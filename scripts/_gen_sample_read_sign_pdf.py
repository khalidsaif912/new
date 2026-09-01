#!/usr/bin/env python3
"""Generate bilingual sample PDF for Read and Sign."""
from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "read-and-sign" / "files" / "2026-08-12-sample-circular-read-and-sign.pdf"
FONT_AR = Path(r"C:\Windows\Fonts\NotoNaskhArabic-Regular.ttf")
FONT_AR_B = Path(r"C:\Windows\Fonts\NotoNaskhArabic-Bold.ttf")
FONT_EN = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_EN_B = Path(r"C:\Windows\Fonts\arialbd.ttf")


class PDF(FPDF):
    def header(self) -> None:
        self.set_fill_color(15, 118, 110)
        self.rect(0, 0, 210, 22, "F")
        self.set_xy(10, 6)
        self.set_font("ArBold", size=14)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, "إقرار — تعميم تجريبي", align="C")
        self.ln(18)


def main() -> None:
    pdf = PDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 28, 18)
    pdf.add_font("Ar", fname=str(FONT_AR))
    pdf.add_font("ArBold", fname=str(FONT_AR_B))
    pdf.add_font("En", fname=str(FONT_EN))
    pdf.add_font("EnBold", fname=str(FONT_EN_B))
    pdf.set_text_shaping(True)
    pdf.add_page()

    pdf.set_text_color(15, 23, 42)
    pdf.set_xy(18, 32)
    pdf.set_font("ArBold", size=16)
    pdf.multi_cell(w=174, h=10, text="تعميم تجريبي — اقرأ وأقرّ بالاطلاع", align="R")
    pdf.ln(2)

    pdf.set_font("Ar", size=12)
    for line in [
        "التاريخ: 2026-08-12",
        "القسم: الصادر",
        "",
        "هذا تعميم اختباري لصفحة الإقرار.",
        "المطلوب:",
        "1) فتح الملف وقراءته.",
        "2) الضغط على زر «أقرّ بالاطلاع».",
        "3) يمكن مراجعة السجل لمعرفة من اطّلع ومن لم يطلع.",
        "",
        "ملاحظة: التعميمات الحقيقية تُضاف عبر مجلد المزامنة.",
    ]:
        pdf.set_x(18)
        pdf.multi_cell(w=174, h=8, text=line or " ", align="R")

    pdf.ln(6)
    y = pdf.get_y()
    pdf.set_draw_color(203, 213, 225)
    pdf.line(20, y, 190, y)
    pdf.ln(8)

    pdf.set_x(18)
    pdf.set_font("EnBold", size=14)
    pdf.multi_cell(w=174, h=8, text="Sample Circular — Read and Sign (Test)", align="L")
    pdf.ln(1)
    pdf.set_font("En", size=11)
    for line in [
        "Date: 2026-08-12",
        "Department: Export (Al Sadir)",
        "",
        "This is a test circular for the Read and Sign page.",
        "Required actions:",
        "1) Open and read this file.",
        "2) Press Acknowledge.",
        "3) Use the log to see who has read it.",
    ]:
        pdf.set_x(18)
        pdf.multi_cell(w=174, h=7, text=line or " ", align="L")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
