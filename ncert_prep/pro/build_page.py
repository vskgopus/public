"""Build the no-key "NCERT Prep with Claude" page from catalog.json.

Writes pro/index.html (open it by double-clicking; no server or API key needed).
Run:  python pro/build_page.py
"""
import json
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

fragment = (HERE / "template.html").read_text().replace(
    "/*CATALOG*/{}", json.dumps(compact, ensure_ascii=False, separators=(",", ":")))
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '</head>\n<body>\n' + fragment + '\n</body>\n</html>\n')
(HERE / "index.html").write_text(page)
(HERE / "artifact.html").write_text(fragment)  # same page without the document wrapper
print(f"Wrote {HERE / 'index.html'} ({len(page) // 1024} KB)")
