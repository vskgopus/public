"""End-to-end tests without spending money: real NCERT downloads, mocked Claude.

1. API key engine: the SDK request goes to a mock HTTP transport that streams back
   samples/class10_science_ch1.json; the request shape is checked.
2. Claude login engine: a stand-in `claude` command (tests/fake_claude.py) answers
   `auth status` and `-p`; chapter splitting, merging and resume are checked.

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

SAMPLE = (ROOT / "samples" / "class10_science_ch1.json").read_text()
captured = {}


def sse(events):
    return "".join(f"event: {e['type']}\ndata: {json.dumps(e)}\n\n" for e in events)


def handler(request):
    body = json.loads(request.content)
    captured.update(body=body, headers=dict(request.headers))
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
