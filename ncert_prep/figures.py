"""Cut the numbered figures out of an NCERT chapter PDF (with pdfium).

NCERT pages carry a full-page background, a diagonal "© NCERT not to be republished"
watermark and page-number art; the figures are vector drawings (sometimes tens of thousands
of paths) or images split into thin strips, so they cannot simply be extracted. Instead:
1. captions ("Fig. 7.1", "Figure 1.2", "Fig.11.1 : A tester") are found in the page text;
2. the page's drawings and pictures (not text, background, watermark or page art) are
   painted onto a coarse grid and joined into regions;
3. each caption gets the region just above it (or beside it), which is rendered at print
   quality. The watermark is left in place: the figures stay NCERT's, credited in the PDF.

find_figures(pdf_bytes) -> [{"number": "7.1", "caption": "...", "page": 4, "png": bytes,
                             "width": pt, "height": pt}]
"""
from __future__ import annotations

import io
import re
from collections import deque

import pypdfium2 as pdfium
import pypdfium2.raw as raw

CAPTION = re.compile(r"^Fig(?:ure)?\.?\s*(\d+\.\d+)\s*(\([a-z]\))?(.*)$", re.I)
CELL = 3.0           # pt per grid cell
GAP = 12.0           # pt: drawings closer than this are one figure
MAX_GAP = 80.0       # pt: largest gap between a figure and its caption
PAD = 6.0            # pt: margin around the cut-out
DPI = 200


def _page_objects(page, form=None, depth=0):
    """Paths and images on the page, descending into forms that sit on the page."""
    W, H = page.get_mediabox()[2:]
    for obj in page.get_objects(max_depth=0, form=form):
        if obj.type == raw.FPDF_PAGEOBJ_FORM:
            l, b, r, t = obj.get_bounds()
            if l < -2 or b < -2 or r > W + 2 or t > H + 2:      # background / watermark layer
                continue
            if depth < 6:
                yield from _page_objects(page, obj, depth + 1)
        elif obj.type in (raw.FPDF_PAGEOBJ_PATH, raw.FPDF_PAGEOBJ_IMAGE):
            yield obj


_XH = set("acemnorsuvwxz")   # lowercase letters without ascenders/descenders: their height is the x-height


def _lines(textpage) -> list[dict]:
    """Text lines with their boxes (PDF coordinates) and letter size (x-height, 0 if unknown).
    Each line also gets "small" (printed smaller than the page's body text, like figure labels)."""
    n = textpage.count_chars()
    text = textpage.get_text_range(0, n) if n else ""
    out, start, all_xh = [], 0, []
    for i in range(len(text) + 1):
        if i == len(text) or text[i] in "\r\n":
            if i > start:
                boxes, xh = [], []
                for j in range(start, i):
                    if text[j].isspace():
                        continue
                    bx = textpage.get_charbox(j)
                    boxes.append(bx)
                    if text[j] in _XH:
                        xh.append(round(bx[3] - bx[1], 1))
                if boxes:
                    all_xh += xh
                    out.append({"text": text[start:i].strip(), "xh": sorted(xh)[len(xh) // 2] if xh else 0.0,
                                "box": (min(b[0] for b in boxes), min(b[1] for b in boxes),
                                        max(b[2] for b in boxes), max(b[3] for b in boxes))})
            start = i + 1
    body = max(set(all_xh), key=all_xh.count) if all_xh else 0.0
    for ln in out:
        ln["small"] = bool(body and ln["xh"] and ln["xh"] < 0.88 * body)
        ln["body"] = bool(body and ln["xh"] >= 0.92 * body and len(ln["text"]) > 12 and len(ln["text"].split()) >= 3)
    return out


def _captions(lines: list[dict]) -> list[dict]:
    found, seen = [], set()
    for k, line in enumerate(lines):
        text = re.sub(r"(Fig(?:ure)?\.?\s*\d+\.\d+)(?:\s*\1)+", r"\1", line["text"])   # NCERT's overprinted bold
        m = CAPTION.match(text)
        if not m:
            continue
        rest = m.group(3).strip()
        # "Fig. 1.1. Burn the ribbon…" or "Fig. 7.2)." continue a sentence: not a caption
        if re.match(r"^[.)\],;]", rest) and not re.match(r"^[.:]\s*[A-Z][^.]{0,80}$", rest):
            continue
        if len(rest) > 90:
            continue
        number = m.group(1) + (m.group(2) or "")
        caption = re.sub(r"^[:.\-–]\s*", "", rest)
        box = line["box"]
        # the description may continue on up to three lines below ("Figure 1.1" / "Burning of a …")
        for nxt in lines[k + 1:k + 4]:
            close = 0 <= box[1] - nxt["box"][3] < 8 + (6 if not caption else 0)
            same_col = nxt["box"][0] < box[2] and nxt["box"][2] > box[0]
            if not (close and same_col) or len(nxt["text"]) > 90 or CAPTION.match(nxt["text"]):
                break
            if nxt.get("body") and len(nxt["text"]) > (40 if caption else 60):
                break                                            # body text after the caption
            caption = (caption + " " + nxt["text"]).strip()
            box = (min(box[0], nxt["box"][0]), nxt["box"][1], max(box[2], nxt["box"][2]), box[3])
        if number not in seen:
            seen.add(number)
            found.append({"number": number, "caption": caption, "box": box})
    return found


def _regions(boxes: list[tuple], W: float, H: float) -> list[list[float]]:
    """Join boxes (PDF coordinates) that lie within GAP of each other into regions."""
    cols, rows = int(W / CELL) + 2, int(H / CELL) + 2
    grid = bytearray(cols * rows)
    g = GAP / 2
    for l, b, r, t in boxes:
        c0, c1 = max(0, int((l - g) / CELL)), min(cols - 1, int((r + g) / CELL))
        r0, r1 = max(0, int((b - g) / CELL)), min(rows - 1, int((t + g) / CELL))
        for row in range(r0, r1 + 1):
            base = row * cols
            grid[base + c0: base + c1 + 1] = b"\x01" * (c1 - c0 + 1)
    seen = bytearray(cols * rows)
    out = []
    for start in range(cols * rows):
        if not grid[start] or seen[start]:
            continue
        seen[start] = 1
        q = deque([start])
        cmin = cmax = start % cols
        rmin = rmax = start // cols
        while q:
            i = q.popleft()
            row, col = divmod(i, cols)
            cmin, cmax, rmin, rmax = min(cmin, col), max(cmax, col), min(rmin, row), max(rmax, row)
            for j in (i - 1 if col else -1, i + 1 if col < cols - 1 else -1, i - cols, i + cols):
                if 0 <= j < cols * rows and grid[j] and not seen[j]:
                    seen[j] = 1
                    q.append(j)
        out.append([cmin * CELL + g, rmin * CELL + g, (cmax + 1) * CELL - g, (rmax + 1) * CELL - g])
    return out


def _page_figures(page, textpage) -> list[tuple[dict, list[float]]]:
    l0, b0, r0, t0 = page.get_cropbox()
    W, H = r0 - l0, t0 - b0
    lines = _lines(textpage)
    caps = _captions(lines)
    if not caps:
        return []
    textlines = [((ln["box"][0] + ln["box"][2]) / 2, (ln["box"][1] + ln["box"][3]) / 2)
                 for ln in lines if len(ln["text"].split()) >= 2 and not ln["small"]]
    boxes = []
    for obj in _page_objects(page):
        l, b, r, t = obj.get_bounds()
        w, h = r - l, t - b
        if w < 0.5 and h < 0.5:
            continue
        if w > 0.85 * W and h > 0.85 * H:                      # full-page background picture
            continue
        cy = (b + t) / 2 - b0
        if cy < 0.15 * H or cy > 0.90 * H:                     # page-number art, running heads
            continue
        if obj.type == raw.FPDF_PAGEOBJ_PATH and w * h > 0.015 * W * H:
            inside = sum(1 for x, y in textlines if l <= x <= r and b <= y <= t)
            if inside >= 3:                                     # shaded box behind text (e.g. Activity)
                continue
        if w > 0.9 * W and h < 3:                              # full-width rules
            continue
        boxes.append((l, b, r, t))
    regions = _regions(boxes, r0 + 10, t0 + 10)
    # a region that is mostly text lines (e.g. a table of words) is not a figure drawing
    out, used = [], set()
    for cap in caps:
        cl, cb, cr, ct = cap["box"]
        cx = (cl + cr) / 2
        best, score = None, None
        for i, (l, b, r, t) in enumerate(regions):
            if i in used or (r - l) < 25 or (t - b) < 6 or ((t - b) < 20 and (r - l) < 60):
                continue
            if b >= ct - 4 and b - ct <= MAX_GAP and min(r, cr + 80) > max(l, cl - 80):     # above the caption
                s = (b - ct) + abs((l + r) / 2 - cx) * 0.15
            elif b <= ct and t >= cb - 4 and min(abs(r - cl), abs(l - cr)) <= MAX_GAP and (r <= cl + 6 or l >= cr - 6):
                s = 40 + min(abs(r - cl), abs(l - cr))                                         # beside it
            elif b < ct and t > ct + 20 and l <= cx <= r:
                s = 60 + abs((l + r) / 2 - cx) * 0.15     # reaches down through the caption: cut at the caption
            else:
                continue
            if score is None or s < score:
                best, score = i, s
        if best is not None:
            used.add(best)
            region = list(regions[best])
            if region[1] < ct:
                region[1] = ct + 1
            fitted = _fit(region, lines, caps, cap)
            if fitted:
                out.append((cap, fitted))
    return out


def _fit(region: list[float], lines: list[dict], caps: list[dict], cap: dict) -> list[float]:
    """Take in nearby labels (small text, single letters), keep out body text and captions."""
    l, b, r, t = region
    start_h, start_w = t - b, r - l
    cap_boxes = [c["box"] for c in caps]

    def is_label(ln):
        s = ln["text"]
        if ln["box"] in cap_boxes or CAPTION.match(s) or len(s) > 40 or len(s.split()) > 6:
            return False
        tokens = s.split()
        return ln["small"] or (len(s) <= 4 and not ln["body"]) or all(len(x) <= 4 for x in tokens)   # "A", "B 50° 70° C"

    for _ in range(3):                      # labels can chain (a label beside a label)
        grew = False
        for ln in lines:
            x0, y0, x1, y1 = ln["box"]
            near = x0 <= r + 14 and x1 >= l - 14 and y0 <= t + 8 and y1 >= b - 8
            inside = x0 >= l and x1 <= r and y0 >= b and y1 <= t
            if near and not inside and is_label(ln):
                l, b, r, t = min(l, x0), min(b, y0), max(r, x1), max(t, y1)
                grew = True
        if not grew:
            break
    # body text overlapping the region: move the nearest edge past it
    def is_text(x):
        return not x["small"] and len(x["text"].split()) >= 2 and len(x["text"]) >= 6 and not is_label(x)
    for ln in sorted((x for x in lines if is_text(x)), key=lambda x: -(x["box"][2] - x["box"][0])):
        x0, y0, x1, y1 = ln["box"]
        if x1 <= l or x0 >= r or y1 <= b or y0 >= t:
            continue
        w, h = r - l, t - b
        cuts = {"top": t - y0, "bottom": y1 - b, "left": x1 - l, "right": r - x0}
        side = min(cuts, key=cuts.get)
        if cuts[side] > 0.3 * (h if side in ("top", "bottom") else w):
            continue                         # text right through the middle: leave it
        if side == "top":
            t = y0 - 1
        elif side == "bottom":
            b = y1 + 1
        elif side == "left":
            l = x1 + 1
        else:
            r = x0 - 1
    cb, ct = cap["box"][1], cap["box"][3]
    if b < ct < t:                           # the caption is printed under the figure by the app
        b = ct + 1
    # still several lines of ordinary text inside: not a clean figure, leave it out
    inside = sum(1 for x in lines if is_text(x) and len(x["text"].split()) >= 3
                 and x["box"][0] >= l - 1 and x["box"][2] <= r + 1 and x["box"][1] >= b - 1 and x["box"][3] <= t + 1)
    if inside >= 3:
        return None
    wordy = sum(1 for x in lines if len(x["text"].split()) >= 3 and not CAPTION.match(x["text"])
                and x["box"][0] >= l - 1 and x["box"][2] <= r + 1 and x["box"][1] >= b - 1 and x["box"][3] <= t + 1)
    if wordy >= 5:                           # many lines of (small) prose, e.g. margin notes
        return None
    if (t - b) < 0.4 * start_h or (r - l) < 0.4 * start_w or (t - b) < 20:
        return None                          # trimming took most of it away: not a clean figure
    return [l, b, r, t]


def find_figures(pdf_bytes: bytes, dpi: int = DPI, log=None) -> list[dict]:
    """Numbered figures in the PDF, in page order, each rendered as a PNG."""
    out = []
    doc = pdfium.PdfDocument(pdf_bytes)
    try:
        for pno in range(len(doc)):
            page = doc[pno]
            textpage = page.get_textpage()
            l0, b0, r0, t0 = page.get_cropbox()
            for cap, (l, b, r, t) in _page_figures(page, textpage):
                ct = cap["box"][3]
                low = ct + 0.5 if ct <= b + 1 else b - PAD     # caption below: stop above it (the PDF prints its own)
                l, b, r, t = max(l0, l - PAD), max(b0, low), min(r0, r + PAD), min(t0, t + PAD)
                if (t - b) > 0.8 * (t0 - b0):          # most of a page: not one figure
                    continue
                img = page.render(scale=dpi / 72, crop=(l - l0, b - b0, r0 - r, t0 - t)).to_pil()
                buf = io.BytesIO()
                img.convert("RGB").save(buf, "PNG", optimize=True)
                out.append({"number": cap["number"], "caption": cap["caption"], "page": pno + 1,
                            "png": buf.getvalue(), "width": r - l, "height": t - b})
            textpage.close()
            page.close()
    finally:
        doc.close()
    if log:
        log(f"Found {len(out)} numbered figures in the chapter pages.")
    return out


def figure_key(number: str) -> tuple:
    m = re.match(r"(\d+)\.(\d+)(?:\(([a-z])\))?", number)
    return (int(m.group(1)), int(m.group(2)), m.group(3) or "") if m else (999, 999, number)
