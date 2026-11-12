"""Google Gemini engine: the Gemini API with the person's own (free or paid) API key.

Free keys come from Google AI Studio (aistudio.google.com). The free tier has daily and
per-minute limits that Google changes from time to time, and Google says it may use
free-tier content to improve its products. The REST calls below follow the request format
used by Google's official `google-genai` SDK (generateContent, x-goog-api-key header,
inlineData PDF part, generationConfig.responseJsonSchema).
"""
from __future__ import annotations

import base64
import copy
import json
import re
import time

import requests

BASE = "https://generativelanguage.googleapis.com/v1beta"
SESSION = requests.Session()            # replaced by a stub in the tests
_sleep = time.sleep                     # replaced in the tests (no waiting)
ENV_KEYS = ("GEMINI_API_KEY", "GOOGLE_API_KEY")
# Models that cannot write the material (image/audio/embedding/robotics variants).
_SKIP = re.compile(r"image|tts|audio|live|embed|computer-use|robotics|native|veo|imagen|aqa|learnlm|gemma", re.I)


class UsageLimit(RuntimeError):
    """The Gemini key's rate or daily limit was reached."""


class ModelUnavailable(RuntimeError):
    """This model is overloaded right now, or no longer offered to this key."""


def _error(r: requests.Response) -> tuple[str, str]:
    try:
        err = r.json().get("error", {})
        return str(err.get("status", "")), str(err.get("message", ""))[:400]
    except ValueError:
        return "", r.text[:400]


def _check(r: requests.Response) -> None:
    if r.ok:
        return
    status, msg = _error(r)
    if r.status_code == 429 or status == "RESOURCE_EXHAUSTED":
        raise UsageLimit(msg or "rate limit reached")
    if r.status_code in (400, 401, 403) and re.search(r"api.?key|API_KEY|permission|unauthenticated", msg + status, re.I):
        raise RuntimeError("The Gemini API key was rejected. Check it in Settings "
                           f"(Google said: {msg or status or r.status_code}).")
    if r.status_code == 404:
        raise ModelUnavailable(f"not available to this key ({msg})")
    raise RuntimeError(f"Gemini API error {r.status_code} {status}: {msg}")


def list_models(api_key: str) -> list[dict]:
    """Models this key can use to write text: [{id, name, output_limit}], newest first."""
    models, token = [], ""
    for _ in range(10):
        params = {"pageSize": 100} | ({"pageToken": token} if token else {})
        try:
            r = SESSION.get(f"{BASE}/models", params=params, headers={"x-goog-api-key": api_key}, timeout=30)
        except requests.RequestException as e:
            raise RuntimeError(f"Could not reach the Gemini API. Check your internet connection ({e}).")
        _check(r)
        data = r.json()
        for m in data.get("models", []):
            mid = str(m.get("name", "")).removeprefix("models/")
            if (mid.startswith("gemini") and "generateContent" in (m.get("supportedGenerationMethods") or [])
                    and not _SKIP.search(mid)):
                models.append({"id": mid, "name": m.get("displayName") or mid,
                               "output_limit": int(m.get("outputTokenLimit") or 0)})
        token = data.get("nextPageToken") or ""
        if not token:
            break
    return sorted(models, key=_rank)


def _version(mid: str) -> float:
    m = re.search(r"gemini-(\d+(?:\.\d+)?)", mid)
    return float(m.group(1)) if m else 0.0


def _rank(m: dict) -> tuple:
    """Stable Flash models first (newest version first), then the rest."""
    mid = m["id"]
    unstable = bool(re.search(r"preview|exp|latest|\d{3}$|-\d{2}-\d{2}", mid))
    flash = "flash" in mid and "lite" not in mid
    lite = "lite" in mid
    return (unstable, not flash, lite, -_version(mid), mid)


def default_model(models: list[dict]) -> dict | None:
    return models[0] if models else None


def fallbacks(models: list[dict], current: str, n: int = 2) -> list[dict]:
    """Other Flash models to try, in preference order, when `current` is busy or unavailable."""
    return [m for m in models if m["id"] != current and "flash" in m["id"]][:n]


def _simplify(schema):
    """Drop JSON Schema keywords an older schema checker may refuse (fallback only)."""
    schema = copy.deepcopy(schema)

    def walk(node):
        if isinstance(node, dict):
            node.pop("additionalProperties", None)
            if node.get("type") == "integer" and "enum" in node:
                allowed = ", ".join(map(str, node.pop("enum")))
                node["description"] = (node.get("description", "") + f" One of: {allowed}.").strip()
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
    walk(schema)
    return schema


class Cancelled(RuntimeError):
    """The person pressed Stop."""


class _Upload:
    """The request body as a file-like object, so the upload can be shown as it goes."""
    def __init__(self, data: bytes, state: dict):
        self.data, self.state, self.pos = data, state, 0

    def __len__(self):
        return len(self.data) - self.pos

    def read(self, n: int = -1) -> bytes:
        n = len(self.data) - self.pos if n is None or n < 0 else min(n, 256 * 1024)
        chunk = self.data[self.pos:self.pos + n]
        self.pos += len(chunk)
        self.state["sent"] = self.pos
        return chunk


def _post(url: str, payload: bytes, api_key: str, idle_timeout: int, *, progress, cancel):
    """POST in a helper thread so the console keeps counting (upload, then waiting) and Stop works."""
    import threading
    state = {"sent": 0, "abandoned": False}
    result: dict = {}

    def worker():
        try:
            r = SESSION.post(url, data=_Upload(payload, state), stream=True, timeout=(20, idle_timeout),
                             headers={"x-goog-api-key": api_key, "Content-Type": "application/json"})
            if state["abandoned"]:
                r.close()
            result["r"] = r
        except Exception as e:  # handed to the caller
            result["e"] = e

    t0 = time.time()
    t = threading.Thread(target=worker, daemon=True)
    t.start()
    total = len(payload)
    while t.is_alive():
        t.join(1)
        if cancel is not None and cancel.is_set():
            state["abandoned"] = True
            raise Cancelled("Stopped.")
        el = _mins(time.time() - t0)
        if state["sent"] < total:
            progress(f"Uploading the chapter to Google: {state['sent'] / 1e6:.1f} of {total / 1e6:.1f} MB, {el} so far")
        else:
            progress(f"Uploaded. Waiting for Google's reply … {el} so far (Gemini reads and thinks "
                     "before it answers; on long chapters this can take several minutes)")
    if "e" in result:
        raise result["e"]
    return result["r"], t0


def _mins(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 60} min {s % 60:02d} s" if s >= 60 else f"{s} s"


def generate(pdf_bytes: bytes, prompt: str, system: str, schema: dict, *, api_key: str, model: str,
             output_limit: int = 0, attempts: int = 4, log=None, progress=None, cancel=None,
             idle_timeout: int = 600) -> tuple[dict, str]:
    """Have Gemini read the PDF and return JSON matching `schema`. Returns (data, usage text).

    The answer is streamed (streamGenerateContent, server-sent events), so `progress`
    can show it arriving. log(msg): a line for the job console. progress(msg): the
    current state, replaced as it changes. cancel: a threading.Event set by Stop.
    idle_timeout: give up if Google sends nothing for this many seconds."""
    log = log or (lambda m: None)
    progress = progress or (lambda m: None)
    if not model:
        raise RuntimeError("No Gemini model chosen. Open Settings, save your key and pick a model.")
    config = {"responseMimeType": "application/json", "responseJsonSchema": schema}
    if output_limit:
        config["maxOutputTokens"] = output_limit
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [
            {"inlineData": {"mimeType": "application/pdf", "data": base64.standard_b64encode(pdf_bytes).decode()}},
            {"text": prompt},
        ]}],
        "generationConfig": config,
    }
    url = f"{BASE}/models/{model}:streamGenerateContent?alt=sse"
    simplified = False
    r = None
    for attempt in range(1, attempts + 1):
        if cancel is not None and cancel.is_set():
            raise Cancelled("Stopped.")
        try_note = f" (attempt {attempt} of {attempts})" if attempt > 1 else ""
        log(f"Sending the chapter PDF ({len(pdf_bytes) / 1e6:.1f} MB) to Google Gemini ({model}){try_note} …")
        try:
            r, sent_at = _post(url, json.dumps(body).encode(), api_key, idle_timeout, progress=progress, cancel=cancel)
        except requests.RequestException as e:
            if attempt == attempts:
                raise RuntimeError(f"Could not reach the Gemini API. Check your internet connection ({e}).")
            wait = 5 * attempt
            log(f"Could not reach Google ({type(e).__name__}). Trying again in {wait} s …")
            _sleep(wait)
            continue
        high_demand = r.status_code == 503 and re.search(r"high demand|overloaded", _error(r)[1], re.I)
        if r.status_code in (500, 502, 503, 504) and (attempt == attempts or (high_demand and attempt >= 2)):
            # Google says this model is overloaded: another model is usually quicker than waiting.
            raise ModelUnavailable(f"busy after {attempt} tries (HTTP {r.status_code}: {_error(r)[1][:160]})")
        if r.status_code in (500, 502, 503, 504):   # overloaded: wait and retry
            wait = 10 * attempt
            log(f"Google is busy (HTTP {r.status_code}: {_error(r)[1][:120] or 'no details'}). "
                f"Trying again in {wait} s …")
            _sleep(wait)
            continue
        if r.status_code == 400 and not simplified and re.search(r"schema", _error(r)[1], re.I):
            log("Google did not accept the detailed output format; retrying with a simpler one …")
            body["generationConfig"]["responseJsonSchema"] = _simplify(schema)
            simplified = True
            continue
        if r.status_code in (400, 413) and re.search(r"too large|size|exceed|pages", _error(r)[1], re.I):
            raise RuntimeError("The chapter is too large for one Gemini request; split chapters into "
                               f"smaller parts in Settings ({_error(r)[1]}).")
        _check(r)
        break
    else:
        _check(r)

    log(f"Google accepted the request after {_mins(time.time() - sent_at)}. Gemini is reading the chapter "
        "and thinking; the answer starts to arrive after that.")
    data, text, usage = _read_stream(r, progress=progress, log=log, cancel=cancel, idle_timeout=idle_timeout,
                                     started=sent_at)
    finish = data.get("finishReason", "")
    if data.get("blockReason"):
        raise RuntimeError(f"Gemini declined this request ({data['blockReason']}).")
    if finish == "MAX_TOKENS":
        raise RuntimeError("The output was too long for Gemini; split the chapter into smaller parts in Settings.")
    if finish not in ("", "STOP"):
        raise RuntimeError(f"Gemini stopped early ({finish}). Try again, or split the chapter in Settings.")
    if not text:
        raise RuntimeError("Gemini returned no answer. Try again, or split the chapter in Settings.")
    try:
        result = json.loads(text)
    except ValueError:
        raise RuntimeError("Gemini returned incomplete material. Try again, or split the chapter in Settings.")
    if not isinstance(result, dict):
        raise RuntimeError("Gemini returned material in an unexpected shape. Try again.")
    return result, f"Gemini {model}: {usage.get('promptTokenCount', '?')} in / {usage.get('candidatesTokenCount', '?')} out tokens"


def _read_stream(r, *, progress, log, cancel, idle_timeout: int, started: float | None = None) -> tuple[dict, str, dict]:
    """Read the server-sent events; report progress; return (finish info, answer text, usage).
    `started`: when the request was sent, so times count from there."""
    import threading

    started = started or time.time()
    state = {"chars": 0, "first": None, "done": False, "last": time.time()}
    info, usage, pieces = {}, {}, []

    def ticker():   # keeps the console alive while Google is silent, and handles Stop
        while not state["done"]:
            if cancel is not None and cancel.is_set():
                try:
                    r.close()
                finally:
                    return
            now = time.time()
            if state["first"] is None:
                progress(f"Gemini is reading the chapter and thinking … {_mins(now - started)} since sending "
                         f"(nothing is sent back until it starts writing)")
            else:
                progress(f"Receiving the answer from Gemini: {state['chars']:,} characters, "
                         f"{_mins(now - started)} since sending")
            time.sleep(1)

    threading.Thread(target=ticker, daemon=True).start()
    buffer: list[str] = []
    try:
        r.encoding = "utf-8"   # Google sends no charset; requests would otherwise decode as Latin-1 (H₂O -> HÃ¢Â‚Â‚O)
        for line in r.iter_lines(decode_unicode=True):
            if cancel is not None and cancel.is_set():
                raise Cancelled("Stopped.")
            if line:
                if line.startswith("data: "):
                    buffer.append(line[6:])
                elif line.strip().startswith(("{", "[", "}", "]", '"')):
                    buffer.append(line)        # an error object sent without the "data:" prefix
                continue
            if not buffer:
                continue
            chunk, buffer = "\n".join(buffer), []
            _take(chunk, info, usage, pieces, state, log, started)
        if buffer:
            _take("\n".join(buffer), info, usage, pieces, state, log, started)
    except Cancelled:
        raise
    except requests.exceptions.ConnectionError as e:
        if cancel is not None and cancel.is_set():
            raise Cancelled("Stopped.")
        if "timed out" in str(e).lower() or "Read timed out" in str(e):
            raise RuntimeError(f"Google sent nothing for {idle_timeout // 60} minutes, so the app stopped waiting. "
                               "Try again, choose another model in Settings, or split the chapter.")
        raise RuntimeError(f"The connection to Google dropped while Gemini was answering ({e}). "
                           "Click Prepare again; finished parts are kept.")
    except (requests.exceptions.Timeout, requests.exceptions.ChunkedEncodingError) as e:
        if cancel is not None and cancel.is_set():
            raise Cancelled("Stopped.")
        raise RuntimeError(f"Google sent nothing for {idle_timeout // 60} minutes, or the connection broke "
                           f"({type(e).__name__}). Try again, choose another model in Settings, or split the chapter.")
    except (AttributeError, ValueError, OSError):
        if cancel is not None and cancel.is_set():
            raise Cancelled("Stopped.")
        raise
    finally:
        state["done"] = True
        try:
            r.close()          # release the connection in every case (done, error or Stop)
        except Exception:
            pass
    if cancel is not None and cancel.is_set():
        raise Cancelled("Stopped.")
    text = "".join(pieces)
    log(f"Gemini finished writing: {len(text):,} characters, {_mins(time.time() - started)} after sending.")
    return info, text, usage


def _take(chunk: str, info: dict, usage: dict, pieces: list, state: dict, log, started: float) -> None:
    try:
        data = json.loads(chunk)
    except ValueError:
        return
    if isinstance(data, list):           # some servers send a JSON array of responses
        for d in data:
            _take(json.dumps(d), info, usage, pieces, state, log, started)
        return
    if "error" in data:
        err = data["error"]
        status, msg = str(err.get("status", "")), str(err.get("message", ""))[:300]
        if status == "RESOURCE_EXHAUSTED" or err.get("code") == 429:
            raise UsageLimit(msg or "rate limit reached")
        raise RuntimeError(f"Gemini reported an error while answering: {status} {msg}")
    block = (data.get("promptFeedback") or {}).get("blockReason")
    if block:
        info["blockReason"] = block
    usage.update(data.get("usageMetadata") or {})
    for cand in data.get("candidates") or []:
        for p in (cand.get("content") or {}).get("parts", []):
            if p.get("text") and not p.get("thought"):
                if state["first"] is None:
                    state["first"] = time.time()
                    log(f"Gemini started writing the answer, {_mins(state['first'] - started)} after sending.")
                pieces.append(p["text"])
                state["chars"] += len(p["text"])
        if cand.get("finishReason"):
            info["finishReason"] = cand["finishReason"]
        break
