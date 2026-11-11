"""Render exam-preparation material as a printable A4 PDF (ReportLab)."""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (CondPageBreak, KeepTogether, PageBreak, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

HERE = Path(__file__).resolve().parent

# A Unicode TrueType font is needed for symbols such as ₂ ² √ π → ⇌.
_FONT_CANDIDATES = [
    (HERE / "fonts" / "DejaVuSans.ttf", HERE / "fonts" / "DejaVuSans-Bold.ttf"),
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
     Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    (Path("/Library/Fonts/Arial Unicode.ttf"), Path("/Library/Fonts/Arial Unicode.ttf")),
    (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
]


def _register_fonts() -> tuple[str, str]:
    for regular, bold in _FONT_CANDIDATES:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("Body", str(regular)))
            pdfmetrics.registerFont(TTFont("Body-Bold", str(bold)))
            pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold",
                                          italic="Body", boldItalic="Body-Bold")
            return "Body", "Body-Bold"
    return "Helvetica", "Helvetica-Bold"  # fallback: some symbols may not print


FONT, BOLD = _register_fonts()
INK = colors.HexColor("#1f2933")
ACCENT = colors.HexColor("#1d4e89")
MUTED = colors.HexColor("#52606d")
SOFT = colors.HexColor("#eef3f9")
ANS = colors.HexColor("#0b6e4f")

S = {
    "title": ParagraphStyle("title", fontName=BOLD, fontSize=24, leading=30, alignment=TA_CENTER, textColor=ACCENT),
    "subtitle": ParagraphStyle("subtitle", fontName=FONT, fontSize=13, leading=18, alignment=TA_CENTER, textColor=INK),
    "small_c": ParagraphStyle("small_c", fontName=FONT, fontSize=9, leading=12, alignment=TA_CENTER, textColor=MUTED),
    "chapter": ParagraphStyle("chapter", fontName=BOLD, fontSize=17, leading=22, textColor=ACCENT, spaceAfter=4),
    "section": ParagraphStyle("section", fontName=BOLD, fontSize=13, leading=17, textColor=colors.white),
    "topic": ParagraphStyle("topic", fontName=BOLD, fontSize=11, leading=15, textColor=ACCENT, spaceBefore=6, spaceAfter=2),
    "body": ParagraphStyle("body", fontName=FONT, fontSize=10, leading=14, textColor=INK),
    "bullet": ParagraphStyle("bullet", fontName=FONT, fontSize=10, leading=14, textColor=INK, leftIndent=12, bulletIndent=2, spaceAfter=1),
    "q": ParagraphStyle("q", fontName=BOLD, fontSize=10, leading=14, textColor=INK, leftIndent=18, firstLineIndent=-18, spaceBefore=5),
    "opt": ParagraphStyle("opt", fontName=FONT, fontSize=10, leading=13.5, textColor=INK, leftIndent=30),
    "a": ParagraphStyle("a", fontName=FONT, fontSize=10, leading=14, textColor=INK, leftIndent=18),
    "a_bullet": ParagraphStyle("a_bullet", fontName=FONT, fontSize=10, leading=14, textColor=INK, leftIndent=30, bulletIndent=20),
}


def _t(text: str) -> str:
    """Escape for ReportLab's mini-markup; strip stray Markdown emphasis."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", str(text)).replace("`", "")
    return escape(text).replace("\n", "<br/>")


def _section_bar(title: str) -> Table:
    t = Table([[Paragraph(_t(title), S["section"])]], colWidths=["100%"])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _answer(text: str) -> list:
    """Answer lines starting with '- ' become bullets; other lines are paragraphs."""
    out, first = [], True
    for line in str(text).splitlines() or [""]:
        line = line.strip()
        if not line:
            continue
        label = '<font name="%s" color="#0b6e4f">Ans. </font>' % BOLD if first else ""
        if re.match(r"^[-•–]\s+", line):
            if first:
                out.append(Paragraph(label, S["a"]))
            out.append(Paragraph(_t(re.sub(r"^[-•–]\s+", "", line)), S["a_bullet"], bulletText="•"))
        else:
            out.append(Paragraph(label + _t(line), S["a"]))
        first = False
    return out


def _question(num: int, text: str, tag: str = "", options=None, answer: str = "") -> KeepTogether:
    tag_html = f' <font name="{FONT}" size="8.5" color="#52606d">[{escape(tag)}]</font>' if tag else ""
    parts = [Paragraph(f"{num}.&nbsp;&nbsp;{_t(text)}{tag_html}", S["q"])]
    for i, opt in enumerate(options or []):
        opt = str(opt).strip()
        prefix = "" if re.match(r"^\(?[a-dA-D][).]", opt) else f"({'abcd'[i] if i < 4 else i + 1}) "
        parts.append(Paragraph(_t(prefix + opt), S["opt"]))
    parts += _answer(answer)
    return KeepTogether(parts)


def _chapter_flow(ch: dict, meta: dict) -> list:
    flow = [Paragraph(_t(f"Chapter {ch['number']}: {ch['chapter_title']}"), S["chapter"])]
    if ch.get("page_note"):
        flow.append(Paragraph(_t(ch["page_note"].strip(" ,")), S["small_c"]))
    flow.append(Paragraph(_t(f"Source: {ch['url']}"), ParagraphStyle("src", parent=S["body"], fontSize=8, textColor=MUTED)))
    flow.append(Spacer(1, 6))

    # 1. Summary / notes
    flow += [_section_bar("1. Summary Notes"), Spacer(1, 4)]
    for block in ch["summary"]:
        items = [Paragraph(_t(block["topic"]), S["topic"])]
        items += [Paragraph(_t(p), S["bullet"], bulletText="•") for p in block["points"]]
        flow.append(KeepTogether(items[:3]))
        flow += items[3:]

    # 2. Key points
    flow += [Spacer(1, 8), CondPageBreak(60 * mm), _section_bar("2. Key Points to Remember"), Spacer(1, 4)]
    rows = [[Paragraph("★", S["body"]), Paragraph(_t(k), S["body"])] for k in ch["key_points"]]
    if rows:
        box = Table(rows, colWidths=[7 * mm, None])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SOFT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("BOX", (0, 0), (-1, -1), 0.6, ACCENT),
        ]))
        flow.append(box)

    # 3. One mark
    flow += [Spacer(1, 8), CondPageBreak(50 * mm), _section_bar("3. One Mark Questions (1 mark each)")]
    for i, q in enumerate(ch["one_mark"], 1):
        flow.append(_question(i, q["question"], q.get("kind", ""), q.get("options"), q["answer"]))

    # 4. Two / three mark
    flow += [Spacer(1, 8), CondPageBreak(50 * mm), _section_bar("4. Short Answer Questions (2 / 3 marks)")]
    for i, q in enumerate(sorted(ch["short_answer"], key=lambda q: q["marks"]), 1):
        flow.append(_question(i, q["question"], f"{q['marks']} marks", None, q["answer"]))

    # 5. Five mark
    flow += [Spacer(1, 8), CondPageBreak(50 * mm), _section_bar("5. Long Answer Questions (5 marks)")]
    for i, q in enumerate(ch["long_answer"], 1):
        flow.append(_question(i, q["question"], "5 marks", None, q["answer"]))
    return flow


def render_pdf(meta: dict, chapters: list[dict], out_path: str | Path) -> Path:
    """meta: cls, subject, book, code. chapters: generator output + number/url/page_note."""
    out_path = Path(out_path)
    title = f"Class {meta['cls']} {meta['subject']}"
    book_part = "" if meta["book"].strip().lower() == meta["subject"].strip().lower() else f" - {meta['book']}"

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONT, 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(15 * mm, 10 * mm, f"CBSE {title}{book_part} - Exam Preparation")
        canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f"Page {doc.page}")
        canvas.setStrokeColor(colors.HexColor("#cbd2d9"))
        canvas.line(15 * mm, 13 * mm, A4[0] - 15 * mm, 13 * mm)
        canvas.restoreState()

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=14 * mm, bottomMargin=18 * mm,
                            title=f"{title}{book_part} - Exam Preparation",
                            author="NCERT Exam Prep", subject="CBSE exam preparation notes")

    ch_list = ", ".join(f"Ch {c['number']}: {c['chapter_title']}" for c in chapters)
    totals = [sum(len(c[k]) for c in chapters) for k in ("one_mark", "short_answer", "long_answer")]
    flow = [Spacer(1, 50 * mm),
            Paragraph("CBSE Exam Preparation", S["title"]), Spacer(1, 6),
            Paragraph(_t(title + book_part.replace(" - ", "  ·  ")), S["subtitle"]), Spacer(1, 4),
            Paragraph(_t(ch_list), S["subtitle"]), Spacer(1, 14),
            Paragraph(_t("Contents: 1. Summary Notes  ·  2. Key Points  ·  3. One Mark Q&A  ·  "
                         "4. Short Answer (2/3 marks) Q&A  ·  5. Long Answer (5 marks) Q&A"), S["small_c"]),
            Spacer(1, 4),
            Paragraph(_t(f"{totals[0]} one-mark, {totals[1]} short-answer and {totals[2]} long-answer questions with answers"), S["small_c"]),
            Spacer(1, 60 * mm),
            Paragraph(_t("Based on the official NCERT textbook (ncert.nic.in). "
                         f"Prepared {dt.date.today():%d %B %Y}."), S["small_c"])]
    for ch in chapters:
        flow += [PageBreak()] + _chapter_flow(ch, meta)
    doc.build(flow, onLaterPages=on_page)
    return out_path
