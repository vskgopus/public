"""Build the no-install "NCERT Exam Prep" page for claude.ai (pro/artifact.html) and its local copy (pro/index.html).

The page writes the material itself with the viewer's own Claude account (the claude.ai page capability
"sample"), so it uses the same prompts, schemas and catalogue as the apps (web/data.js, generated from
generator.py) and the same printable document (web/render.js and the document part of web/style.css).
Run web/build_data.py first (build.sh does):   python pro/build_page.py
"""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
WEB = HERE.parent.parent / "web"

data_js = (WEB / "data.js").read_text()
m = re.search(r"export const DATA = (\{.*\});\s*$", data_js, re.S)
assert m, "web/data.js has no DATA object: run web/build_data.py"
data = m.group(1).replace("</", "<\\/")

render = (WEB / "render.js").read_text()
assert 'import { DATA } from "./data.js";' in render
render = render.replace('import { DATA } from "./data.js";\n', "")
render = re.sub(r"^export (const|function) ", r"\1 ", render, flags=re.M)
assert "import " not in render and "export " not in render and "</script" not in render

style = (WEB / "style.css").read_text()
start = style.index("/* ---------------------------------------------------------------- the printable document */")
doc_css = style[start:]

fragment = (HERE / "template.html").read_text()
for marker, value in (("/*DATA*/{}", data), ("/*RENDER*/", render), ("/*DOCCSS*/", doc_css)):
    assert fragment.count(marker) == 1, marker
    fragment = fragment.replace(marker, value)
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '</head>\n<body>\n' + fragment + '\n</body>\n</html>\n')
(HERE / "index.html").write_text(page)
(HERE / "artifact.html").write_text(fragment)  # same page without the document wrapper

# claude.ai refuses published text files that hold raw control bytes; pdf.js's worker has 30, all inside string
# literals, so the published copy writes each as a \xHH escape (the same string values).
worker = (HERE / "vendor" / "pdf.worker.min.mjs").read_bytes()
escaped = re.sub(rb"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", lambda m: b"\\x%02x" % m.group()[0], worker)
(HERE / "vendor" / "pdf.worker.publish.mjs").write_bytes(escaped)
print(f"Wrote {HERE / 'index.html'} ({len(page) // 1024} KB)")
