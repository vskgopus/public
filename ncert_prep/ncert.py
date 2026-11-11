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
from dataclasses import dataclass
from pathlib import Path

import certifi
import requests
from pypdf import PdfReader, PdfWriter

BASE = "https://ncert.nic.in"
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
class ChapterPart:
    number: int          # chapter number in the book
    url: str             # official NCERT PDF URL
    pdf: bytes           # PDF (possibly cut down to the requested pages)
    first_page: int      # 1-based page numbers inside the chapter PDF that were kept
    last_page: int
    total_pages: int


def chapter_url(code: str, number: int) -> str:
    return f"{BASE}/textbook/pdf/{code}{number:02d}.pdf"


class DownloadError(RuntimeError):
    pass


def _download_file(url: str, dest: Path, attempts: int = 5, log=None) -> None:
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
                raise DownloadError(f"NCERT has no file at {url}.") from e
            last_err = e
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout,
                requests.exceptions.ChunkedEncodingError) as e:
            last_err = e
        if attempt < attempts:
            if log:
                log(f"Connection to ncert.nic.in dropped; retrying ({attempt + 1}/{attempts}) …")
            time.sleep(min(2 ** attempt, 20))
    else:
        raise DownloadError(
            f"Could not download {url} - the connection to ncert.nic.in kept dropping ({last_err}). "
            f"Check your internet connection and try again, or open that link in your browser, save the file "
            f"as {dest.name} in {dest.parent}, and click Prepare again.")
    with open(part, "rb") as f:
        if f.read(5) != b"%PDF-":
            part.unlink()
            raise DownloadError(f"NCERT did not return a PDF for {url}. Try again later.")
    part.replace(dest)


def download_chapter_pdf(code: str, number: int, log=None) -> bytes:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{code}{number:02d}.pdf"
    if path.exists() and path.stat().st_size > 1000:
        try:
            PdfReader(str(path))
            return path.read_bytes()
        except Exception:
            path.unlink()                         # damaged copy: download again
    _download_file(chapter_url(code, number), path, log=log)
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
                                  part.first_page + start, part.first_page + end, part.total_pages))
    return pieces


def load_selection(code: str, first: int, last: int, page_from: int | None = None,
                   page_to: int | None = None, log=None) -> list[ChapterPart]:
    """Download chapters first..last of a book.

    page_from/page_to (1-based, inclusive, optional) pick pages counted across the
    selected chapters taken together - e.g. chapters 1-2 with pages 5-20.
    """
    parts: list[ChapterPart] = []
    offset = 0  # pages seen in earlier chapters
    lo = (page_from or 1) - 1
    hi = (page_to or 10**9) - 1
    for n in range(first, last + 1):
        data = download_chapter_pdf(code, n, log=log)
        total = len(PdfReader(io.BytesIO(data)).pages)
        a, b = max(lo - offset, 0), min(hi - offset, total - 1)
        offset += total
        if a > b:
            continue
        pdf = data if (a == 0 and b == total - 1) else _slice_pdf(data, a, b)
        parts.append(ChapterPart(n, chapter_url(code, n), pdf, a + 1, b + 1, total))
    if not parts:
        raise ValueError("The page range does not overlap the selected chapters.")
    return parts


if __name__ == "__main__":  # python ncert.py  -> refresh catalog.json from ncert.nic.in
    cat = refresh_catalog()
    print(f"Saved {CATALOG_FILE}: {sum(len(s) for s in cat.values())} subjects across classes {', '.join(cat)}")
