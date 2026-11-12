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
        raise RuntimeError(f"Gemini model not found. Choose another model in Settings ({msg}).")
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


def generate(pdf_bytes: bytes, prompt: str, system: str, schema: dict, *, api_key: str, model: str,
             output_limit: int = 0, attempts: int = 4) -> tuple[dict, str]:
    """Have Gemini read the PDF and return JSON matching `schema`. Returns (data, usage text)."""
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
    url = f"{BASE}/models/{model}:generateContent"
    simplified = False
    for attempt in range(1, attempts + 1):
        try:
            r = SESSION.post(url, json=body, headers={"x-goog-api-key": api_key}, timeout=(20, 1800))
        except requests.RequestException as e:
            if attempt == attempts:
                raise RuntimeError(f"Could not reach the Gemini API. Check your internet connection ({e}).")
            _sleep(5 * attempt)
            continue
        if r.status_code in (500, 502, 503, 504) and attempt < attempts:   # overloaded: wait and retry
            _sleep(10 * attempt)
            continue
        if r.status_code == 400 and not simplified and re.search(r"schema", _error(r)[1], re.I):
            body["generationConfig"]["responseJsonSchema"] = _simplify(schema)
            simplified = True
            continue
        if r.status_code in (400, 413) and re.search(r"too large|size|exceed|pages", _error(r)[1], re.I):
            raise RuntimeError("The chapter is too large for one Gemini request; split chapters into "
                               f"smaller parts in Settings ({_error(r)[1]}).")
        _check(r)
        break
    data = r.json()
    block = (data.get("promptFeedback") or {}).get("blockReason")
    if block:
        raise RuntimeError(f"Gemini declined this request ({block}).")
    cands = data.get("candidates") or []
    if not cands:
        raise RuntimeError("Gemini returned no answer. Try again, or split the chapter in Settings.")
    cand = cands[0]
    finish = cand.get("finishReason", "")
    if finish == "MAX_TOKENS":
        raise RuntimeError("The output was too long for Gemini; split the chapter into smaller parts in Settings.")
    if finish not in ("", "STOP"):
        raise RuntimeError(f"Gemini stopped early ({finish}). Try again, or split the chapter in Settings.")
    text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []) if not p.get("thought"))
    try:
        result = json.loads(text)
    except ValueError:
        raise RuntimeError("Gemini returned incomplete material. Try again, or split the chapter in Settings.")
    if not isinstance(result, dict):
        raise RuntimeError("Gemini returned material in an unexpected shape. Try again.")
    u = data.get("usageMetadata") or {}
    usage = f"Gemini {model}: {u.get('promptTokenCount', '?')} in / {u.get('candidatesTokenCount', '?')} out tokens"
    return result, usage
