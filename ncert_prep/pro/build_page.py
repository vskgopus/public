"""Build the no-key "NCERT Prep with Claude" page from catalog.json.

Writes pro/index.html (open it by double-clicking; no server or API key needed).
Run:  python pro/build_page.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
catalog = json.loads((HERE.parent / "catalog.json").read_text())

# English-medium books only, compact: {class: {subject: [[code, title, first, last], ...]}}
compact = {}
for cls, subjects in catalog.items():
    for subject, books in subjects.items():
        eng = [[b["code"], b["title"], b["first_chapter"], b["last_chapter"]]
               for b in books if b["medium"] == "English"]
        if eng:
            compact.setdefault(cls, {})[subject] = eng

sys.path.insert(0, str(HERE.parent))
import generator  # noqa: E402  (defaults and practice-test sizes come from the app)

# What Claude is asked for per section, worded for a chat (the app's prompts in generator.py are
# written for JSON output). Diagrams and figures are left out: they need the app to draw or cut them.
SECTION_TEXT = {
    "summary": ["SUMMARY NOTES (DETAILED)", "explain every topic and sub-topic in book order as short, clear points: definitions, explanations, examples, processes, reasons. A student who reads only these notes should understand the whole chapter."],
    "summary_basic": ["BASIC SUMMARY NOTES", "a brief summary: one heading per main topic, each with 2 to 5 very short points giving only the main ideas. No long explanations or worked examples."],
    "definitions": ["DEFINITIONS OF TERMS", "every important term and defined concept in the pages, in book order, as a table with two columns: term, and its definition in one or two sentences as the book gives it. If the pages define no terms, say so in one line."],
    "key_points": ["KEY POINTS TO REMEMBER", "must-remember facts: definitions, laws, formulae, equations, dates, names, differences, units."],
    "formulas": ["FORMULA SUMMARY", "every formula, identity and rule of calculation in the pages, grouped by topic in book order, as a table with three columns: name, formula (written with proper symbols), and meaning and use (what each symbol means, the unit, and when to use it). Only formulae that appear in or follow directly from these pages. If there are none, say so in one line."],
    "revision_table": ["QUICK REVISION TABLE", "a table with one row per topic in book order and three columns: topic, in short (the idea in one or two sentences), remember (the fact, formula, example or keyword most likely to be asked). Keep each cell brief."],
    "differences": ["DIFFERENCES TABLES", "\"difference between X and Y\" tables for the pairs of terms, processes or things in the pages that students are asked to distinguish (as many as the pages support, usually 2-6), each with 3-6 rows of basis of comparison."],
    "one_mark": ["ONE MARK QUESTIONS WITH ANSWERS", "every 1-mark question that could reasonably be asked: MCQs (4 options, give the correct option), fill in the blanks, true/false (with the correction when false), very short answer, and assertion-reason (standard CBSE four options). Aim for 30-50 for a full chapter."],
    "short_answer": ["2 AND 3 MARK QUESTIONS WITH ANSWERS", "include all NCERT in-text and end-of-chapter exercise questions of this length plus other likely questions, and numericals with full working where relevant. Label each [2 marks] or [3 marks]. Answers the right length to score full marks (2 marks: 2-3 points; 3 marks: 3-4 points). Aim for 15-30."],
    "long_answer": ["5 MARK QUESTIONS WITH ANSWERS", "complete model answers (5+ points, with derivations, steps, diagram descriptions or case-based reasoning as the subject needs), including the long NCERT exercise questions. Aim for 6-12."],
    "case_based": ["CASE-BASED QUESTIONS WITH ANSWERS", "case-based (source-based) questions in the style of recent CBSE papers for this subject: a short passage, situation, data or experiment description based on the pages (80-150 words), followed by 3-4 sub-questions with marks and full answers, usually totalling 4 marks. Roughly 3-5 cases for a full chapter."],
}
assert set(SECTION_TEXT) <= set(generator.SECTIONS), "section names must match generator.SECTIONS"
defaults = [k for k in generator.DEFAULT_SECTIONS if k in SECTION_TEXT]

fragment = (HERE / "template.html").read_text()
for marker, value in (("/*CATALOG*/{}", compact), ("/*SECTIONS*/{}", SECTION_TEXT), ("/*DEFAULTS*/[]", defaults),
                      ("/*COUNTS*/{}", generator.PRACTICE_COUNTS)):
    assert marker in fragment, marker
    fragment = fragment.replace(marker, json.dumps(value, ensure_ascii=False, separators=(",", ":")))
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '</head>\n<body>\n' + fragment + '\n</body>\n</html>\n')
(HERE / "index.html").write_text(page)
(HERE / "artifact.html").write_text(fragment)  # same page without the document wrapper
print(f"Wrote {HERE / 'index.html'} ({len(page) // 1024} KB)")
