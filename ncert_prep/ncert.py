"""Access to the official NCERT textbook site (https://ncert.nic.in/textbook.php).

* Builds the class -> subject -> book catalogue from NCERT's own textbook page.
* Downloads chapter PDFs (cached on disk) and cuts out page ranges.

ncert.nic.in only sends its leaf certificate and omits the Let's Encrypt
intermediate, so ordinary TLS verification fails outside browsers. Instead of
disabling verification we ship the public Let's Encrypt intermediates in
``certs/`` and append them to the normal CA bundle.
"""
from __future__ import annotations

import io
import json
import os
import re
import ssl
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

import certifi
import requests
from pypdf import PdfReader, PdfWriter

BASE = "https://ncert.nic.in"
# Fallback when ncert.nic.in does not answer: the Internet Archive's saved copy of the same NCERT file.
ARCHIVE_API = "https://archive.org/wayback/available"          # the single "closest" snapshot (last resort)
ARCHIVE_CDX = "https://web.archive.org/cdx/search/cdx"        # the list of snapshots, newest tried first
ARCHIVE_TRIES = 8                                              # how many snapshots to try before giving up
ARCHIVE_RAW = "https://web.archive.org/web"      # .../<timestamp>id_/<url> = the file exactly as saved
HERE = Path(__file__).resolve().parent
CATALOG_FILE = HERE / "catalog.json"
CACHE_DIR = Path(os.environ.get("NCERT_CACHE_DIR", HERE / "cache"))
UA = {"User-Agent": "Mozilla/5.0 (NCERT exam-prep helper)"}

_bundle_path: str | None = None


def ca_bundle() -> str:
    """CA bundle = system/certifi roots (+ proxy CA if configured) + LE intermediates."""
    global _bundle_path
    if _bundle_path and os.path.exists(_bundle_path):
        return _bundle_path
    parts = []
    for p in {os.environ.get("REQUESTS_CA_BUNDLE"), os.environ.get("SSL_CERT_FILE"),
              certifi.where(), ssl.get_default_verify_paths().cafile}:
        if p and os.path.isfile(p):
            parts.append(Path(p).read_text())
    for pem in sorted((HERE / "certs").glob("*.pem")):
        parts.append(pem.read_text())
    fd, path = tempfile.mkstemp(prefix="ncert-ca-", suffix=".pem")
    with os.fdopen(fd, "w") as f:
        f.write("\n".join(parts))
    _bundle_path = path
    return path


def _get(url: str, timeout: int = 60) -> requests.Response:
    r = requests.get(url, headers=UA, timeout=timeout, verify=ca_bundle())
    r.raise_for_status()
    return r


# --------------------------------------------------------------------------- catalogue

_BLOCK_RE = re.compile(
    r'tclass\.value==(\d+)\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text=="([^"]+)"\)\)'
    r"(.*?)(?=else if\s*\(\(document\.test\.tclass|\n\s*\}\s*\n\s*\}|\Z)",
    re.S,
)
_OPT_TEXT_RE = re.compile(r'^\s*document\.test\.tbook\.options\[(\d+)\]\.text="([^"]*)"', re.M)
_OPT_VAL_RE = re.compile(r'^\s*document\.test\.tbook\.options\[(\d+)\]\.value="textbook\.php\?([a-z]+\d)=(\d+)-(\d+)"', re.M)


def parse_catalog(html: str) -> dict:
    """Parse NCERT textbook.php JavaScript into {class: {subject: [book, ...]}}."""
    catalog: dict[str, dict[str, list]] = {}
    for m in _BLOCK_RE.finditer(html):
        cls, subject, body = m.group(1), m.group(2).strip(), m.group(3)
        titles = {int(i): t.strip() for i, t in _OPT_TEXT_RE.findall(body)}
        books = []
        for idx, code, start, end in _OPT_VAL_RE.findall(body):
            title = titles.get(int(idx), code)
            if not title or title.lower().startswith("coming soon"):
                continue
            books.append({
                "code": code,
                "title": title,
                "first_chapter": max(1, int(start)),
                "last_chapter": int(end),
                # 2nd letter of the code is the medium: e=English, h=Hindi, u=Urdu
                "medium": {"e": "English", "h": "Hindi", "u": "Urdu"}.get(code[1], "Other"),
            })
        if books:
            cls = "11-12" if cls == "13" else cls  # NCERT lists combined 11-12 books as 13
            catalog.setdefault(cls, {}).setdefault(subject, [])
            known = {b["code"] for b in catalog[cls][subject]}
            catalog[cls][subject] += [b for b in books if b["code"] not in known]
    return dict(sorted(catalog.items(), key=lambda kv: float(kv[0].replace("11-12", "12.5"))))


def refresh_catalog() -> dict:
    catalog = parse_catalog(_get(f"{BASE}/textbook.php").text)
    CATALOG_FILE.write_text(json.dumps(catalog, indent=1, ensure_ascii=False))
    return catalog


def load_catalog() -> dict:
    if CATALOG_FILE.exists():
        return json.loads(CATALOG_FILE.read_text())
    return refresh_catalog()


def find_book(catalog: dict, cls: str, subject: str, code: str) -> dict:
    for b in catalog.get(str(cls), {}).get(subject, []):
        if b["code"] == code:
            return b
    raise KeyError(f"Book {code!r} not found for class {cls} / {subject}")


# --------------------------------------------------------------------------- chapters

@dataclass
class Source:
    """Where a chapter PDF came from; printed on the first page of the generated PDF."""
    kind: str = "unknown"    # "ncert" (ncert.nic.in), "archive" (Internet Archive copy), "unknown" (saved by hand/earlier)
    date: str = ""           # archive: the day the Internet Archive saved the copy (YYYY-MM-DD)
    url: str = ""            # the address the file was downloaded from


@dataclass
class ChapterPart:
    number: int          # chapter number in the book
    url: str             # official NCERT PDF URL
    pdf: bytes           # PDF (possibly cut down to the requested pages)
    first_page: int      # 1-based page numbers inside the chapter PDF that were kept
    last_page: int
    total_pages: int
    source: Source = field(default_factory=Source)


def chapter_url(code: str, number: int) -> str:
    return f"{BASE}/textbook/pdf/{code}{number:02d}.pdf"


class DownloadError(RuntimeError):
    not_found = False        # True when the server said 404: the file does not exist there


def _download_file(url: str, dest: Path, attempts: int = 5, log=None, host: str = "ncert.nic.in") -> None:
    """Download with retries; a dropped connection resumes from where it stopped."""
    part = dest.with_name(dest.name + ".part")
    last_err = None
    for attempt in range(1, attempts + 1):
        have = part.stat().st_size if part.exists() else 0
        headers = dict(UA)
        if have:
            headers["Range"] = f"bytes={have}-"
        try:
            with requests.get(url, headers=headers, stream=True, timeout=(20, 60), verify=ca_bundle()) as r:
                if r.status_code == 416:          # already complete
                    break
                r.raise_for_status()
                mode = "ab" if (have and r.status_code == 206) else "wb"
                with open(part, mode) as f:
                    for chunk in r.iter_content(64 * 1024):
                        f.write(chunk)
            break
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 404:
                err = DownloadError(f"{host} has no file at {url}.")
                err.not_found = True
                raise err from e
            last_err = e
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout,
                requests.exceptions.ChunkedEncodingError) as e:
            last_err = e
        if attempt < attempts:
            if log:
                log(f"Connection to {host} dropped; retrying ({attempt + 1}/{attempts}) …")
            time.sleep(min(2 ** attempt, 20))
    else:
        raise DownloadError(
            f"Could not download {url} - the connection to {host} kept dropping ({last_err}). "
            f"Check your internet connection and try again, or open that link in your browser, save the file "
            f"as {dest.name} in {dest.parent}, and click Prepare again.")
    with open(part, "rb") as f:
        if f.read(5) != b"%PDF-":
            part.unlink()
            raise DownloadError(f"{host} did not return a PDF for {url}. Try again later.")
    part.replace(dest)


def _source_file(path: Path) -> Path:
    return path.with_name(path.name + ".source.json")


def chapter_source(code: str, number: int) -> Source:
    """Where the saved copy of this chapter came from (unknown if it was saved by hand or by an older version)."""
    try:
        d = json.loads(_source_file(CACHE_DIR / f"{code}{number:02d}.pdf").read_text())
        return Source(str(d.get("kind", "unknown")), str(d.get("date", "")), str(d.get("url", "")))
    except (OSError, ValueError):
        return Source()


def _snapshot(stamp: str, url: str) -> tuple[str, str]:
    return f"{ARCHIVE_RAW}/{stamp}id_/{url}", f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}"


def archive_copies(url: str, limit: int = ARCHIVE_TRIES) -> list[tuple[str, str]]:
    """The Internet Archive's saved copies of `url`, newest first: [(address of the file as saved, YYYY-MM-DD)].

    Only captures the Archive marked 200 and whose content differs from the previous one. Some captures are
    cut short, so the caller tries them one by one until one is a whole PDF."""
    stamps: list[str] = []
    try:
        r = requests.get(ARCHIVE_CDX, params={"url": url, "output": "json", "fl": "timestamp",
                                              "filter": "statuscode:200", "collapse": "digest", "limit": -limit},
                         headers=UA, timeout=30, verify=ca_bundle())
        r.raise_for_status()
        stamps = [row[0] for row in r.json()[1:] if row and re.fullmatch(r"\d{14}", str(row[0]))]
    except (requests.RequestException, ValueError, IndexError):
        pass                                       # the list is unavailable: fall back to the single closest copy
    if not stamps:
        r = requests.get(ARCHIVE_API, params={"url": url}, headers=UA, timeout=30, verify=ca_bundle())
        r.raise_for_status()
        snap = (r.json().get("archived_snapshots") or {}).get("closest") or {}
        stamp = str(snap.get("timestamp") or "")
        if snap.get("available") and str(snap.get("status")) == "200" and re.fullmatch(r"\d{14}", stamp):
            stamps = [stamp]
    return [_snapshot(st, url) for st in sorted(set(stamps), reverse=True)]


def _whole_pdf(path: Path) -> None:
    """Raise unless `path` opens as a complete PDF (a cut-short capture fails here)."""
    reader = PdfReader(str(path))
    if not reader.pages:
        raise ValueError("it has no pages")
    reader.pages[len(reader.pages) - 1].mediabox          # reaching the last page object needs the whole file


def _from_archive(url: str, path: Path, log, why: DownloadError | None) -> Source:
    """Fetch the newest whole copy saved by the Internet Archive into `path`.

    `why` is the NCERT failure that led here (None: the user chose the Internet Archive in Settings).
    Copies are tried newest first; a damaged one is skipped. Each is downloaded to a side file and moved into
    place only when it is a whole PDF, so an existing saved chapter is never damaged by a failed attempt.
    Raises with the reasons if none works."""
    if why is not None:
        path.with_name(path.name + ".part").unlink(missing_ok=True)   # NCERT's half file must not be resumed later
    if log:
        log("ncert.nic.in did not give the chapter; looking for the copy saved by the Internet Archive …"
            if why is not None else "Looking for the chapter among the copies saved by the Internet Archive …")
    problems: list[str] = []
    try:
        copies = archive_copies(url)
    except Exception as e:                        # network or JSON trouble
        copies = []
        problems.append(str(e))
    if not copies and not problems:
        problems.append("the Internet Archive has no saved copy of it")
    side = path.with_name(path.name + ".archive")
    for archive_url, day in copies:
        for stale in (side, side.with_name(side.name + ".part")):
            stale.unlink(missing_ok=True)
        try:
            _download_file(archive_url, side, attempts=3, log=log, host="web.archive.org")
            _whole_pdf(side)
        except Exception as e:                    # not found, dropped connection, cut-short or damaged file
            for stale in (side, side.with_name(side.name + ".part")):
                stale.unlink(missing_ok=True)
            problems.append(f"the copy from {day} was not usable ({type(e).__name__}: {e})")
            if log:
                log(f"The Internet Archive's copy from {day} is damaged or incomplete; trying an older one …")
            continue
        side.replace(path)
        if log:
            log(f"Using the Internet Archive's copy of the chapter, saved on {day}. It may differ from NCERT's "
                "current file; the first page of the PDF says so.")
        return Source("archive", day, archive_url)
    if why is None:
        raise DownloadError(f"Could not get {url} from the Internet Archive ({'; '.join(problems[-3:])}). Choose "
                            f"'Automatic' or 'NCERT only' under Settings, or open that link in your browser, save "
                            f"the file as {path.name} in {path.parent}, and click Prepare again.")
    raise DownloadError(f"{why} Also tried the Internet Archive's copies: " + "; ".join(problems[-3:]))


SOURCES = ("auto", "ncert", "archive")      # Settings: NCERT first then the archive / NCERT only / archive only
_SOURCE_NAMES = {"ncert": "ncert.nic.in", "archive": "the Internet Archive"}


def download_chapter_pdf(code: str, number: int, log=None, source: str = "auto") -> bytes:
    """The chapter PDF, from the saved copy if there is one, else downloaded.

    source: "auto" = ncert.nic.in, and the Internet Archive's copy if that fails (not on a 404);
    "ncert" = ncert.nic.in only; "archive" = the Internet Archive only. A saved copy that is known to come from
    the other source is replaced; one of unknown origin (saved by hand, or by an older version) is kept."""
    if source not in SOURCES:
        raise ValueError(f"Unknown chapter source {source!r}")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{code}{number:02d}.pdf"
    if path.exists() and path.stat().st_size > 1000:
        try:
            PdfReader(str(path))
        except Exception:
            path.unlink()                         # damaged copy: download again
            _source_file(path).unlink(missing_ok=True)
        else:
            have = chapter_source(code, number).kind
            if source == "auto" or have in ("unknown", source):
                return path.read_bytes()
            if log:
                log(f"The saved copy came from {_SOURCE_NAMES.get(have, have)}; getting the chapter from "
                    f"{_SOURCE_NAMES[source]} as chosen in Settings …")
    url = chapter_url(code, number)
    if source == "archive":
        got = _from_archive(url, path, log, None)
    else:
        try:
            _download_file(url, path, log=log)
            got = Source("ncert", url=url)
        except DownloadError as e:
            if e.not_found or source == "ncert":  # no such file at NCERT, or the user wants NCERT only
                raise
            got = _from_archive(url, path, log, e)
    _source_file(path).write_text(json.dumps({"kind": got.kind, "date": got.date, "url": got.url}))
    return path.read_bytes()


def _slice_pdf(data: bytes, lo: int, hi: int) -> bytes:
    """Return pages lo..hi (0-based, inclusive) as a new PDF."""
    reader = PdfReader(io.BytesIO(data))
    writer = PdfWriter()
    for i in range(lo, hi + 1):
        writer.add_page(reader.pages[i])
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def split_part(part: ChapterPart, max_pages: int) -> list[ChapterPart]:
    """Split a chapter into pieces of at most max_pages pages (0 = no split)."""
    count = part.last_page - part.first_page + 1
    if not max_pages or count <= max_pages:
        return [part]
    pieces = []
    for start in range(0, count, max_pages):
        end = min(start + max_pages, count) - 1
        pieces.append(ChapterPart(part.number, part.url, _slice_pdf(part.pdf, start, end),
                                  part.first_page + start, part.first_page + end, part.total_pages, part.source))
    return pieces


def load_selection(code: str, first: int, last: int, page_from: int | None = None,
                   page_to: int | None = None, log=None, source: str = "auto") -> list[ChapterPart]:
    """Download chapters first..last of a book.

    page_from/page_to (1-based, inclusive, optional) pick pages counted across the
    selected chapters taken together - e.g. chapters 1-2 with pages 5-20.
    """
    parts: list[ChapterPart] = []
    offset = 0  # pages seen in earlier chapters
    lo = (page_from or 1) - 1
    hi = (page_to or 10**9) - 1
    for n in range(first, last + 1):
        data = download_chapter_pdf(code, n, log=log, source=source)
        total = len(PdfReader(io.BytesIO(data)).pages)
        a, b = max(lo - offset, 0), min(hi - offset, total - 1)
        offset += total
        if a > b:
            continue
        pdf = data if (a == 0 and b == total - 1) else _slice_pdf(data, a, b)
        parts.append(ChapterPart(n, chapter_url(code, n), pdf, a + 1, b + 1, total, chapter_source(code, n)))
    if not parts:
        raise ValueError("The page range does not overlap the selected chapters.")
    return parts


if __name__ == "__main__":  # python ncert.py  -> refresh catalog.json from ncert.nic.in
    cat = refresh_catalog()
    print(f"Saved {CATALOG_FILE}: {sum(len(s) for s in cat.values())} subjects across classes {', '.join(cat)}")
