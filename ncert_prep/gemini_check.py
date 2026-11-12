"""Check Google Gemini step by step and time each step.

Uses the Gemini key and model saved in the app's Settings (or GEMINI_API_KEY), so nothing
needs to be typed. Run it from the app folder:

    .venv/bin/python gemini_check.py            (Windows: .venv\\Scripts\\python gemini_check.py)
    .venv/bin/python gemini_check.py --chapter  also send a downloaded NCERT chapter (slower)
    .venv/bin/python gemini_check.py --model gemini-2.5-flash-lite   test another model

Steps: 1 list models, 2 a one-line text answer, 3 the same streamed, 4 a one-page PDF,
5 (with --chapter) a real chapter from the app's download folder with a short question.
Each step stops after a time limit and says what happened. Nothing is saved.
Each run uses about 4 requests (5 with --chapter) of the key's free-tier quota, which Google
counts per model (20 requests for gemini-3.8-flash on 2026-11-12), so don't run it repeatedly.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import requests  # noqa: E402

import gemini  # noqa: E402
import settings  # noqa: E402


def say(msg: str = "") -> None:
    print(msg, flush=True)


def key_and_model(args) -> tuple[str, str]:
    s = settings.load()
    key = s["gemini_api_key"] or next((os.environ[k] for k in gemini.ENV_KEYS if os.environ.get(k)), "")
    if not key:
        sys.exit("No Gemini key found. Save one in the app's Settings first (or set GEMINI_API_KEY).")
    return key, args.model or s["gemini_model"]


def stream(url: str, body: dict, key: str, limit: int) -> dict:
    """Send a streamed request; time the upload, the reply, the first text and the end."""
    t0 = time.time()
    out = {"first_byte": None, "first_text": None, "end": None, "text": "", "finish": "", "error": "", "usage": {}}
    try:
        r = gemini.SESSION.post(url, data=json.dumps(body).encode(), stream=True, timeout=(20, limit),
                                headers={"x-goog-api-key": key, "Content-Type": "application/json"})
        out["reply"] = time.time() - t0
        if not r.ok:
            status, msg = gemini._error(r)
            out["error"] = f"HTTP {r.status_code} {status}: {msg}"
            return out
        r.encoding = "utf-8"
        for line in r.iter_lines(decode_unicode=True):
            if out["first_byte"] is None:
                out["first_byte"] = time.time() - t0
            if not line.startswith("data: "):
                continue
            data = json.loads(line[6:])
            if "error" in data:
                out["error"] = json.dumps(data["error"])[:300]
                break
            out["usage"].update(data.get("usageMetadata") or {})
            for cand in data.get("candidates") or []:
                for p in (cand.get("content") or {}).get("parts", []):
                    if p.get("text") and not p.get("thought"):
                        if out["first_text"] is None:
                            out["first_text"] = time.time() - t0
                        out["text"] += p["text"]
                out["finish"] = cand.get("finishReason") or out["finish"]
                break
            if time.time() - t0 > limit:
                out["error"] = f"stopped after {limit} s (still answering)"
                break
        r.close()
    except requests.RequestException as e:
        out["error"] = f"{type(e).__name__}: {e}"
    out["end"] = time.time() - t0
    return out


def report(name: str, res: dict, limit: int) -> bool:
    t = lambda v: "-" if v is None else f"{v:.1f} s"  # noqa: E731
    ok = not res["error"] and res["text"]
    say(f"   reply headers {t(res.get('reply'))} | first data {t(res['first_byte'])} | first text {t(res['first_text'])}"
        f" | done {t(res['end'])}")
    u = res["usage"]
    if u:
        say(f"   tokens: {u.get('promptTokenCount', '?')} in, {u.get('candidatesTokenCount', '?')} out, "
            f"{u.get('thoughtsTokenCount', 0)} thinking | finish: {res['finish'] or '-'}")
    if res["error"]:
        say(f"   PROBLEM: {res['error']}")
    elif not res["text"]:
        say("   PROBLEM: no text came back")
    else:
        say(f"   answer: {res['text'][:160].strip()!r}")
    say(f"   => {'OK' if ok else 'FAILED'}: {name}")
    return bool(ok)


def tiny_pdf() -> bytes:
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 750, "Photosynthesis: green plants make glucose from carbon dioxide and water")
    c.drawString(72, 730, "using sunlight and chlorophyll. Oxygen is released.")
    c.showPage()
    c.save()
    return buf.getvalue()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--model", help="model to test instead of the one in Settings")
    ap.add_argument("--chapter", action="store_true", help="also send a real downloaded chapter")
    ap.add_argument("--limit", type=int, default=300, help="seconds to wait per step (default 300)")
    args = ap.parse_args()
    key, model = key_and_model(args)
    say(f"Gemini check  ·  key …{key[-4:]}  ·  model {model or '(none chosen)'}  ·  {time.strftime('%Y-%m-%d %H:%M:%S')}")
    say(f"(uses about {5 if args.chapter else 4} requests of this model's free quota)\n")

    say("1. Listing the models this key can use …")
    t0 = time.time()
    try:
        models = gemini.list_models(key)
    except Exception as e:
        say(f"   PROBLEM: {e}\n=> FAILED: the key or the connection to Google does not work; nothing else can run.")
        return
    say(f"   {len(models)} text models in {time.time() - t0:.1f} s: " + ", ".join(m["id"] for m in models[:12])
        + (" …" if len(models) > 12 else ""))
    if not model:
        model = models[0]["id"] if models else ""
    if model not in [m["id"] for m in models]:
        say(f"   PROBLEM: model {model!r} is not in the list for this key.")
    say("   => OK\n")

    base = f"{gemini.BASE}/models/{model}"
    text_body = {"contents": [{"role": "user", "parts": [{"text": "Reply with exactly: Gemini works."}]}]}

    say(f"2. A one-line answer from {model} (not streamed) …")
    t0 = time.time()
    try:
        r = gemini.SESSION.post(f"{base}:generateContent", json=text_body, timeout=(20, args.limit),
                                headers={"x-goog-api-key": key})
        if r.ok:
            d = r.json()
            text = "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"] if not p.get("thought"))
            u = d.get("usageMetadata") or {}
            say(f"   {time.time() - t0:.1f} s · answer {text.strip()!r} · {u.get('thoughtsTokenCount', 0)} thinking tokens")
            say("   => OK\n")
        else:
            status, msg = gemini._error(r)
            say(f"   PROBLEM after {time.time() - t0:.1f} s: HTTP {r.status_code} {status}: {msg}\n   => FAILED\n")
    except requests.RequestException as e:
        say(f"   PROBLEM after {time.time() - t0:.1f} s: {type(e).__name__}: {e}\n   => FAILED\n")

    say("3. The same, streamed (the way the app asks) …")
    report("streamed answer", stream(f"{base}:streamGenerateContent?alt=sse", text_body, key, args.limit), args.limit)
    say()

    say("4. A one-page PDF with a short question, streamed …")
    pdf_body = {"contents": [{"role": "user", "parts": [
        {"inlineData": {"mimeType": "application/pdf", "data": base64.standard_b64encode(tiny_pdf()).decode()}},
        {"text": "In one sentence, what does this page say?"}]}]}
    report("PDF answer", stream(f"{base}:streamGenerateContent?alt=sse", pdf_body, key, args.limit), args.limit)
    say()

    if args.chapter:
        pdfs = sorted((settings.data_dir() / "pdfs").glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not pdfs:
            say("5. No downloaded chapter found (prepare one chapter in the app first).")
            return
        pdf = pdfs[0]
        say(f"5. Real chapter {pdf.name} ({pdf.stat().st_size / 1e6:.1f} MB) with a short question, streamed …")
        say("   (this measures how long Gemini takes just to read the chapter)")
        body = {"contents": [{"role": "user", "parts": [
            {"inlineData": {"mimeType": "application/pdf", "data": base64.standard_b64encode(pdf.read_bytes()).decode()}},
            {"text": "List the main topic headings of this chapter, one per line."}]}]}
        report("real chapter", stream(f"{base}:streamGenerateContent?alt=sse", body, key, args.limit), args.limit)
    say("\nDone. Copy everything above when asking for help (your key is shown only as its last 4 characters).")


if __name__ == "__main__":
    main()
