"""A server that drops the connection mid-download (like 'Connection reset by peer'):
the downloader must retry and resume with a Range request. Also: when ncert.nic.in keeps failing, the chapter
comes from the Internet Archive and the first page of the PDF says which source was used (local fake servers
only, no network).  Run: python tests/test_download_retry.py"""
import socket
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ncert  # noqa: E402

ncert.time.sleep = lambda s: None          # no waiting in the test
BODY = b"%PDF-1.4\n" + bytes(range(256)) * 4000   # ~1 MB
calls = []


class Flaky(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        rng = self.headers.get("Range")
        start = int(rng.split("=")[1].rstrip("-")) if rng else 0
        calls.append(start)
        self.send_response(206 if start else 200)
        self.send_header("Content-Length", str(len(BODY) - start))
        if start:
            self.send_header("Content-Range", f"bytes {start}-{len(BODY) - 1}/{len(BODY)}")
        self.end_headers()
        if len(calls) <= 2:                  # first two attempts: send 300 KB, then reset
            self.wfile.write(BODY[start:start + 300_000])
            self.wfile.flush()
            self.connection.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, b"\x01\x00\x00\x00\x00\x00\x00\x00")
            self.connection.close()
            return
        self.wfile.write(BODY[start:])


srv = ThreadingHTTPServer(("127.0.0.1", 0), Flaky)
threading.Thread(target=srv.serve_forever, daemon=True).start()
dest = Path(tempfile.mkdtemp()) / "x.pdf"
logs = []
ncert._download_file(f"http://127.0.0.1:{srv.server_port}/x.pdf", dest, log=logs.append)
assert dest.read_bytes() == BODY, "file corrupted"
assert calls[0] == 0 and calls[1] > 0 and calls[2] > calls[1], f"did not resume: {calls}"
print("\n".join(logs))
print(f"OK - recovered after {len(calls) - 1} dropped connections, resuming at bytes {calls[1:]}")

# A connection that never works ends with a clear, helpful message.
srv2 = ThreadingHTTPServer(("127.0.0.1", 0), Flaky)
port = srv2.server_port
srv2.server_close()                          # nothing listening
try:
    ncert._download_file(f"http://127.0.0.1:{port}/y.pdf", dest.with_name("y.pdf"), attempts=2)
    raise AssertionError("should have failed")
except ncert.DownloadError as e:
    assert "save the file" in str(e)
    print("OK - clear message when it keeps failing:", str(e)[:110], "…")


# --- Fallback to the Internet Archive, and the source line on the PDF's first page --------------------------
import io  # noqa: E402
import json  # noqa: E402
import re  # noqa: E402
from urllib.parse import parse_qs, urlparse  # noqa: E402

from pypdf import PdfReader  # noqa: E402
from reportlab.pdfgen import canvas  # noqa: E402

import pdf_render  # noqa: E402

buf = io.BytesIO()
c = canvas.Canvas(buf)
for i in range(6):
    c.drawString(100, 700, f"Stand-in chapter page {i + 1}")
    c.showPage()
c.save()
CHAPTER = buf.getvalue()                      # a small real PDF (over 1000 bytes)
STAMP = "20260913130613"                      # a whole copy
NEWER = "20261101000000"                      # a newer capture that was cut short (like the real jesc103 one)
CUT = CHAPTER[:len(CHAPTER) // 2]
try:
    PdfReader(io.BytesIO(CUT)).pages[0]
    raise AssertionError("the cut-short stand-in must not open as a PDF")
except AssertionError:
    raise
except Exception:
    pass
mode = {"ncert": "502", "archive": "ok"}      # what the fake servers do; changed per case
hits = []


class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body=b"", ctype="application/pdf"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        hits.append(u.path)
        if u.path.startswith("/textbook/pdf/"):                       # the fake ncert.nic.in
            if mode["ncert"] == "ok":
                return self._send(200, CHAPTER)
            return self._send(int(mode["ncert"]), b"nope", "text/plain")
        if u.path == "/cdx":                                          # the list of snapshots (oldest first)
            if mode["archive"] == "cdx_down":
                return self._send(500, b"down", "text/plain")
            stamps = {"none": [], "newest_bad": [STAMP, NEWER], "all_bad": [STAMP, NEWER]}.get(mode["archive"], [STAMP])
            rows = [["timestamp"]] + [[st] for st in stamps]
            return self._send(200, json.dumps(rows).encode(), "application/json")
        if u.path == "/wayback/available":                            # the single closest snapshot (last resort)
            snap = {"closest": {"status": "200", "available": True, "timestamp": STAMP}} \
                if mode["archive"] not in ("none",) else {}
            return self._send(200, json.dumps({"archived_snapshots": snap}).encode(), "application/json")
        if u.path.startswith(f"/web/{NEWER}id_/"):
            return self._send(200, CUT)
        if u.path.startswith(f"/web/{STAMP}id_/"):                    # the copy as the archive saved it
            return self._send(200, b"<html>not a pdf</html>" if mode["archive"] in ("bad", "all_bad") else CHAPTER)
        self._send(404, b"?", "text/plain")


fake = ThreadingHTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=fake.serve_forever, daemon=True).start()
ROOT = f"http://127.0.0.1:{fake.server_port}"
ncert.BASE, ncert.ARCHIVE_API, ncert.ARCHIVE_RAW = ROOT, f"{ROOT}/wayback/available", f"{ROOT}/web"
ncert.ARCHIVE_CDX = f"{ROOT}/cdx"
ncert.CACHE_DIR = Path(tempfile.mkdtemp())


def fresh():
    for f in ncert.CACHE_DIR.glob("*"):
        f.unlink()
    hits.clear()


# 1. NCERT works: used, recorded as ncert, the archive is not asked.
fresh(); mode.update(ncert="ok", archive="ok")
logs = []
assert ncert.download_chapter_pdf("tst1", 1, log=logs.append) == CHAPTER
src = ncert.chapter_source("tst1", 1)
assert src.kind == "ncert" and src.url.endswith("/textbook/pdf/tst101.pdf"), src
assert not any(h.startswith("/wayback") or h.startswith("/web/") for h in hits), hits
print("OK - ncert.nic.in works: used, archive not asked")

# 2. NCERT keeps failing (502): the Internet Archive's copy is used and recorded with its date.
fresh(); mode.update(ncert="502", archive="ok")
logs = []
assert ncert.download_chapter_pdf("tst1", 1, log=logs.append) == CHAPTER
src = ncert.chapter_source("tst1", 1)
assert (src.kind, src.date) == ("archive", "2026-09-13"), src
assert any("Internet Archive" in x and "2026-09-13" in x for x in logs), logs
assert not list(ncert.CACHE_DIR.glob("*.part")), "leftover .part file"
# a later run uses the saved copy and still knows where it came from
hits.clear()
assert ncert.download_chapter_pdf("tst1", 1) == CHAPTER and not hits
parts = ncert.load_selection("tst1", 1, 1)
assert parts[0].source.kind == "archive" and ncert.split_part(parts[0], 3)[1].source.kind == "archive"
print("OK - ncert 502: Internet Archive copy used, source and date kept with the saved file")

# 3. NCERT says 404: the file does not exist, so no fallback.
fresh(); mode.update(ncert="404", archive="ok")
try:
    ncert.download_chapter_pdf("tst1", 1)
    raise AssertionError("should have failed")
except ncert.DownloadError as e:
    assert "no file" in str(e), e
assert not any(h.startswith("/wayback") for h in hits), hits
print("OK - ncert 404: no fallback")

# 4. NCERT down and the archive has nothing (or not a PDF): one clear error naming both, nothing left behind.
for arch in ("none", "bad"):
    fresh(); mode.update(ncert="502", archive=arch)
    try:
        ncert.download_chapter_pdf("tst1", 1)
        raise AssertionError("should have failed")
    except ncert.DownloadError as e:
        assert "save the file" in str(e) and "Internet Archive" in str(e), e
    assert not list(ncert.CACHE_DIR.glob("tst1*")), list(ncert.CACHE_DIR.glob("*"))
print("OK - both sources fail: one clear message, no leftover files")

# 5. Half a file from NCERT must not end up glued to the archive's file.
fresh(); mode.update(ncert="502", archive="ok")
(ncert.CACHE_DIR / "tst101.pdf.part").write_bytes(b"%PDF-1.4 half of another file")
assert ncert.download_chapter_pdf("tst1", 1) == CHAPTER
print("OK - a leftover partial file is discarded before the archive download")


# 5b. The newest archive copy is cut short: it is skipped and the next older whole copy is used (the real
# jesc103 case, 2026-11-20). The date recorded is the one actually used.
fresh(); mode.update(ncert="502", archive="newest_bad")
logs = []
assert ncert.download_chapter_pdf("tst1", 1, log=logs.append) == CHAPTER
src = ncert.chapter_source("tst1", 1)
assert (src.kind, src.date) == ("archive", "2026-09-13"), src
assert f"/web/{NEWER}id_/" in "".join(h + "/" for h in hits) or any(NEWER in h for h in hits), hits
assert any("damaged or incomplete" in x and "2026-11-01" in x for x in logs), logs
assert any("saved on 2026-09-13" in x for x in logs), logs
assert not list(ncert.CACHE_DIR.glob("*.part")), "leftover .part file"
print("OK - newest archive copy cut short: skipped, the next whole copy used, its date recorded")

# 5c. The snapshot list is unavailable: the single closest copy is still tried.
fresh(); mode.update(ncert="502", archive="cdx_down")
assert ncert.download_chapter_pdf("tst1", 1) == CHAPTER
assert ncert.chapter_source("tst1", 1).date == "2026-09-13"
print("OK - snapshot list down: falls back to the closest copy")

# 5d. Every archive copy is damaged: one clear error, nothing left behind.
fresh(); mode.update(ncert="502", archive="all_bad")
try:
    ncert.download_chapter_pdf("tst1", 1)
    raise AssertionError("should have failed")
except ncert.DownloadError as e:
    assert "save the file" in str(e) and "was not usable" in str(e), e
assert not list(ncert.CACHE_DIR.glob("tst1*")), list(ncert.CACHE_DIR.glob("*"))
print("OK - every archive copy damaged: one clear message, no leftover files")

# 5e. The choice in Settings: Internet Archive only / NCERT only / replacing a copy from the other source.
def asked(prefix):
    return any(h.startswith(prefix) for h in hits)


fresh(); mode.update(ncert="ok", archive="ok")
logs = []
assert ncert.download_chapter_pdf("tst1", 1, log=logs.append, source="archive") == CHAPTER
assert ncert.chapter_source("tst1", 1).kind == "archive" and not asked("/textbook/"), hits
hits.clear(); logs.clear()                       # a saved archive copy + "NCERT only": fetched from NCERT instead
assert ncert.download_chapter_pdf("tst1", 1, log=logs.append, source="ncert") == CHAPTER
assert ncert.chapter_source("tst1", 1).kind == "ncert" and asked("/textbook/"), hits
assert any("as chosen in Settings" in x for x in logs), logs
hits.clear()                                     # a saved NCERT copy: kept for Automatic and for NCERT only
assert ncert.download_chapter_pdf("tst1", 1) == CHAPTER and ncert.download_chapter_pdf("tst1", 1, source="ncert") == CHAPTER
assert not hits, hits
assert ncert.download_chapter_pdf("tst1", 1, source="archive") == CHAPTER      # ...but replaced for "archive only"
assert ncert.chapter_source("tst1", 1).kind == "archive" and not asked("/textbook/"), hits
parts = ncert.load_selection("tst1", 1, 1, source="archive")
assert parts[0].source.kind == "archive"
# a copy of unknown origin (saved by hand) is kept whatever is chosen
fresh()
(ncert.CACHE_DIR / "tst101.pdf").write_bytes(CHAPTER)
for choice in ncert.SOURCES:
    assert ncert.download_chapter_pdf("tst1", 1, source=choice) == CHAPTER
assert not hits, hits
try:
    ncert.download_chapter_pdf("tst1", 1, source="elsewhere")
    raise AssertionError("an unknown choice must be refused")
except ValueError:
    pass
print("OK - source choice: archive only, NCERT only, copies from the other source replaced, unknown origin kept")

# 5f. NCERT only never asks the archive; archive only never asks NCERT; a failed switch keeps the saved copy intact.
fresh(); mode.update(ncert="502", archive="ok")
try:
    ncert.download_chapter_pdf("tst1", 1, source="ncert")
    raise AssertionError("should have failed")
except ncert.DownloadError as e:
    assert "save the file" in str(e), e
assert not (asked("/cdx") or asked("/wayback") or asked("/web/")), hits
fresh(); mode.update(ncert="ok", archive="ok")
assert ncert.download_chapter_pdf("tst1", 1) == CHAPTER and ncert.chapter_source("tst1", 1).kind == "ncert"
mode.update(archive="all_bad"); hits.clear()
try:
    ncert.download_chapter_pdf("tst1", 1, source="archive")
    raise AssertionError("should have failed")
except ncert.DownloadError as e:
    assert "Automatic" in str(e) and "save the file" in str(e), e
assert not asked("/textbook/"), hits
assert (ncert.CACHE_DIR / "tst101.pdf").read_bytes() == CHAPTER and ncert.chapter_source("tst1", 1).kind == "ncert"
assert not list(ncert.CACHE_DIR.glob("*.archive*")) and not list(ncert.CACHE_DIR.glob("*.part")), list(ncert.CACHE_DIR.glob("*"))
print("OK - NCERT only / archive only keep to their source; a failed switch leaves the saved chapter intact")

# 6. First page of the PDF names the source of each chapter.
def cover_text(sources):
    base = json.loads((Path(__file__).resolve().parents[1] / "samples" / "class10_science_ch1.json").read_text())
    chapters = [dict(base, number=n, url="u", page_note="", **({"source": s} if s is not None else {}))
                for n, s in sources]
    out = Path(tempfile.mkdtemp()) / "cover.pdf"
    pdf_render.render_pdf({"cls": 10, "subject": "Science", "book": "Science", "code": "jesc1"}, chapters, out,
                          ["summary"])
    return re.sub(r"\s+", " ", PdfReader(str(out)).pages[0].extract_text())


t = cover_text([(1, {"kind": "ncert", "date": "", "url": "x"})])
assert "downloaded from ncert.nic.in" in t and "Internet Archive" not in t, t
t = cover_text([(1, {"kind": "archive", "date": "2026-09-13", "url": "x"})])
assert "saved by the Internet Archive" in t and "13 September 2026" in t and "did not respond" in t, t
assert "downloaded from ncert.nic.in" not in t, t
t = cover_text([(1, {"kind": "ncert"}), (2, {"kind": "archive", "date": "2026-09-13"})])
assert "Chapter 1: the official NCERT textbook, downloaded from ncert.nic.in" in t, t
assert "Chapter 2: a copy of the NCERT textbook saved by the Internet Archive" in t, t
t = cover_text([(1, {"kind": "unknown", "date": "", "url": ""})])
assert "already saved on this computer" in t, t
t = cover_text([(1, None)])
assert "Based on the official NCERT textbook (ncert.nic.in)." in t, t
print("OK - first page names ncert.nic.in, the Internet Archive (with date), a mix, or an unrecorded copy")
