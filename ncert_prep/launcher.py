"""Start NCERT Exam Prep as a desktop app.

Starts the local server on this computer only (127.0.0.1) and opens it in an app-style
browser window (Chrome / Chromium / Edge in --app mode, or the default browser).
If the same version is already running, it just opens another window. If an older
version is still running (for example after an update), it stops that copy first, unless
it is busy preparing a PDF, so the new version starts.
"""
from __future__ import annotations

import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
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


def running_instance() -> dict | None:
    """The copy recorded in running.json, if it still answers: url, version, busy, token, pid."""
    try:
        state = json.loads(STATE.read_text())
        url = state["url"]
        with urllib.request.urlopen(url + "api/status", timeout=2) as r:
            if r.status != 200:
                return None
            status = json.loads(r.read() or b"{}")
    except (OSError, ValueError, KeyError):
        return None
    return {"url": url, "version": status.get("version"), "busy": bool(status.get("busy")),
            "token": state.get("token"), "pid": state.get("pid")}


def _answers(url: str) -> bool:
    try:
        with urllib.request.urlopen(url + "api/status", timeout=1):
            return True
    except OSError:
        return False


def _is_our_launcher(pid: int) -> bool:
    """Guard before ending a process by number: it must be this app's launcher."""
    try:
        cmd = Path(f"/proc/{pid}/cmdline").read_bytes().replace(b"\0", b" ").decode(errors="replace")
        return "launcher.py" in cmd
    except OSError:
        return os.name == "nt"     # no /proc on Windows; the copy answered at its recorded address


def stop_instance(inst: dict, wait: float = 15) -> bool:
    """Ask an older copy to quit (or end its process if it is too old to be asked)."""
    try:
        if inst.get("token"):
            req = urllib.request.Request(inst["url"] + "api/quit", data=b"{}", method="POST",
                                         headers={"X-App-Token": inst["token"], "Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=5).read()
        elif inst.get("pid") and _is_our_launcher(int(inst["pid"])):
            os.kill(int(inst["pid"]), signal.SIGTERM)
        else:
            return False
    except OSError:
        pass
    end = time.time() + wait
    while time.time() < end:
        if not _answers(inst["url"]):
            return True
        time.sleep(0.3)
    return False


def open_window(url: str) -> None:
    """Prefer a chromeless app window; fall back to the default browser."""
    if os.environ.get("NCERT_NO_BROWSER"):
        return
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
    inst = running_instance()
    if inst:
        if inst["version"] == settings.code_version():
            open_window(inst["url"])
            return
        if inst["busy"]:
            print("An older copy of NCERT Exam Prep is still preparing a PDF, so it was left running. "
                  "Start the app again after it finishes (or press Quit app) to use the updated version.",
                  flush=True)
            open_window(inst["url"])
            return
        print("An older copy of NCERT Exam Prep is running; stopping it to start the updated version …", flush=True)
        if not stop_instance(inst):
            print("Could not stop the older copy; opening it instead. Use Quit app in Settings, then start "
                  "the app again.", flush=True)
            open_window(inst["url"])
            return

    from werkzeug.serving import make_server
    import app as webapp

    port = int(os.environ.get("PORT") or free_port())
    url = f"http://127.0.0.1:{port}/"
    server = make_server("127.0.0.1", port, webapp.app, threaded=True)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    # The token lets a newer launcher ask this copy to quit; the file is readable only by this user.
    STATE.unlink(missing_ok=True)
    fd = os.open(STATE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump({"url": url, "pid": os.getpid(), "token": webapp.TOKEN, "version": webapp.VERSION}, f)
    if hasattr(signal, "SIGTERM"):   # ending this process (e.g. by a newer launcher) shuts down cleanly
        signal.signal(signal.SIGTERM, lambda *_: webapp.shutdown_event.set())
    print(f"NCERT Exam Prep is running at {url}  (close with the Quit button or Ctrl+C)")
    for line in webapp.describe_ai():
        print(line, flush=True)
    print("Each job prints here what the AI writes and what the app does itself.", flush=True)
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
            if json.loads(STATE.read_text()).get("pid") == os.getpid():   # a newer copy may own it now
                STATE.unlink()
        except (OSError, ValueError):
            pass


if __name__ == "__main__":
    main()
