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
