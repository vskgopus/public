"""Google Gemini engine, fully offline: the Gemini REST API is replaced by a stub and the
NCERT download by a local 16-page PDF.  Run:  python tests/test_gemini.py

Checks: saving a key lists the models and picks a stable Flash model; a bad key is
refused; the generateContent request has the PDF, system instruction and JSON schema;
a schema the API refuses is retried in a simpler form; a rate limit keeps finished parts
and the next run resumes; MAX_TOKENS gives a clear message; choosing a model is checked.
"""
import io
import json
import os
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMP = Path(tempfile.mkdtemp(prefix="ncert-gemini-test-"))
os.environ.update(XDG_CONFIG_HOME=str(TMP / "config"), XDG_DATA_HOME=str(TMP / "data"),
                  APPDATA=str(TMP / "config"), LOCALAPPDATA=str(TMP / "data"))
for var in ("ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"):
    os.environ.pop(var, None)
sys.path.insert(0, str(ROOT))

from reportlab.pdfgen import canvas  # noqa: E402

import app as webapp  # noqa: E402
import gemini  # noqa: E402
import generator  # noqa: E402
import ncert  # noqa: E402

buf = io.BytesIO()
c = canvas.Canvas(buf)
for i in range(16):
    c.drawString(100, 700, f"Stand-in chapter page {i + 1}")
    c.showPage()
c.save()
ncert.download_chapter_pdf = lambda code, number, log=None: buf.getvalue()
gemini._sleep = lambda s: None

FULL = json.loads((ROOT / "samples" / "class10_science_ch1.json").read_text())
FULL.update(json.loads((ROOT / "tests" / "sample_extras.json").read_text()))
KEY = "AIzaTEST-0123456789abcdefghij"
MODELS_PAGE1 = {"models": [
    {"name": "models/gemini-2.5-flash", "displayName": "Gemini 2.5 Flash", "outputTokenLimit": 65536,
     "supportedGenerationMethods": ["generateContent", "countTokens"]},
    {"name": "models/gemini-2.5-flash-image", "displayName": "Image", "supportedGenerationMethods": ["generateContent"]},
    {"name": "models/text-embedding-004", "supportedGenerationMethods": ["embedContent"]},
    {"name": "models/gemini-3-flash-preview", "displayName": "Gemini 3 Flash Preview", "outputTokenLimit": 65536,
     "supportedGenerationMethods": ["generateContent"]},
], "nextPageToken": "p2"}
MODELS_PAGE2 = {"models": [
    {"name": "models/gemini-2.5-flash-lite", "displayName": "Gemini 2.5 Flash-Lite", "outputTokenLimit": 65536,
     "supportedGenerationMethods": ["generateContent"]},
    {"name": "models/gemini-2.5-pro", "displayName": "Gemini 2.5 Pro", "outputTokenLimit": 65536,
     "supportedGenerationMethods": ["generateContent"]},
]}


class Resp:
    """A response. For streamed answers, `events` are sent as server-sent events."""
    def __init__(self, status, body, events=None):
        self.status_code, self._body, self.events = status, body, events
        self.encoding = None      # like requests for text/event-stream without a charset
        self.ok = status < 400
        self.text = json.dumps(body)

    def json(self):
        return self._body

    def iter_lines(self, decode_unicode=False):
        # Decode the way requests does: with r.encoding, which defaults to ISO-8859-1 here.
        for ev in self.events if self.events is not None else [self._body]:
            raw = ("data: " + json.dumps(ev, ensure_ascii=False)).encode("utf-8")
            yield raw.decode(self.encoding or "ISO-8859-1") if decode_unicode else raw
            yield ""

    def close(self):
        pass


def answer(text, finish="STOP", pieces=3):
    """Streamed answer: the text in a few chunks, finish reason and usage in the last one."""
    size = max(1, len(text) // pieces + 1)
    chunks = [text[i:i + size] for i in range(0, len(text), size)] or [""]
    events = [{"candidates": [{"content": {"parts": [{"text": c}]}}]} for c in chunks]
    events[-1]["candidates"][0]["finishReason"] = finish
    events[-1]["usageMetadata"] = {"promptTokenCount": 1200, "candidatesTokenCount": 9000}
    return Resp(200, None, events)


class SlowResp(Resp):
    """Google says nothing for a long time (thinking) until the connection is closed."""
    def __init__(self):
        super().__init__(200, None, [])
        self.closed = False

    def iter_lines(self, decode_unicode=False):
        for _ in range(600):
            if self.closed:
                raise __import__("requests").exceptions.ConnectionError("closed")
            time.sleep(0.05)
            yield ""

    def close(self):
        self.closed = True


def err(status, code, msg):
    return Resp(status, {"error": {"code": status, "status": code, "message": msg}})


class Stub:
    """Plays the Gemini REST API. `script` holds responses to hand out before normal answers."""
    def __init__(self):
        self.gets, self.posts, self.script = [], [], []

    def get(self, url, params=None, headers=None, timeout=None):
        self.gets.append({"url": url, "params": params, "headers": headers})
        if headers.get("x-goog-api-key") != KEY:
            return err(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.")
        return Resp(200, MODELS_PAGE2 if (params or {}).get("pageToken") == "p2" else MODELS_PAGE1)

    def post(self, url, json=None, data=None, headers=None, timeout=None, stream=False):
        assert stream, "answers must be streamed"
        if data is not None:                       # the app uploads a file-like body (for upload progress)
            assert headers.get("Content-Type") == "application/json"
            size, raw = len(data), b""
            while chunk := data.read(65536):
                raw += chunk
            assert len(raw) == size
            json = __import__("json").loads(raw)
        self.posts.append({"url": url, "body": __import__("copy").deepcopy(json), "headers": headers})
        if self.script:
            return self.script.pop(0)
        required = json["generationConfig"]["responseJsonSchema"]["required"]
        text = __import__("json").dumps({k: v for k, v in FULL.items() if k in required}, ensure_ascii=False)
        return answer(text)


stub = Stub()
gemini.SESSION = stub
client = webapp.app.test_client()
H = {"X-App-Token": webapp.TOKEN}
BASE = "http://127.0.0.1/"
ALL = generator.ALL_OPTIONS


def run_job(**extra):
    body = {"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "1", "chapter_to": "1",
            "sections": ALL} | extra
    r = client.post("/api/jobs", json=body, headers=H, base_url=BASE)
    assert r.status_code == 200, r.get_json()
    job = r.get_json()["id"]
    for _ in range(120):
        st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
        if st["status"] in ("done", "error", "stopped"):
            return st, job
        time.sleep(0.5)
    raise TimeoutError(st)


def settings_post(body):
    return client.post("/api/settings", json=body, headers=H, base_url=BASE)


# --- no key yet: a job is refused with a clear message
settings_post({"engine": "gemini"})
r = client.post("/api/jobs", json={"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "1",
                                   "sections": ALL}, headers=H, base_url=BASE)
assert r.status_code == 400 and "Gemini API key" in r.get_json()["error"], r.get_json()

# --- a bad key is refused when saved
r = settings_post({"gemini_api_key": "AIzaWRONG-0123456789abcdefghij", "engine": "gemini"})
assert r.status_code == 400 and "rejected" in r.get_json()["error"], r.get_json()
assert not client.get("/api/status", base_url=BASE).get_json()["settings"]["gemini_key_set"]

# --- a good key lists models (both pages), skips image/embedding ones, picks the stable Flash model
r = settings_post({"gemini_api_key": KEY, "engine": "gemini"})
assert r.status_code == 200, r.get_json()
j = r.get_json()
ids = [m["id"] for m in j["gemini_models"]]
assert ids[0] == "gemini-2.5-flash", ids
assert "gemini-2.5-flash-image" not in ids and not any("embedding" in i for i in ids)
assert {"gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-2.5-pro"} <= set(ids)
s = j["settings"]
assert s["engine"] == "gemini" and s["gemini_model"] == "gemini-2.5-flash" and s["gemini_key_hint"] == "…ghij"
assert KEY not in json.dumps(client.get("/api/status", base_url=BASE).get_json()), "key must not reach the page"

# --- choosing a model is checked against the list
assert settings_post({"gemini_model": "gemini-9-ultra"}).status_code == 400
assert settings_post({"gemini_model": "gemini-2.5-pro"}).get_json()["settings"]["gemini_model"] == "gemini-2.5-pro"
assert settings_post({"gemini_model": "gemini-2.5-flash"}).status_code == 200
assert client.post("/api/gemini/models", headers=H, base_url=BASE).get_json()["current"] == "gemini-2.5-flash"

# --- a whole chapter with every section; the API refuses the schema once, the simpler one works
stub.script = [err(400, "INVALID_ARGUMENT", "Invalid JSON payload: unknown keyword in response schema")]
st, job = run_job()
print("\n".join(st["log"]))
assert st["status"] == "done", st
first, retry = stub.posts[0], stub.posts[1]
assert first["url"].endswith("/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse"), first["url"]
assert first["headers"]["x-goog-api-key"] == KEY
body = first["body"]
part = body["contents"][0]["parts"][0]["inlineData"]
assert part["mimeType"] == "application/pdf" and part["data"].startswith("JVBERi"), "PDF not sent inline"
assert body["systemInstruction"]["parts"][0]["text"] == generator.SYSTEM
cfg = body["generationConfig"]
assert cfg["responseMimeType"] == "application/json" and cfg["maxOutputTokens"] == 65536
assert cfg["responseJsonSchema"]["required"] == ["chapter_title"] + list(generator.SECTIONS)
assert "additionalProperties" in json.dumps(cfg["responseJsonSchema"])
assert "additionalProperties" not in json.dumps(retry["body"]["generationConfig"]["responseJsonSchema"]), \
    "the retry should use the simplified schema"
assert any("Google Gemini (gemini-2.5-flash)" in l for l in st["log"])
import re  # noqa: E402
assert all(re.match(r"^\d\d:\d\d:\d\d  ", l) for l in st["log"]), "console lines need a time"
for words in ("Sending the chapter PDF", "simpler one", "Google accepted the request", "Gemini started writing",
              "Gemini finished writing"):
    assert any(words in l for l in st["log"]), words
assert client.get(st["download"], base_url=BASE).data.startswith(b"%PDF")
print("OK - Gemini engine, all sections, schema fallback")

# --- rate limit on the second of two parts: the first part is kept and the next run resumes
settings_post({"split_pages": 8})
n = len(stub.posts)
orig_post = stub.post
calls = {"n": 0}


def post_second_limited(url, json=None, data=None, headers=None, timeout=None, stream=False):
    calls["n"] += 1
    if calls["n"] >= 2:            # every model is limited from the second part on
        stub.posts.append({"url": url, "body": None, "headers": headers})
        return err(429, "RESOURCE_EXHAUSTED", "Quota exceeded for requests per day")
    return orig_post(url, json=json, data=data, headers=headers, timeout=timeout, stream=stream)


stub.post = post_second_limited
st, _ = run_job(sections=["summary", "one_mark"])
assert st["status"] == "error" and "Gemini usage limit" in st["error"] and "Finished parts are saved" in st["error"], st
stub.post = orig_post
st, _ = run_job(sections=["summary", "one_mark"])
assert st["status"] == "done", st
assert sum("saved earlier" in l for l in st["log"]) == 1, st["log"]
assert len(stub.posts) == n + 5, "first part + limited part (3 models), then only the missing part again"
print("OK - rate limit keeps finished parts and resumes")

# --- MAX_TOKENS and safety stops give clear messages
settings_post({"split_pages": 0})
stub.script = [answer('{"chap', finish="MAX_TOKENS")]
st, _ = run_job(sections=["long_answer"], chapter_from="2", chapter_to="2")
assert st["status"] == "error" and "split the chapter" in st["error"], st
stub.script = [Resp(200, {"promptFeedback": {"blockReason": "SAFETY"}})]
st, _ = run_job(sections=["case_based"], chapter_from="2", chapter_to="2")
assert st["status"] == "error" and "declined" in st["error"], st

print("OK - Gemini error messages")

# --- Google busy (503) is retried and shown in the console
stub.script = [err(503, "UNAVAILABLE", "The model is overloaded. Please try again later.")]
st, _ = run_job(sections=["key_points"], chapter_from="3", chapter_to="3")
assert st["status"] == "done", st
assert any("Google is busy (HTTP 503" in l for l in st["log"]), st["log"]

# --- a stream error object (quota) during the answer is a usage limit
generator._GEMINI_STANDIN.clear()
stub.script = [Resp(200, None, [{"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "message": "Quota exceeded"}}])
               for _ in range(3)]   # the chosen model and both fallbacks
st, _ = run_job(sections=["key_points"], chapter_from="4", chapter_to="4")
assert st["status"] == "error" and "Gemini usage limit" in st["error"], st

# --- Stop while Gemini is silent: the live line says it is thinking, then the job stops
slow = SlowResp()
stub.script = [slow]
r = client.post("/api/jobs", json={"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "5",
                                   "chapter_to": "5", "sections": ["key_points"]}, headers=H, base_url=BASE)
job = r.get_json()["id"]
for _ in range(100):
    st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
    if "thinking" in st["progress"]:
        break
    time.sleep(0.1)
assert "thinking" in st["progress"], st
assert client.post(f"/api/jobs/{job}/stop", headers=H, base_url=BASE).status_code == 200
for _ in range(100):
    st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
    if st["status"] != "running":
        break
    time.sleep(0.1)
assert st["status"] == "stopped" and slow.closed, st
assert any("Stopped" in l for l in st["log"])
print("OK - console lines, busy retry, stream errors, Stop")

# --- Google slow to reply: the live line counts the wait, and Stop works before any reply
class SlowPost(Stub):
    def post(self, url, json=None, data=None, headers=None, timeout=None, stream=False):
        while data.read(65536):
            pass
        for _ in range(300):
            time.sleep(0.05)
        return answer("{}")


gemini.SESSION = SlowPost()
r = client.post("/api/jobs", json={"cls": "10", "subject": "Science", "book": "jesc1", "chapter_from": "6",
                                   "chapter_to": "6", "sections": ["key_points"]}, headers=H, base_url=BASE)
job = r.get_json()["id"]
for _ in range(60):
    st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
    if "Waiting for Google's reply" in st["progress"] and "so far" in st["progress"]:
        break
    time.sleep(0.1)
assert "Waiting for Google's reply" in st["progress"], st
client.post(f"/api/jobs/{job}/stop", headers=H, base_url=BASE)
for _ in range(40):
    st = client.get(f"/api/jobs/{job}", base_url=BASE).get_json()
    if st["status"] != "running":
        break
    time.sleep(0.1)
assert st["status"] == "stopped", st
gemini.SESSION = stub
print("OK - waiting for Google's reply is counted, and Stop works before the reply")

# --- Unicode survives the stream (H₂O, →), as with the real API
stub.script = [answer('{"chapter_title": "Ch", "key_points": ["2H₂ + O₂ → 2H₂O", "CO₂ ⇌ H₂CO₃", "x² ≤ √2"]}')]
data, _ = gemini.generate(b"%PDF-1.4", "p", "s", {"type": "object"}, api_key=KEY, model="gemini-2.5-flash")
assert data["key_points"] == ["2H₂ + O₂ → 2H₂O", "CO₂ ⇌ H₂CO₃", "x² ≤ √2"], data
print("OK - Unicode text from the stream is decoded as UTF-8")

# --- an overloaded model: after its retries the app tries the next Flash model and says so
busy = [err(503, "UNAVAILABLE", "This model is currently experiencing high demand.")] * 2   # gives up after 2
stub.script = list(busy)
st, _ = run_job(sections=["key_points"], chapter_from="7", chapter_to="7")
assert st["status"] == "done", st
assert any("is not answering" in l and "Trying" in l for l in st["log"]), st["log"]
assert any("Tip:" in l for l in st["log"]), st["log"]
tried = [p["url"].split("/models/")[1].split(":")[0] for p in stub.posts[-3:]]
assert tried[:2] == ["gemini-2.5-flash"] * 2 and tried[2] != "gemini-2.5-flash", tried
standin = tried[2]

# --- the next chapter starts with the stand-in that answered, without waiting on the busy model again
n = len(stub.posts)
st, _ = run_job(sections=["key_points"], chapter_from="10", chapter_to="10")
assert st["status"] == "done" and any("was busy a few minutes ago" in l for l in st["log"]), st["log"]
assert [p["url"].split("/models/")[1].split(":")[0] for p in stub.posts[n:]] == [standin], stub.posts[n:]
generator._GEMINI_STANDIN.clear()

# --- a withdrawn model (404) falls back at once; if nothing answers, the message says so
stub.script = [err(404, "NOT_FOUND", "This model models/gemini-2.5-flash is no longer available to new users.")]
st, _ = run_job(sections=["key_points"], chapter_from="8", chapter_to="8")
assert st["status"] == "done" and any("not available to this key" in l for l in st["log"]), st["log"]
generator._GEMINI_STANDIN.clear()
stub.script = [err(404, "NOT_FOUND", "gone")] + busy * 2
st, _ = run_job(sections=["key_points"], chapter_from="9", chapter_to="9")
assert st["status"] == "error" and "No Gemini model answered" in st["error"], st
print("OK - busy or withdrawn models fall back to other Flash models")

# --- one model's quota is used up: another Flash model is tried; if all are, it is a usage limit
generator._GEMINI_STANDIN.clear()
quota = err(429, "RESOURCE_EXHAUSTED", "Quota exceeded for metric: generate_content_free_tier_requests, limit: 20")
stub.script = [quota]
st, _ = run_job(sections=["key_points"], chapter_from="11", chapter_to="11")
assert st["status"] == "done" and any("reached your key's usage limit" in l for l in st["log"]), st["log"]
generator._GEMINI_STANDIN.clear()
stub.script = [quota] * 3
st, _ = run_job(sections=["key_points"], chapter_from="12", chapter_to="12")
assert st["status"] == "error" and "Gemini usage limit" in st["error"] and "Finished parts are saved" in st["error"], st
print("OK - a model's used-up quota falls back; all used up is reported as a usage limit")

# --- the console says which AI is used and what it writes versus what the app does itself
generator._GEMINI_STANDIN.clear()
st, _ = run_job(sections=["figures", "key_points", "one_mark", "practice_test"], chapter_from="13", chapter_to="13")
assert st["status"] == "done", st
said = "\n".join(st["log"])
assert "AI: Google Gemini, model gemini-2.5-flash" in said, said
assert "The AI writes: notes on the book's figures, key points to remember, one-mark questions." in said, said
assert "The app does without AI:" in said and "cutting the figures out of the book pages" in said \
    and "building the practice test" in said, said
page = client.get("/", base_url=BASE).data
for element in (b'id="btnsettings"', b'id="btnquit"', b'id="ailogin"', b'id="aidetail"'):
    assert element in page, element
status = client.get("/api/status", base_url=BASE).get_json()
assert status["ai"].startswith("AI: Google Gemini"), status["ai"]
print("OK - console and page say which AI is used; Settings, Quit and login are on the front page")
