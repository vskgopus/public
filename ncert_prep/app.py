"""NCERT Exam Prep - local web app (started by launcher.py, or `python app.py`).

Pick class / subject / book / chapters; chapters are downloaded from ncert.nic.in, Claude
writes notes and question banks, and a printable PDF is produced. Claude is used either
through the person's own Claude login (Pro/Max, via Claude Code) or an Anthropic API key.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import threading
import time
import traceback
import uuid

from flask import Flask, abort, jsonify, render_template, request, send_file

import claude_cli
import generator
import ncert
import settings
from pdf_render import render_pdf

DATA = settings.data_dir()
ncert.CACHE_DIR = DATA / "pdfs"          # downloaded NCERT chapters
RESULTS = DATA / "results"               # Claude output per chapter part, so work is never lost
OUT_DIR = DATA / "output"                # finished PDFs
for d in (RESULTS, OUT_DIR):
    d.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
JOBS: dict[str, dict] = {}
CATALOG = ncert.load_catalog()
shutdown_event = threading.Event()        # set by the Quit button; launcher.py waits on it
TOKEN = secrets.token_urlsafe(24)         # web pages from other sites can't read this, so they can't act


@app.before_request
def guard():
    # Only answer requests addressed to this computer (blocks DNS-rebinding tricks) ...
    host = (request.host or "").rsplit(":", 1)[0]
    if host not in ("127.0.0.1", "localhost"):
        abort(403)
    # ... and only accept actions from our own page, which carries the per-run token.
    if request.method == "POST" and request.headers.get("X-App-Token") != TOKEN:
        abort(403)


def english_catalog() -> dict:
    """English-medium books only (prompts and PDF fonts are for English)."""
    out = {}
    for cls, subjects in CATALOG.items():
        for subj, books in subjects.items():
            eng = [b for b in books if b["medium"] == "English"]
            if eng:
                out.setdefault(cls, {})[subj] = eng
    return out


@app.get("/")
def index():
    return render_template("index.html", catalog=english_catalog(), token=TOKEN)


# ------------------------------------------------------------------ settings & login

@app.get("/api/status")
def api_status():
    s = settings.load()
    has_env_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    return jsonify(settings=settings.public(s) | {"env_key": has_env_key},
                   claude=claude_cli.status(), output_dir=str(OUT_DIR))


@app.post("/api/settings")
def api_settings():
    f = request.get_json(force=True)
    changes = {}
    if f.get("engine") in ("claude_login", "api_key"):
        changes["engine"] = f["engine"]
    if "api_key" in f:
        key = str(f["api_key"]).strip()
        if key and not key.startswith("sk-ant-"):
            return jsonify(error="That doesn't look like an Anthropic API key (it should start with sk-ant-)."), 400
        changes["api_key"] = key
    if "sections" in f:
        try:
            changes["sections"] = _sections(f["sections"])
        except ValueError as e:
            return jsonify(error=str(e)), 400
    if "split_pages" in f:
        try:
            changes["split_pages"] = max(0, min(50, int(f["split_pages"] or 0)))
        except ValueError:
            return jsonify(error="Pages per part must be a number."), 400
    return jsonify(settings=settings.public(settings.save(changes)))


@app.post("/api/claude/login")
def api_login():
    try:
        return jsonify(claude=claude_cli.start_login())
    except RuntimeError as e:
        return jsonify(error=str(e)), 400


@app.post("/api/claude/code")
def api_login_code():
    claude_cli.send_login_code(request.get_json(force=True).get("code", ""))
    return jsonify(ok=True)


@app.post("/api/claude/logout")
def api_logout():
    claude_cli.logout()
    return jsonify(claude=claude_cli.status())


@app.post("/api/quit")
def api_quit():
    shutdown_event.set()
    return jsonify(ok=True)


# ------------------------------------------------------------------ jobs

def _int(v):
    return int(v) if str(v or "").strip() else None


def _sections(value) -> list[str]:
    """Validate the ticked sections; keep the standard order."""
    if not isinstance(value, list):
        raise ValueError("Sections must be a list.")
    unknown = [v for v in value if v not in generator.ALL_OPTIONS]
    if unknown:
        raise ValueError(f"Unknown section: {unknown[0]}")
    chosen = [k for k in generator.ALL_OPTIONS if k in value]
    if not generator.claude_sections(chosen):
        raise ValueError("Tick at least one section to include in the PDF.")
    if generator.PRACTICE_TEST in chosen and not any(k in chosen for k in generator.QUESTION_SECTIONS):
        raise ValueError("The practice test is made from the questions, so tick at least one question section too.")
    return chosen


@app.post("/api/jobs")
def create_job():
    f = request.get_json(force=True)
    try:
        cls, subject, code = str(f["cls"]), f["subject"], f["book"]
        book = ncert.find_book(CATALOG, cls, subject, code)
        ch_from = _int(f.get("chapter_from")) or book["first_chapter"]
        ch_to = _int(f.get("chapter_to")) or ch_from
        p_from, p_to = _int(f.get("page_from")), _int(f.get("page_to"))
        sections = _sections(f.get("sections", settings.load()["sections"]))
    except (KeyError, ValueError) as e:
        return jsonify(error=f"Invalid request: {e}"), 400
    if not (book["first_chapter"] <= ch_from <= ch_to <= book["last_chapter"]):
        return jsonify(error=f"Chapters must be between {book['first_chapter']} and {book['last_chapter']}."), 400
    if ch_to - ch_from > 5:
        return jsonify(error="Please choose at most 6 chapters per PDF."), 400
    if p_from and p_to and p_from > p_to:
        return jsonify(error="'Pages from' must not be greater than 'Pages to'."), 400

    s = settings.save({"sections": sections})   # remembered for next time
    if s["engine"] == "claude_login":
        st = claude_cli.status()
        if not st["installed"]:
            return jsonify(error="Claude Code is not installed. Open Settings to install it, or switch to an API key."), 400
        if not st["logged_in"]:
            return jsonify(error="You are not logged in to Claude. Open Settings and click 'Log in with Claude'."), 400
    elif not (s["api_key"] or os.environ.get("ANTHROPIC_API_KEY")):
        return jsonify(error="No API key saved. Add one in Settings, or switch to Claude login."), 400

    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {"status": "queued", "log": [], "file": None, "error": None, "started": time.time()}
    params = dict(cls=cls, subject=subject, book=book, ch_from=ch_from, ch_to=ch_to, p_from=p_from,
                  p_to=p_to, engine=s["engine"], api_key=s["api_key"], split=s["split_pages"],
                  sections=sections)
    threading.Thread(target=_run_job, args=(job_id, params), daemon=True).start()
    return jsonify(id=job_id)


def _result_stem(code: str, part: ncert.ChapterPart) -> str:
    key = f"{code}-{part.number}-{part.first_page}-{part.last_page}-{generator.MODEL}"
    return f"{code}{part.number:02d}_p{part.first_page}-{part.last_page}_{hashlib.sha1(key.encode()).hexdigest()[:8]}"


def _result_path(code: str, part: ncert.ChapterPart, needed: list[str]) -> "os.PathLike":
    """Where to save Claude's result for this part and set of sections."""
    tag = hashlib.sha1(",".join(needed).encode()).hexdigest()[:6]
    return RESULTS / f"{_result_stem(code, part)}_{tag}.json"


def _saved_result(code: str, part: ncert.ChapterPart, needed: list[str]) -> dict | None:
    """A result saved earlier for this part that already has every needed section.

    Results made before sections were selectable have no tag in the name and hold the
    original five sections; they are reused whenever those are enough."""
    for path in sorted(RESULTS.glob(_result_stem(code, part) + "*.json")):
        try:
            data = json.loads(path.read_text())
        except (OSError, ValueError):
            continue
        if all(k in data for k in needed):
            return data
    return None


def _run_job(job_id: str, p: dict) -> None:
    job = JOBS[job_id]
    log = job["log"].append
    try:
        job["status"] = "running"
        book = p["book"]
        engine_name = "your Claude login" if p["engine"] == "claude_login" else "the Claude API"
        log(f"Downloading chapter {p['ch_from']}" + (f"–{p['ch_to']}" if p["ch_to"] != p["ch_from"] else "")
            + f" of '{book['title']}' from ncert.nic.in …")
        parts = ncert.load_selection(book["code"], p["ch_from"], p["ch_to"], p["p_from"], p["p_to"], log=log)
        chapters = []
        for part in parts:
            pieces = ncert.split_part(part, p["split"])
            results = []
            for i, piece in enumerate(pieces, 1):
                note = ""
                if piece.first_page != 1 or piece.last_page != piece.total_pages:
                    note = f", pages {piece.first_page}–{piece.last_page} of {piece.total_pages}"
                needed = generator.claude_sections(p["sections"])
                earlier = _saved_result(book["code"], piece, needed)
                if earlier is not None:
                    log(f"Chapter {piece.number}{note}: using the result saved earlier.")
                    results.append(earlier)
                    continue
                label = f" (part {i} of {len(pieces)})" if len(pieces) > 1 else ""
                log(f"Writing notes and questions for chapter {piece.number}{label}{note} with {engine_name}. "
                    "This takes a few minutes …")
                data = generator.generate_chapter(piece.pdf, cls=p["cls"], subject=p["subject"],
                                                  book=book["title"], chapter=piece.number, page_note=note,
                                                  engine=p["engine"], api_key=p["api_key"],
                                                  sections=needed, log=log)
                _result_path(book["code"], piece, needed).write_text(json.dumps(data, ensure_ascii=False))
                results.append(data)
            data = generator.merge_parts(results) if len(results) > 1 else results[0]
            note = ""
            if part.first_page != 1 or part.last_page != part.total_pages:
                note = f"Pages {part.first_page}–{part.last_page} of the chapter PDF"
            data.update(number=part.number, url=part.url, page_note=note)
            chapters.append(data)

        log("Building the printable PDF …")
        name = p["subject"] if book["title"].lower() == p["subject"].lower() else f"{p['subject']}_{book['title']}"
        chs = f"Ch{p['ch_from']}" + (f"-{p['ch_to']}" if p["ch_to"] != p["ch_from"] else "")
        stamp = time.strftime("%Y%m%d-%H%M%S")
        out = OUT_DIR / (re.sub(r"[^A-Za-z0-9]+", "_", f"Class{p['cls']}_{name}_{chs}") + f"_{stamp}.pdf")
        render_pdf({"cls": p["cls"], "subject": p["subject"], "book": book["title"], "code": book["code"]},
                   chapters, out, p["sections"])
        job.update(status="done", file=str(out), filename=out.name)
        log(f"Done. Saved to {out}")
    except claude_cli.UsageLimit as e:
        job.update(status="error", error=f"Your Claude usage limit was reached ({str(e)[:160]}). "
                   "Finished parts are saved: click Prepare again after the limit resets and the app will continue "
                   "where it stopped. Splitting chapters into smaller parts in Settings also helps.")
    except Exception as e:  # show every failure on the page
        traceback.print_exc()
        job.update(status="error", error=str(e) if isinstance(e, RuntimeError) else f"{type(e).__name__}: {e}")


@app.get("/api/jobs/<job_id>")
def job_status(job_id):
    job = JOBS.get(job_id) or abort(404)
    return jsonify({k: job[k] for k in ("status", "log", "error")} | {
        "elapsed": int(time.time() - job["started"]),
        "file": job["file"],
        "download": f"/api/jobs/{job_id}/pdf" if job["status"] == "done" else None})


@app.get("/api/jobs/<job_id>/pdf")
def job_pdf(job_id):
    job = JOBS.get(job_id) or abort(404)
    if job["status"] != "done":
        abort(409)
    return send_file(job["file"], mimetype="application/pdf",
                     as_attachment=request.args.get("download") == "1", download_name=job["filename"])


@app.post("/api/open-folder")
def open_folder():
    """Open the folder with the finished PDFs in the file manager."""
    import subprocess
    import sys
    if os.name == "nt":
        os.startfile(OUT_DIR)  # type: ignore[attr-defined]
    else:
        subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", str(OUT_DIR)])
    return jsonify(ok=True)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), threaded=True)
