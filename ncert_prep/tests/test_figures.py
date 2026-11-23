"""figures.py on a made-up textbook page (no network): two numbered figures with labels,
captions in both NCERT styles, body text around them, a sentence that mentions a figure,
and a shaded Activity box next to a figure.   Run:  python tests/test_figures.py
"""
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from reportlab.lib import colors  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.pdfgen import canvas  # noqa: E402

import figures  # noqa: E402

W, H = A4
buf = io.BytesIO()
c = canvas.Canvas(buf, pagesize=A4)


def body(x, y, lines):
    c.setFont("Helvetica", 11)
    for i, s in enumerate(lines):
        c.drawString(x, y - i * 14, s)


body(60, H - 80, ["A simple pendulum is a small heavy bob hung from a fixed point by a light string.",
                  "When the bob is pulled aside and released it swings to and fro about its mean position.",
                  "The pendulum in the picture below swings between the two extreme positions (see Fig. 2.1)."])
# Figure 2.1: a pendulum (vector drawing) with small labels, caption "Fig. 2.1 : …" below it
c.setLineWidth(1.5)
c.line(200, 640, 400, 640)                    # support
c.line(300, 640, 300, 500)                    # string
c.circle(300, 490, 12, fill=1)                # bob
c.line(300, 640, 360, 515)
c.circle(365, 505, 12, fill=0)
c.setFont("Helvetica", 8)
c.drawString(406, 637, "Support")             # labels: small text beside the drawing
c.drawString(318, 488, "Bob")
c.drawString(380, 500, "Extreme position")
c.setFont("Helvetica-Oblique", 9)
c.drawString(250, 462, "Fig. 2.1 : A simple pendulum")
body(60, 430, ["The time taken by the pendulum to complete one oscillation is called its time period.",
               "Fig. 2.1. Count the oscillations for one minute and note them in your notebook."])
# Activity box (shaded panel with text) on the left, Figure 2.2 (a beaker) on the right
c.setFillColor(colors.HexColor("#cfe8f7"))
c.rect(50, 180, 220, 170, fill=1, stroke=0)
c.setFillColor(colors.black)
c.setFont("Helvetica-Bold", 12)
c.drawString(60, 330, "Activity 2.1")
body(60, 310, ["Take a beaker of water.", "Heat it gently on a burner.", "Note the temperature",
               "every two minutes.", "What do you observe?"])
c.setLineWidth(2)
c.line(330, 330, 340, 210)                    # beaker sides and bottom
c.line(470, 330, 460, 210)
c.line(340, 210, 460, 210)
c.setFillColor(colors.HexColor("#88c6ee"))
c.rect(342, 214, 116, 60, fill=1, stroke=0)   # water
c.setFillColor(colors.black)
c.setFont("Helvetica", 8)
c.drawString(475, 250, "Water")
c.setFont("Helvetica-Bold", 9)
c.drawString(360, 190, "Figure 2.2")
c.setFont("Helvetica", 9)
c.drawString(345, 178, "Heating water in a beaker")
body(60, 140, ["Water boils at 100 degrees Celsius at normal atmospheric pressure.",
               "The temperature stays the same while the water is boiling."])
c.showPage()
c.save()

figs = figures.find_figures(buf.getvalue())
by = {f["number"]: f for f in figs}
print([(f["number"], f["caption"], round(f["width"]), round(f["height"])) for f in figs])
assert set(by) == {"2.1", "2.2"}, by.keys()
assert by["2.1"]["caption"] == "A simple pendulum", by["2.1"]["caption"]
assert by["2.2"]["caption"] == "Heating water in a beaker", by["2.2"]["caption"]

f1 = by["2.1"]          # drawing spans x 200–400 (labels to ~470), y 478–640; body text is above 600 only at y>=H-108
assert 190 <= f1["width"] <= 300 and 150 <= f1["height"] <= 200, (f1["width"], f1["height"])
f2 = by["2.2"]          # beaker x 330–470 (+ "Water" label to ~500), y 210–330; must not include the Activity box (x<270)
assert 140 <= f2["width"] <= 200, f2["width"]
assert 110 <= f2["height"] <= 150, f2["height"]
assert all(f["png"].startswith(b"\x89PNG") for f in figs)
print("OK - figures found with their captions, labels kept, body text and the Activity box left out")

# ---- second page: cases found in NCERT physics (leph101) -------------------------------------------------
# (1) a rotated side tab ("EXAMPLE 1.8") printed after the caption must not stretch the caption's box
#     (only a guard here: pdfium puts the tab on its own line in this made-up page; in leph101 it shared the caption's line)
# (2) running text that starts "Fig. 3.2(b). Clearly, …" is not a caption and must not take the figure's region
# (3) text-size fragments of an equation in the column beside a figure are not figure labels
# (4) the margin around a cut-out stops before the first letters of the text beside it
# (5) a sentence on a later page that starts with the same figure number is not a second figure
buf2 = io.BytesIO()
c = canvas.Canvas(buf2, pagesize=A4)
c.setFont("Helvetica", 11)
body(300, H - 90, ["The components normal to the dipole axis cancel each other out and the field",
                   "is therefore directed along the axis, as the next figure shows to us now.",
                   "Fig. 3.2(b). Clearly, the components normal to the axis cancel out here"])
c.setLineWidth(1.5)                            # figure 3.2: a triangle in the left margin column, 200 pt wide
c.line(60, 640, 250, 640)
c.line(60, 640, 155, 520)
c.line(250, 640, 155, 520)
c.setFont("Helvetica-Oblique", 9)
c.drawString(70, 495, "Figure 3.2 Electric field of a dipole")
c.saveState()                                  # rotated tab printed after the caption (reading order puts it on its line)
c.translate(560, 495)
c.rotate(90)
c.setFont("Helvetica-Bold", 9)
c.drawString(0, 0, "EXAMPLE 3.2")
c.restoreState()
c.setFont("Helvetica", 24)
c.drawString(262, 600, "9 x 10 N m")
c.drawString(262, 560, "4 pi e r r")
c.setFont("Helvetica", 11)
body(254, 630, ["The first letters of this text column start close to the drawing and the cut must stop short."])
c.showPage()
c.setFont("Helvetica", 11)                     # page 2 repeats the number inside a sentence (a shaded example)
c.drawString(60, 700, "Fig. 3.2. The resultant of these two vectors is directed to the left.")
c.line(60, 640, 250, 640)
c.line(60, 640, 155, 520)
c.showPage()
c.save()

import pypdfium2 as pdfium  # noqa: E402

doc = pdfium.PdfDocument(buf2.getvalue())
lines = figures._lines(doc[0].get_textpage())
caps = figures._captions(lines)
cap = next(x for x in caps if x["number"] == "3.2")
assert cap["box"][3] - cap["box"][1] < 40, ("rotated tab stretched the caption", cap["box"])   # (1)
assert [x["number"] for x in caps] == ["3.2"], [x["number"] for x in caps]                    # (2)

figs2 = figures.find_figures(buf2.getvalue())
assert [f["number"] for f in figs2] == ["3.2"], [f["number"] for f in figs2]                   # (5)
f = figs2[0]
assert 195 <= f["width"] <= 235 and 120 <= f["height"] <= 170, (f["width"], f["height"])        # (3) not widened to ~400
l, b, r, t = figures._pad(60, 520, 250, 640, 519.5, lines, (0, 0, W, H))                      # (4)
assert r < 254, r
print("OK - rotated tab, cited sentence, equation fragments, margin and repeated number handled")

# ---- third page: cases found in NCERT science (jesc101 page 8) -------------------------------------------
# (6) a small line that starts inside the figure's box but runs far outside it ("(Limestone) (Quick lime)" under an
#     equation) is not a label and must not widen the cut-out
# (7) pdfium reports some tiny shapes in a nested form 230-290 pt tall; `_bounds` uses the shape's own points then
buf3 = io.BytesIO()
c = canvas.Canvas(buf3, pagesize=A4)
body(300, H - 90, ["The text of the book runs in a column beside the drawing and it is set in body size.",
                   "It goes on for a few more lines so that the page has an ordinary text size to compare."])
c.setLineWidth(1.5)
c.line(60, 640, 250, 640)
c.line(60, 640, 155, 520)
c.line(250, 640, 155, 520)
c.setFont("Helvetica", 8)
c.drawString(230, 600, "(Limestone) (Quick lime) is formed here")
c.setFont("Helvetica-Oblique", 9)
c.drawString(70, 495, "Figure 4.1 A triangle with a note")
c.showPage()
c.save()
f3 = figures.find_figures(buf3.getvalue())
assert [f["number"] for f in f3] == ["4.1"], [f["number"] for f in f3]
assert f3[0]["width"] < 230, f3[0]["width"]                                                   # (6) not widened to ~320

import ctypes  # noqa: E402
from collections import namedtuple  # noqa: E402

M = namedtuple("M", "a b c d e f")
PTS = [(0, 0), (-1.6, -14.3), (1.8, 0)]


class FakeObj:
    type = figures.raw.FPDF_PAGEOBJ_PATH
    raw = None

    def __init__(self, bounds, matrix=M(0.24, 0, 0, 0.24, 172.8, 597.4)):
        self._b, self._m = bounds, matrix

    def get_bounds(self):
        return self._b

    def get_matrix(self):
        return self._m


_raw = figures.raw
_saved = (_raw.FPDFPath_CountSegments, _raw.FPDFPath_GetPathSegment, _raw.FPDFPathSegment_GetPoint)
_raw.FPDFPath_CountSegments = lambda o: len(PTS)
_raw.FPDFPath_GetPathSegment = lambda o, i: i


def _point(seg, x, y):
    x.value, y.value = PTS[seg]


_raw.FPDFPathSegment_GetPoint = _point
try:
    l, b, r, t = figures._bounds(FakeObj((171.7, 368.0, 173.9, 598.1)))                       # (7) 230 pt tall, really ~4 pt
    assert t - b < 10 and abs(t - 597.4) < 3, (l, b, r, t)
    box = (100.0, 100.0, 180.0, 200.0)                                                         # honest bounds stay as they are
    PTS[:] = [(0, 0), (80, 100)]
    assert figures._bounds(FakeObj(box, M(1, 0, 0, 1, 100, 100))) == box
finally:
    _raw.FPDFPath_CountSegments, _raw.FPDFPath_GetPathSegment, _raw.FPDFPathSegment_GetPoint = _saved
print("OK - small line running out of the figure is not a label; tiny shapes with false tall bounds use their points")

# ---- fourth page set: cases found in the other NCERT books (2026-11-23) ------------------------------------
# (8) a thin figure (a line segment with two dots, gegp107 Fig. 7.1, ~9 pt tall) is a figure
# (9) a caption centred under two panels side by side takes both (hesc111 Fig. 11.1)
# (10) a big picture anchored in the page's bottom-left corner (jesc106) is page art and must not join a figure
from PIL import Image as _Image  # noqa: E402

buf4 = io.BytesIO()
c = canvas.Canvas(buf4, pagesize=A4)
body(60, H - 80, ["Choose a base of four centimetres and mark the two ends of it on the page.",
                  "The next picture shows the base that we have drawn, with its two end points."])
c.setLineWidth(1.5)
c.line(150, 640, 300, 640)
c.circle(150, 640, 4, fill=1)
c.circle(300, 640, 4, fill=1)
c.setFont("Helvetica-Oblique", 9)
c.drawString(200, 615, "Fig. 5.1")
c.showPage()                                               # page 2: two panels and one caption
c.setFillColor(colors.HexColor("#c0392b"))
c.rect(60, 490, 200, 138, fill=1, stroke=0)
c.setFillColor(colors.HexColor("#2471a3"))
c.rect(300, 490, 200, 138, fill=1, stroke=0)
c.setFillColor(colors.black)
c.setFont("Helvetica-Oblique", 9)
c.drawString(218, 496, "Fig. 6.1 : A tester with a bulb")
body(60, 440, ["The text of the book goes on below the two pictures in the ordinary body size here."])
c.showPage()                                               # page 3: corner picture under a figure
c.drawImage(__import__("reportlab.lib.utils", fromlist=["ImageReader"]).ImageReader(_Image.new("RGB", (8, 8), "white")),
            0, 0, width=450, height=450)
c.setLineWidth(1.5)
c.line(60, 640, 250, 640)
c.line(60, 640, 155, 520)
c.line(250, 640, 155, 520)
c.setFont("Helvetica-Oblique", 9)
c.drawString(70, 495, "Figure 7.1 A triangle above a corner picture")
body(300, H - 90, ["The text of the book runs in a column beside the drawing and it is set in body size.",
                   "It goes on for a few more lines so that the page has an ordinary text size to compare."])
c.showPage()
c.save()
f4 = {f["page"]: f for f in figures.find_figures(buf4.getvalue())}
assert sorted(f4) == [1, 2, 3], sorted(f4)
assert 140 <= f4[1]["width"] <= 190 and f4[1]["height"] < 40, (f4[1]["width"], f4[1]["height"])        # (8)
assert f4[2]["width"] > 420 and f4[2]["height"] > 100, (f4[2]["width"], f4[2]["height"])                  # (9) both panels
assert f4[3]["width"] < 230 and f4[3]["height"] < 170, (f4[3]["width"], f4[3]["height"])                  # (10)
print("OK - thin figure, two panels under one caption, corner picture handled")

# (11) a body-size sentence that starts with the figure ("Figure 8.1 shows the field lines ...", leph101 1.14 and 1.20)
#      is running text; it must not hide the real caption "FIGURE 8.1 Field lines due to ..." printed under the drawing
buf5 = io.BytesIO()
c = canvas.Canvas(buf5, pagesize=A4)
body(60, H - 80, ["Figure 8.1 shows the field lines around some simple charge configurations on this page.",
                  "The lines leave a positive charge and end on a negative one, as the drawing shows here."])
c.setLineWidth(1.5)
c.line(60, 640, 250, 640)
c.line(60, 640, 155, 520)
c.line(250, 640, 155, 520)
c.setFont("Helvetica-Bold", 9)
c.drawString(70, 495, "FIGURE 8.1 Field lines due to a triangle")
c.showPage()
c.save()
f5 = figures.find_figures(buf5.getvalue())
assert [f["number"] for f in f5] == ["8.1"] and f5[0]["caption"].startswith("Field lines"), [(f["number"], f["caption"]) for f in f5]
print("OK - a sentence that starts with the figure number does not hide the real caption")
