"""Render exam-preparation material as a printable A4 PDF (ReportLab)."""
from __future__ import annotations

import datetime as dt
import io
import math
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (CondPageBreak, Image, KeepTogether, PageBreak, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

import generator

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
    "cell": ParagraphStyle("cell", fontName=FONT, fontSize=9, leading=12, textColor=INK),
    "cell_b": ParagraphStyle("cell_b", fontName=BOLD, fontSize=9, leading=12, textColor=INK),
    "cell_h": ParagraphStyle("cell_h", fontName=BOLD, fontSize=9, leading=12, textColor=colors.white),
    "node": ParagraphStyle("node", fontName=FONT, fontSize=9, leading=12, textColor=INK, alignment=TA_CENTER),
    "cbullet": ParagraphStyle("cbullet", fontName=FONT, fontSize=9, leading=12, textColor=INK, leftIndent=9, bulletIndent=0),
    "caption": ParagraphStyle("caption", fontName=FONT, fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_CENTER, spaceAfter=4),
    "passage": ParagraphStyle("passage", fontName=FONT, fontSize=10, leading=14, textColor=INK),
}
WIDTH = A4[0] - 30 * mm   # text width between the margins
SOFT2 = colors.HexColor("#f7f9fc")


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


def _question(num, text: str, tag: str = "", options=None, answer: str = "") -> KeepTogether:
    """num: 1, 2, ... (printed "1.") or a ready label such as "(a)"."""
    tag_html = f' <font name="{FONT}" size="8.5" color="#52606d">[{escape(tag)}]</font>' if tag else ""
    label = f"{num}." if isinstance(num, int) else escape(str(num))
    parts = [Paragraph(f"{label}&nbsp;&nbsp;{_t(text)}{tag_html}", S["q"])]
    for i, opt in enumerate(options or []):
        opt = str(opt).strip()
        prefix = "" if re.match(r"^\(?[a-dA-D][).]", opt) else f"({'abcd'[i] if i < 4 else i + 1}) "
        parts.append(Paragraph(_t(prefix + opt), S["opt"]))
    parts += _answer(answer)
    return KeepTogether(parts)


# ------------------------------------------------------------------ diagrams

def _arrow(x1, y1, x2, y2, color=ACCENT, head=2.4 * mm) -> list:
    ang = math.atan2(y2 - y1, x2 - x1)
    bx, by = x2 - head * math.cos(ang), y2 - head * math.sin(ang)
    px, py = math.sin(ang) * head * 0.45, -math.cos(ang) * head * 0.45
    return [Line(x1, y1, bx, by, strokeColor=color, strokeWidth=1.1),
            Polygon([x2, y2, bx + px, by + py, bx - px, by - py], fillColor=color, strokeColor=color, strokeWidth=0.5)]


def _wrapped(text: str, width: float, size: float = 9, font: str = BOLD, max_lines: int = 4) -> list[str]:
    lines = simpleSplit(str(text), font, size, width) or [""]
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .,;") + "…"
    return lines


def _box(d: Drawing, cx: float, cy: float, w: float, lines: list[str], size: float = 9, fill=SOFT) -> float:
    """Draw a box centred on (cx, cy) with centred text lines; return its height."""
    lead = size * 1.25
    h = len(lines) * lead + 7
    d.add(Rect(cx - w / 2, cy - h / 2, w, h, rx=4, ry=4, fillColor=fill, strokeColor=ACCENT, strokeWidth=0.9))
    top = cy + (len(lines) * lead) / 2 - size
    for i, line in enumerate(lines):
        d.add(String(cx, top - i * lead + 1.5, line, fontName=BOLD, fontSize=size, fillColor=INK, textAnchor="middle"))
    return h


def _node_text(node: dict) -> str:
    details = [str(x).strip() for x in node.get("details") or [] if str(x).strip()]
    return f'<font name="{BOLD}">{_t(node.get("label", ""))}</font>' + (
        "<br/>" + "<br/>".join(_t(x) for x in details) if details else "")


def _flow_diagram(nodes: list[dict]) -> Table:
    """Process steps top to bottom, joined by arrows."""
    w = 120 * mm
    rows, styles = [], [("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6)]
    for i, node in enumerate(nodes):
        if i:
            arrow = Drawing(w - 12, 7 * mm)
            for shape in _arrow((w - 12) / 2, 6.5 * mm, (w - 12) / 2, 0.5 * mm):
                arrow.add(shape)
            rows.append([arrow])
            styles += [("TOPPADDING", (0, len(rows) - 1), (0, len(rows) - 1), 0),
                       ("BOTTOMPADDING", (0, len(rows) - 1), (0, len(rows) - 1), 0)]
        rows.append([Paragraph(_node_text(node), S["node"])])
        r = len(rows) - 1
        styles += [("BACKGROUND", (0, r), (0, r), SOFT), ("BOX", (0, r), (0, r), 0.9, ACCENT),
                   ("TOPPADDING", (0, r), (0, r), 4), ("BOTTOMPADDING", (0, r), (0, r), 5)]
    t = Table(rows, colWidths=[w], hAlign="CENTER")
    t.setStyle(TableStyle(styles))
    return t


def _cycle_diagram(nodes: list[dict]) -> list:
    """Nodes round an ellipse, clockwise from the top, the last leading back to the first."""
    n = len(nodes)
    bw = 42 * mm if n <= 5 else 34 * mm
    rx, ry = 64 * mm, 36 * mm
    height = 2 * ry + 19 * mm
    d = Drawing(WIDTH, height)
    cx, cy = WIDTH / 2, height / 2
    centres, sizes = [], []
    for i, node in enumerate(nodes):
        ang = math.pi / 2 - 2 * math.pi * i / n
        x, y = cx + rx * math.cos(ang), cy + ry * math.sin(ang)
        lines = _wrapped(f"{i + 1}. {node.get('label', '')}", bw - 8, max_lines=3)
        h = len(lines) * 9 * 1.25 + 7
        centres.append((x, y))
        sizes.append((bw / 2, h / 2))
        _box(d, x, y, bw, lines)

    def edge(c, other, half):
        dx, dy = other[0] - c[0], other[1] - c[1]
        t = min(half[0] / abs(dx) if dx else 1e9, half[1] / abs(dy) if dy else 1e9)
        return c[0] + dx * t, c[1] + dy * t

    for i in range(n):
        a, b = centres[i], centres[(i + 1) % n]
        x1, y1 = edge(a, b, sizes[i])
        x2, y2 = edge(b, a, sizes[(i + 1) % n])
        dist = math.hypot(x2 - x1, y2 - y1)
        if dist > 4 * mm:
            ux, uy = (x2 - x1) / dist, (y2 - y1) / dist
            for shape in _arrow(x1 + ux * 1.5 * mm, y1 + uy * 1.5 * mm, x2 - ux * 1.5 * mm, y2 - uy * 1.5 * mm):
                d.add(shape)
    out = [d]
    legend = [Paragraph(f'<font name="{BOLD}">{i}. {_t(nd.get("label", ""))}:</font> '
                        + _t("; ".join(str(x) for x in nd.get("details") or [])), S["cbullet"])
              for i, nd in enumerate(nodes, 1) if nd.get("details")]
    return out + legend


def _concept_map(title: str, nodes: list[dict]) -> list:
    """The central idea on top, branches underneath with their sub-points."""
    out = []
    for start in range(0, len(nodes), 5):
        chunk = nodes[start:start + 5]
        cols = len(chunk)
        colw = WIDTH / cols
        lines = _wrapped(title, 90 * mm, size=10, max_lines=2)
        root_h = len(lines) * 10 * 1.25 + 7
        h = root_h + 12 * mm
        d = Drawing(WIDTH, h)
        _box(d, WIDTH / 2, h - root_h / 2 - 1, min(100 * mm, max(50 * mm, max(
            pdfmetrics.stringWidth(x, BOLD, 10) for x in lines) + 14)), lines, size=10, fill=colors.HexColor("#dde8f6"))
        bar = 5 * mm
        top = h - root_h - 1
        d.add(Line(WIDTH / 2, top, WIDTH / 2, bar, strokeColor=ACCENT, strokeWidth=1.1))
        xs = [colw * (i + 0.5) for i in range(cols)]
        if cols > 1:
            d.add(Line(xs[0], bar, xs[-1], bar, strokeColor=ACCENT, strokeWidth=1.1))
        for x in xs:
            for shape in _arrow(x, bar, x, 0.3 * mm, head=1.8 * mm):
                d.add(shape)
        cells = []
        for node in chunk:
            cell = [Paragraph(_t(node.get("label", "")), ParagraphStyle("nb", parent=S["cell_b"], alignment=TA_CENTER, textColor=ACCENT))]
            cell += [Paragraph(_t(x), S["cbullet"], bulletText="•") for x in node.get("details") or []]
            cells.append(cell)
        t = Table([cells], colWidths=[colw] * cols)
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (-1, -1), SOFT2),
                               ("BOX", (0, 0), (-1, -1), 0.9, ACCENT), ("INNERGRID", (0, 0), (-1, -1), 0.6, ACCENT),
                               ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
        out += [d, t, Spacer(1, 4)]
    return out


def _diagram(dg: dict) -> list:
    nodes = [nd for nd in dg.get("nodes") or [] if str(nd.get("label", "")).strip()]
    if not nodes:
        return []
    kind = dg.get("kind")
    head = [Paragraph(_t(dg.get("title", "")), S["topic"])]
    if kind == "concept_map":
        body = _concept_map(dg.get("title", ""), nodes)
    elif kind == "cycle" and 3 <= len(nodes) <= 8:
        body = _cycle_diagram(nodes)
    else:
        body = [_flow_diagram(nodes)]
    caption = [Paragraph(_t(dg["caption"]), S["caption"])] if dg.get("caption") else []
    return [KeepTogether(head + body + [Spacer(1, 3)] + caption), Spacer(1, 6)]


# ------------------------------------------------------------------ figures from the book

def _fig_id(number: str) -> str:
    return re.sub(r"[^0-9a-z.()]", "", str(number).lower()).strip(".")


def _book_figures_flow(book: list[dict], notes: list[dict]) -> list:
    """The book's own figures (cut from the NCERT pages) with the AI's notes on each."""
    import figures as figmod
    by_id = {}
    for n in notes or []:
        by_id.setdefault(_fig_id(n.get("figure", "")), n)
    out, shown = [], set()
    credit = ParagraphStyle("credit", parent=S["caption"], fontSize=7.5, leading=9.5, spaceAfter=2)
    for fig in sorted(book, key=lambda f: figmod.figure_key(f["number"])):
        fid = _fig_id(fig["number"])
        if fid in shown:
            continue
        shown.add(fid)
        w, h = float(fig["width"]), float(fig["height"])
        scale = min(1.0, WIDTH / w, (105 * mm) / h)
        if w * scale < 70 * mm:                      # small drawings: enlarge a little for print
            scale = min(70 * mm / w, (105 * mm) / h, WIDTH / w)
        img = Image(io.BytesIO(fig["png"]), width=w * scale, height=h * scale)
        img.hAlign = "CENTER"
        cap = f"Fig. {fig['number']}" + (f"  {fig['caption']}" if fig.get("caption") else "")
        parts = [img, Spacer(1, 2), Paragraph(_t(cap), ParagraphStyle("figcap", parent=S["caption"], fontName=BOLD,
                                                                     textColor=INK, fontSize=9, leading=11)),
                 Paragraph(_t("From the NCERT textbook (© NCERT), for study. Page "
                              f"{fig['page']} of the chapter pages used."), credit)]
        note = by_id.get(fid)
        parts += [Paragraph(_t(x), S["bullet"], bulletText="•") for x in (note or {}).get("points", [])]
        out += [KeepTogether(parts), Spacer(1, 8)]
    missing = [n for n in notes or [] if _fig_id(n.get("figure", "")) not in shown]
    if missing:
        out.append(Paragraph(_t("Other figures in the chapter (see them in the book):"), S["topic"]))
        for n in missing:
            out.append(Paragraph(_t(f"Fig. {n.get('figure', '')}"), S["q"]))
            out += [Paragraph(_t(x), S["bullet"], bulletText="•") for x in n.get("points", [])]
    if not out:
        out.append(Paragraph(_t("No numbered figures were found in these pages."), S["body"]))
    return out


# ------------------------------------------------------------------ tables

def _grid(header: list[str], rows: list[list[str]], widths: list[float], bold_first=True) -> Table:
    data = [[Paragraph(_t(h), S["cell_h"]) for h in header]]
    for row in rows:
        data.append([Paragraph(_t(c), S["cell_b"] if (bold_first and i == 0) else S["cell"]) for i, c in enumerate(row)])
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [("BACKGROUND", (0, 0), (-1, 0), ACCENT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9fb3c8")),
             ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    style += [("BACKGROUND", (0, r), (-1, r), SOFT2) for r in range(2, len(data), 2)]
    t.setStyle(TableStyle(style))
    return t


# ------------------------------------------------------------------ chapter

def _case(num, case: dict, answers: bool = True, tag_total: bool = False) -> list:
    """A case-based question: passage, then sub-questions (a), (b), ..."""
    qs = case.get("questions") or []
    total = sum(int(q.get("marks") or 0) for q in qs)
    label = f"{num}." if isinstance(num, int) else str(num)
    tag = f' <font name="{FONT}" size="8.5" color="#52606d">[{total} marks]</font>' if tag_total and total else ""
    box = Table([[Paragraph(_t(case.get("passage", "")), S["passage"])]], colWidths=[WIDTH - 18])
    box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), SOFT), ("BOX", (0, 0), (-1, -1), 0.6, ACCENT),
                             ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7)]))
    box.hAlign = "RIGHT"
    out = [KeepTogether([Paragraph(f"{escape(label)}&nbsp;&nbsp;Read the passage and answer the questions that follow.{tag}", S["q"]),
                         Spacer(1, 3), box])]
    for j, q in enumerate(qs):
        m = int(q.get("marks") or 0)
        out.append(_question(f"({'abcdefgh'[j] if j < 8 else j + 1})", q.get("question", ""),
                             f"{m} mark{'s' if m != 1 else ''}" if m else "", q.get("options"),
                             q.get("answer", "") if answers else ""))
    return out


def _chapter_flow(ch: dict, meta: dict, sections: list[str]) -> list:
    flow = [Paragraph(_t(f"Chapter {ch['number']}: {ch['chapter_title']}"), S["chapter"])]
    if ch.get("page_note"):
        flow.append(Paragraph(_t(ch["page_note"].strip(" ,")), S["small_c"]))
    flow.append(Paragraph(_t(f"Source: {ch['url']}"), ParagraphStyle("src", parent=S["body"], fontSize=8, textColor=MUTED)))
    flow.append(Spacer(1, 6))

    n = 0

    def bar(title):
        nonlocal n
        n += 1
        return [Spacer(1, 8), CondPageBreak(50 * mm), _section_bar(f"{n}. {title}"), Spacer(1, 4)]

    for key in sections:
        items = ch.get(key) or []
        if key == "summary":
            flow += bar("Summary Notes")
            for block in items:
                parts = [Paragraph(_t(block["topic"]), S["topic"])]
                parts += [Paragraph(_t(p), S["bullet"], bulletText="•") for p in block["points"]]
                flow.append(KeepTogether(parts[:3]))
                flow += parts[3:]
        elif key == "figures":
            flow += bar("Figures from the NCERT Book")
            flow += _book_figures_flow(ch.get("book_figures") or [], items)
        elif key == "diagrams":
            flow += bar("Diagrams to Understand the Chapter")
            for dg in items:
                flow += _diagram(dg)
        elif key == "key_points":
            flow += bar("Key Points to Remember")
            rows = [[Paragraph("★", S["body"]), Paragraph(_t(k), S["body"])] for k in items]
            if rows:
                box = Table(rows, colWidths=[7 * mm, None])
                box.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), SOFT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                    ("BOX", (0, 0), (-1, -1), 0.6, ACCENT),
                ]))
                flow.append(box)
        elif key == "revision_table":
            flow += bar("Quick Revision Table")
            if items:
                flow.append(_grid(["Topic", "In short", "Remember"],
                                  [[r.get("topic", ""), r.get("in_short", ""), r.get("remember", "")] for r in items],
                                  [42 * mm, 80 * mm, WIDTH - 122 * mm]))
        elif key == "differences":
            flow += bar("Differences")
            for df in items:
                a, b = df.get("a", ""), df.get("b", "")
                flow.append(KeepTogether([
                    Paragraph(_t(f"Difference between {a} and {b}"), S["topic"]),
                    _grid(["Basis", a, b], [[r.get("basis", ""), r.get("a", ""), r.get("b", "")] for r in df.get("rows") or []],
                          [40 * mm, (WIDTH - 40 * mm) / 2, (WIDTH - 40 * mm) / 2])]))
                flow.append(Spacer(1, 4))
        elif key == "one_mark":
            flow += bar("One Mark Questions (1 mark each)")
            for i, q in enumerate(items, 1):
                flow.append(_question(i, q["question"], q.get("kind", ""), q.get("options"), q["answer"]))
        elif key == "short_answer":
            flow += bar("Short Answer Questions (2 / 3 marks)")
            for i, q in enumerate(sorted(items, key=lambda q: q["marks"]), 1):
                flow.append(_question(i, q["question"], f"{q['marks']} marks", None, q["answer"]))
        elif key == "long_answer":
            flow += bar("Long Answer Questions (5 marks)")
            for i, q in enumerate(items, 1):
                flow.append(_question(i, q["question"], "5 marks", None, q["answer"]))
        elif key == "case_based":
            flow += bar("Case-Based Questions")
            for i, case in enumerate(items, 1):
                flow += _case(i, case, tag_total=True)
    return flow


# ------------------------------------------------------------------ practice test

def _spread(items: list, k: int) -> list:
    """k items spread evenly through the list (all of them if there are no more than k)."""
    if len(items) <= k:
        return list(items)
    return [items[int(i * len(items) / k)] for i in range(k)]


def practice_paper(chapters: list[dict], sections: list[str]) -> list[tuple[str, int, list]]:
    """[(heading, marks per question or 0, questions)] picked from the chapters' questions."""
    pool = {k: [q for ch in chapters for q in ch.get(k) or []] for k in generator.QUESTION_SECTIONS if k in sections}
    paper = []
    if pool.get("one_mark"):
        paper.append(("Section A: 1 mark each", 1, [("one", q) for q in _spread(pool["one_mark"], 10)]))
    sa = pool.get("short_answer") or []
    two = _spread([q for q in sa if q.get("marks") == 2], 4)
    three = _spread([q for q in sa if q.get("marks") == 3], 4)
    if two:
        paper.append(("Section B: 2 marks each", 2, [("plain", q) for q in two]))
    if three:
        paper.append(("Section C: 3 marks each", 3, [("plain", q) for q in three]))
    if pool.get("long_answer"):
        paper.append(("Section D: 5 marks each", 5, [("plain", q) for q in _spread(pool["long_answer"], 3)]))
    if pool.get("case_based"):
        paper.append(("Section E: Case-based questions", 0, [("case", c) for c in _spread(pool["case_based"], 2)]))
    for i, (heading, _m, qs) in enumerate(paper):   # letters follow the sections actually present
        paper[i] = (f"Section {'ABCDE'[i]}:" + heading.split(":", 1)[1], _m, qs)
    return paper


def _practice_flow(chapters: list[dict], sections: list[str]) -> list:
    paper = practice_paper(chapters, sections)
    if not paper:
        return []
    total = sum(m * len(qs) if m else sum(sum(int(x.get("marks") or 0) for x in c.get("questions") or []) for _k, c in qs)
                for _h, m, qs in paper)
    chs = ", ".join(str(c["number"]) for c in chapters)
    flow = [PageBreak(), _section_bar("Practice Test"), Spacer(1, 6),
            Paragraph(_t(f"Chapter{'s' if len(chapters) > 1 else ''} {chs}  ·  Maximum marks: {total}  ·  "
                         "Answer all questions. The answer key is on the pages after the test."), S["body"]),
            Spacer(1, 4)]
    key, num = [], 0
    for heading, marks, qs in paper:
        flow += [Spacer(1, 6), Paragraph(_t(heading), S["topic"])]
        for kind, q in qs:
            num += 1
            if kind == "case":
                flow += _case(num, q, answers=False, tag_total=True)
                key += _case(num, q, answers=True)
                continue
            tag = q.get("kind", "") if kind == "one" else ""
            flow.append(_question(num, q["question"], tag, q.get("options"), ""))
            key.append(_question(num, q["question"], "", None, q["answer"]))
    return flow + [PageBreak(), _section_bar("Practice Test: Answer Key"), Spacer(1, 4)] + key


def render_pdf(meta: dict, chapters: list[dict], out_path: str | Path, sections=None) -> Path:
    """meta: cls, subject, book, code. chapters: generator output + number/url/page_note.
    sections: the ticked options (generator.ALL_OPTIONS); default: whatever the chapters contain."""
    out_path = Path(out_path)
    if sections is None:
        sections = [k for k in generator.SECTIONS if any(k in c for c in chapters)]
    practice = generator.PRACTICE_TEST in sections
    sections = generator.claude_sections(sections)
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
    contents = [generator.SECTIONS[k]["label"] for k in sections] + (["Practice test with answer key"] if practice else [])
    counts = {k: sum(len(c.get(k) or []) for c in chapters) for k in sections}
    names = {"one_mark": "one-mark", "short_answer": "short-answer", "long_answer": "long-answer",
             "case_based": "case-based"}
    qline = [f"{counts[k]} {names[k]}" for k in generator.QUESTION_SECTIONS if k in counts]
    qline = (", ".join(qline[:-1]) + " and " + qline[-1] if len(qline) > 1 else "".join(qline))
    flow = [Spacer(1, 50 * mm),
            Paragraph("CBSE Exam Preparation", S["title"]), Spacer(1, 6),
            Paragraph(_t(title + book_part.replace(" - ", "  ·  ")), S["subtitle"]), Spacer(1, 4),
            Paragraph(_t(ch_list), S["subtitle"]), Spacer(1, 14),
            Paragraph(_t("Contents: " + "  ·  ".join(f"{i}. {c}" for i, c in enumerate(contents, 1))), S["small_c"]),
            Spacer(1, 4),
            Paragraph(_t(f"{qline} questions with answers") if qline else "", S["small_c"]),
            Spacer(1, 60 * mm),
            Paragraph(_t("Based on the official NCERT textbook (ncert.nic.in). "
                         f"Prepared {dt.date.today():%d %B %Y}."), S["small_c"])]
    for ch in chapters:
        flow += [PageBreak()] + _chapter_flow(ch, meta, sections)
    if practice:
        flow += _practice_flow(chapters, sections)
    doc.build(flow, onLaterPages=on_page)
    return out_path
