"""End-to-end tests without spending money: real NCERT downloads, mocked Claude.

1. API key engine: the SDK request goes to a mock HTTP transport that streams back
   samples/class10_science_ch1.json; the request shape is checked.
2. Claude login engine: a stand-in `claude` command (tests/fake_claude.py) answers
   `auth status` and `-p`; chapter splitting, merging and resume are checked.
3. Selectable sections: every optional section (diagrams, revision table, differences,
   case-based, practice test) in one PDF; saved results reused for a smaller selection;
   invalid selections refused.

Run:  python tests/test_end_to_end.py      (needs network access to ncert.nic.in)
"""
import json
import os
import stat
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMP = Path(tempfile.mkdtemp(prefix="ncert-test-"))
os.environ.update(XDG_CONFIG_HOME=str(TMP / "config"), XDG_DATA_HOME=str(TMP / "data"),
                  APPDATA=str(TMP / "config"), LOCALAPPDATA=str(TMP / "data"))
os.environ.pop("ANTHROPIC_API_KEY", None)
sys.path.insert(0, str(ROOT))

# A fake `claude` on PATH, used by the Claude-login engine.
bindir = TMP / "bin"
bindir.mkdir()
fake = bindir / "claude"
fake.write_text(f"#!{sys.executable}\nimport runpy; runpy.run_path({str(ROOT / 'tests' / 'fake_claude.py')!r}, run_name='__main__')\n")
fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
os.environ["PATH"] = f"{bindir}{os.pathsep}{os.environ['PATH']}"
os.environ["FAKE_CLAUDE_LOG"] = str(TMP / "fake_calls.jsonl")

import anthropic  # noqa: E402
import httpx2 as httpx  # noqa: E402

import app as webapp  # noqa: E402
import generator  # noqa: E402

FULL = json.loads((ROOT / "samples" / "class10_science_ch1.json").read_text())
FULL.update(json.loads((ROOT / "tests" / "sample_extras.json").read_text()))
captured = {}


def sse(events):
    return "".join(f"event: {e['type']}\ndata: {json.dumps(e)}\n\n" for e in events)


def handler(request):
    body = json.loads(request.content)
    captured.update(body=body, headers=dict(request.headers))
    required = body["output_config"]["format"]["schema"]["required"]
    SAMPLE = json.dumps({k: v for k, v in FULL.items() if k in required}, ensure_ascii=False)
    events = [
        {"type": "message_start", "message": {"id": "msg_test", "type": "message", "role": "assistant",
         "model": body["model"], "content": [], "stop_reason": None, "stop_sequence": None,
         "usage": {"input_tokens": 1, "output_tokens": 1}}},
        {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}},
        {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": SAMPLE}},
        {"type": "content_block_stop", "index": 0},
        {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None},
         "usage": {"output_tokens": 9000}},
        {"type": "message_stop"},
    ]
    return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=sse(events))


generator._client = lambda api_key=None: anthropic.Anthropic(
    api_key=api_key, base_url="http://mock", http_client=httpx.Client(transport=httpx.MockTransport(handler)))

client = webapp.app.test_client()
H = {"X-App-Token": webapp.TOKEN}
BASE = "http://127.0.0.1/"


def run_job(**extra):
    body = {"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "1", "chapter_to": "1"} | extra
    r = client.post("/api/jobs", json=body, headers=H, base_url=BASE)
    assert r.status_code == 200, r.get_json()
    job = r.get_json()["id"]
    for _ in range(180):
        st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
        if st["status"] in ("done", "error", "stopped"):
            return st
        time.sleep(1)
    raise TimeoutError


# --- security guard
assert client.post("/api/quit", base_url=BASE).status_code == 403, "POST without token must be refused"
assert client.get("/", base_url="http://evil.example/").status_code == 403, "foreign Host must be refused"
assert b"NCERT Exam Prep" in client.get("/", base_url=BASE).data
_page = client.get("/", base_url=BASE).data
assert b'id="getgemkey" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener"' in _page, "Gemini key button"
assert _page.count(b'<li>') >= 4 and b"Get a free Gemini key" in _page, "Gemini key steps"

# --- 1. API key engine
r = client.post("/api/settings", json={"engine": "api_key", "api_key": "sk-ant-test-1234567890"}, headers=H, base_url=BASE)
assert r.get_json()["settings"]["api_key_hint"] == "…7890"
st = run_job()
print("\n".join(st["log"]))
assert st["status"] == "done", st
assert client.get(st["download"], base_url=BASE).data.startswith(b"%PDF")
b = captured["body"]
assert b["model"] == generator.MODEL and b["output_config"]["format"]["type"] == "json_schema"
assert b["output_config"]["format"]["schema"]["required"] == ["chapter_title"] + generator.DEFAULT_SECTIONS, \
    "default selection should ask for the default sections"
assert b["thinking"] == {"type": "adaptive"} and b["fallbacks"] == "default"
hdr = captured["headers"]
assert "sk-ant-test-1234567890" in (hdr.get("x-api-key", "") + hdr.get("authorization", "")), "saved key not sent"
assert b["messages"][0]["content"][0]["source"]["media_type"] == "application/pdf"
for words in ("Sending the chapter PDF", "Claude accepted the request", "Claude started writing", "Claude finished writing"):
    assert any(words in l for l in st["log"]), words
print("OK - API key engine\n")

# --- 2. Claude login engine, split into 8-page parts
client.post("/api/settings", json={"engine": "claude_login", "split_pages": 8}, headers=H, base_url=BASE)
status = client.get("/api/status", base_url=BASE).get_json()
assert status["claude"]["installed"] and status["claude"]["logged_in"], status
import about
assert status["about"] == about.info() and about.VERSION in status["about"]["line"] \
    and "Gopu Sugumar" in status["about"]["line"] and "GPL-3.0-or-later" in status["about"]["line"], status["about"]
assert "id=\"about\"" in client.get("/", base_url=BASE).get_data(as_text=True), "footer has the about line"
st = run_job()
print("\n".join(st["log"]))
assert st["status"] == "done", st
calls = [json.loads(l) for l in Path(os.environ["FAKE_CLAUDE_LOG"]).read_text().splitlines()]
prints = [c for c in calls if "-p" in c["argv"]]
assert len(prints) == 2, f"16-page chapter in 8-page parts should be 2 calls, got {len(prints)}"
argv = prints[0]["argv"]
for flag in ("--json-schema", "--output-format", "--tools", "--system-prompt"):
    assert flag in argv, flag
assert argv[argv.index("--tools") + 1] == "Read"
assert not prints[0]["had_api_key"], "API key must not be passed to Claude Code"

# Resume: the same request again uses the saved parts, no new Claude calls.
st = run_job()
assert st["status"] == "done" and sum("saved earlier" in l for l in st["log"]) == 2, st["log"]
calls2 = [l for l in Path(os.environ["FAKE_CLAUDE_LOG"]).read_text().splitlines() if '"-p"' in l]
assert len(calls2) == 2, "resume should not call Claude again"
out = Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])
print(f"OK - Claude login engine, split + resume; PDF {out.name} ({out.stat().st_size // 1024} KB)")


# --- 3. Selectable sections (Claude login engine, still 8-page parts)
import pdf_render  # noqa: E402
from pypdf import PdfReader  # noqa: E402


def calls_so_far():
    return [json.loads(l) for l in Path(os.environ["FAKE_CLAUDE_LOG"]).read_text().splitlines() if '"-p"' in l]


for bad, why, extra in (([], "nothing ticked", {}), (["summary", "pictures"], "unknown section", {}),
                        (["practice_test"], "practice test with every count 0",
                         {"practice_counts": {"m1": 0, "m2": 0, "m3": 0, "m5": 0, "case": 0}}),
                        (["practice_test"], "a count out of range", {"practice_counts": {"m1": 99}}),
                        (["practice_test"], "an unknown count", {"practice_counts": {"x": 1}})):
    r = client.post("/api/jobs", json={"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "1",
                                       "sections": bad} | extra, headers=H, base_url=BASE)
    assert r.status_code == 400, (why, r.get_json())

everything = generator.ALL_OPTIONS
before = len(calls_so_far())
st = run_job(sections=everything)
print("\n".join(st["log"]))
assert st["status"] == "done", st
new = calls_so_far()[before:]
assert len(new) == 2, "the saved 5-section parts lack the extras, so both parts must be asked again"
argv = new[0]["argv"]
schema = json.loads(argv[argv.index("--json-schema") + 1])
assert schema["required"] == ["chapter_title"] + list(generator.SECTIONS), schema["required"]
prompt = argv[argv.index("-p") + 1]
for word in ("summary_basic -", "diagrams -", "revision_table -", "differences -", "case_based -"):
    assert word in prompt, word
saved = client.get("/api/status", base_url=BASE).get_json()["settings"]["sections"]
assert saved == everything, "the ticked sections should be remembered"

pdf = Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])
text = "\n".join(p.extract_text() for p in PdfReader(pdf).pages)
for heading in ("Diagrams to Understand the Chapter", "Quick Revision Table", "Differences",
                "Case-Based Questions", "Practice Test", "Answer Key", "Formula Summary", "Summary Notes (Basic)", "Definitions of Terms",
                "Exothermic reaction", "Chemical reactions and equations", "A = πr²", "Types of chemical reactions",
                "Difference between Exothermic reaction and Endothermic reaction"):
    assert heading in text, heading

# Clear to read: the basic summary comes first (default and order), the question sections start
# their own page, and the terms of the basic summary are printed in bold inside its points.
assert generator.DEFAULT_SECTIONS[0] == "summary_basic" and list(generator.SECTIONS)[0] == "summary_basic"
import pdf_render  # noqa: E402
pages = [p.extract_text().strip() for p in PdfReader(pdf).pages]
assert text.index("Summary Notes (Basic)") < text.index("Summary Notes (Detailed)"), "basic summary first"
import re  # noqa: E402
# The page footer ("... - Exam Preparation", "Page N") is drawn first, so skip it to get the first body line.
firsts = [next((x for x in t.split("\n") if "Exam Preparation" not in x and not re.fullmatch(r"Page \d+", x.strip())), "")
          for t in pages]
for heading in ("One Mark Questions", "Short Answer Questions", "Long Answer Questions", "Case-Based Questions"):
    assert any(heading in l for l in firsts), (heading + " begins at the top of a page", firsts)
assert pdf_render._hl("An Exothermic reaction gives out heat.", ["exothermic reaction"]) == \
    'An <font name="%s">Exothermic reaction</font> gives out heat.' % pdf_render.BOLD
assert pdf_render._hl("Light & <b>", ["amp", "lt", "gt"]) == "Light &amp; &lt;b&gt;", "no bolding inside escapes or tags"

# A smaller selection reuses the saved parts (they hold every section) and leaves the rest out.
st = run_job(sections=["diagrams", "revision_table"])
assert st["status"] == "done" and sum("saved earlier" in l for l in st["log"]) == 2, st["log"]
assert len(calls_so_far()) == before + 2, "a subset of saved sections must not call Claude again"
pdf = Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])
text = "\n".join(p.extract_text() for p in PdfReader(pdf).pages)
assert "Quick Revision Table" in text and "One Mark Questions" not in text and "Practice Test" not in text

# Old saved results (made before the basic summary was a default) lack it: the AI is asked for just that
# section, it is added to the saved file, and nothing is asked a second time.
for f in webapp.RESULTS.glob("*.json"):
    d = json.loads(f.read_text())
    d.pop("summary_basic", None)
    f.write_text(json.dumps(d, ensure_ascii=False))
n_calls = len(calls_so_far())
st = run_job(sections=["summary_basic", "summary"])
assert st["status"] == "done", st
new = calls_so_far()[n_calls:]
assert len(new) == 2 and any("just that" in l for l in st["log"]), "one small request per saved part"
for c in new:
    sch = json.loads(c["argv"][c["argv"].index("--json-schema") + 1])
    assert sch["required"] == ["chapter_title", "summary_basic"], sch["required"]
text = "\n".join(p.extract_text() for p in PdfReader(Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])).pages)
assert "Summary Notes (Basic)" in text and "Definitions of Terms" in text
n_calls = len(calls_so_far())
st = run_job(sections=["summary_basic", "summary"])
assert st["status"] == "done" and len(calls_so_far()) == n_calls, "now saved: no new request"

# Practice test: sizes come from the counts; a count of 0 leaves a kind out.
paper = pdf_render.practice_paper([FULL], {"m2": 0, "m3": 0, "case": 0})
assert [h for h, _m, _q in paper] == ["Section A: 1 mark each", "Section B: 5 marks each"], paper
assert len(paper[0][2]) == 10 and len(paper[1][2]) == 3
paper = pdf_render.practice_paper([FULL], {"m1": 3})
assert len(paper[0][2]) == 3, "the 1-mark count should be used"

# The practice test on its own: the AI writes the questions, the PDF holds only the paper and its key.
before = len(calls_so_far())
st = run_job(sections=["practice_test"], chapter_from="3", chapter_to="3")   # chapter 3: nothing saved yet
assert st["status"] == "done", st
new = calls_so_far()[before:]
assert new, "the questions for the paper were not saved, so the AI must be asked"
argv = new[0]["argv"]
schema = json.loads(argv[argv.index("--json-schema") + 1])
assert schema["required"] == ["chapter_title", "one_mark", "short_answer", "long_answer", "case_based"], schema["required"]
text = "\n".join(p.extract_text() for p in PdfReader(Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])).pages)
assert "Practice Test" in text and "Answer Key" in text and "Section A" in text, text[:300]
assert "Summary Notes" not in text and "One Mark Questions (1 mark each)" not in text, "no question bank was asked for"
n_calls = len(calls_so_far())
st = run_job(sections=["practice_test"], chapter_from="3", chapter_to="3",
             practice_counts={"m1": 5, "m2": 0, "m3": 0, "m5": 0, "case": 0})
assert st["status"] == "done" and len(calls_so_far()) == n_calls, "a smaller paper is covered by the saved questions"
assert client.get("/api/status", base_url=BASE).get_json()["settings"]["practice_counts"]["m1"] == 5
print(f"OK - selectable sections; PDF {pdf.name}")

# --- Stop while Claude Code is working: the process is ended and the job says so
os.environ["FAKE_CLAUDE_SLEEP"] = "60"
r = client.post("/api/jobs", json={"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "2",
                                   "chapter_to": "2", "sections": ["key_points"]}, headers=H, base_url=BASE)
job = r.get_json()["id"]
for _ in range(100):
    st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
    if "Claude Code is reading" in st["progress"]:
        break
    time.sleep(0.2)
assert "Claude Code is reading" in st["progress"], st
t0 = time.time()
client.post(f"/api/jobs/{job}/stop", headers=H, base_url=BASE)
for _ in range(50):
    st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
    if st["status"] != "running":
        break
    time.sleep(0.2)
os.environ.pop("FAKE_CLAUDE_SLEEP")
assert st["status"] == "stopped" and time.time() - t0 < 10, st
print("OK - Stop ends a running Claude Code request")

# --- Figures from the book: cut from the real NCERT pages, with the notes Claude wrote
st = run_job(sections=["figures", "key_points"])
print("\n".join(st["log"]))
assert st["status"] == "done", st
assert any("numbered figure" in l and "from the book pages" in l for l in st["log"]), st["log"]
pdf = Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])
reader = PdfReader(pdf)
text = "\n".join(p.extract_text() for p in reader.pages)
for words in ("Figures from the NCERT Book", "From the NCERT textbook", "Fig. 1.1", "dazzling white flame"):
    assert words in text, words
images = sum(len(p.images) for p in reader.pages)
assert images >= 5, f"expected the book's figures as images in the PDF, found {images}"
print(f"OK - figures from the book: {images} figure images in {pdf.name}")
