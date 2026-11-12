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
        if st["status"] in ("done", "error"):
            return st
        time.sleep(1)
    raise TimeoutError


# --- security guard
assert client.post("/api/quit", base_url=BASE).status_code == 403, "POST without token must be refused"
assert client.get("/", base_url="http://evil.example/").status_code == 403, "foreign Host must be refused"
assert b"NCERT Exam Prep" in client.get("/", base_url=BASE).data

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
    "default selection should ask for the original five sections"
assert b["thinking"] == {"type": "adaptive"} and b["fallbacks"] == "default"
hdr = captured["headers"]
assert "sk-ant-test-1234567890" in (hdr.get("x-api-key", "") + hdr.get("authorization", "")), "saved key not sent"
assert b["messages"][0]["content"][0]["source"]["media_type"] == "application/pdf"
print("OK - API key engine\n")

# --- 2. Claude login engine, split into 8-page parts
client.post("/api/settings", json={"engine": "claude_login", "split_pages": 8}, headers=H, base_url=BASE)
status = client.get("/api/status", base_url=BASE).get_json()
assert status["claude"]["installed"] and status["claude"]["logged_in"], status
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


for bad, why in (([], "nothing ticked"), (["practice_test"], "practice test without questions"),
                 (["summary", "pictures"], "unknown section")):
    r = client.post("/api/jobs", json={"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "1",
                                       "sections": bad}, headers=H, base_url=BASE)
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
for word in ("diagrams -", "revision_table -", "differences -", "case_based -"):
    assert word in prompt, word
saved = client.get("/api/status", base_url=BASE).get_json()["settings"]["sections"]
assert saved == everything, "the ticked sections should be remembered"

pdf = Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])
text = "\n".join(p.extract_text() for p in PdfReader(pdf).pages)
for heading in ("Diagrams to Understand the Chapter", "Quick Revision Table", "Differences",
                "Case-Based Questions", "Practice Test", "Answer Key", "Types of chemical reactions",
                "Difference between Exothermic reaction and Endothermic reaction"):
    assert heading in text, heading

# A smaller selection reuses the saved parts (they hold every section) and leaves the rest out.
st = run_job(sections=["diagrams", "revision_table"])
assert st["status"] == "done" and sum("saved earlier" in l for l in st["log"]) == 2, st["log"]
assert len(calls_so_far()) == before + 2, "a subset of saved sections must not call Claude again"
pdf = Path(webapp.JOBS[list(webapp.JOBS)[-1]]["file"])
text = "\n".join(p.extract_text() for p in PdfReader(pdf).pages)
assert "Quick Revision Table" in text and "One Mark Questions" not in text and "Practice Test" not in text

# Practice test picks questions spread across the sections that are ticked.
paper = pdf_render.practice_paper([FULL], ["one_mark", "long_answer"])
assert [h for h, _m, _q in paper] == ["Section A: 1 mark each", "Section B: 5 marks each"], paper
assert len(paper[0][2]) == 10 and len(paper[1][2]) == 3
print(f"OK - selectable sections; PDF {pdf.name}")
