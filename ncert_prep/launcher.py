"""Start NCERT Exam Prep as a desktop app.

Starts the local server on this computer only (127.0.0.1) and opens it in an app-style
browser window (Chrome / Chromium / Edge in --app mode, or the default browser).
If the app is already running, it just opens another window.
"""
from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import urllib.request
import webbrowser
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
os.chdir(HERE)

import settings  # noqa: E402

STATE = settings.data_dir() / "running.json"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def already_running() -> str | None:
    try:
        url = json.loads(STATE.read_text())["url"]
        with urllib.request.urlopen(url + "api/status", timeout=2) as r:
            if r.status == 200:
                return url
    except (OSError, ValueError, KeyError):
        pass
    return None


def open_window(url: str) -> None:
    """Prefer a chromeless app window; fall back to the default browser."""
    candidates = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge",
                  "brave-browser"]
    if os.name == "nt":
        pf = [os.environ.get(v, "") for v in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")]
        candidates = [str(Path(p, rel)) for p in pf if p for rel in (
            r"Microsoft\Edge\Application\msedge.exe", r"Google\Chrome\Application\chrome.exe")] + candidates
    for exe in candidates:
        path = exe if os.path.isfile(exe) else shutil.which(exe)
        if path:
            try:
                subprocess.Popen([path, f"--app={url}", "--window-size=1000,900"],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return
            except OSError:
                continue
    webbrowser.open(url)


def main() -> None:
    url = already_running()
    if url:
        open_window(url)
        return

    from werkzeug.serving import make_server
    import app as webapp

    port = int(os.environ.get("PORT") or free_port())
    url = f"http://127.0.0.1:{port}/"
    server = make_server("127.0.0.1", port, webapp.app, threaded=True)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    STATE.write_text(json.dumps({"url": url, "pid": os.getpid()}))
    print(f"NCERT Exam Prep is running at {url}  (close with the Quit button or Ctrl+C)")
    if not os.environ.get("NCERT_NO_BROWSER"):
        open_window(url)
    try:
        while not webapp.shutdown_event.wait(1):
            pass
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        try:
            STATE.unlink()
        except OSError:
            pass


if __name__ == "__main__":
    main()
